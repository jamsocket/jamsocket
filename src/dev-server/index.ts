import path from 'path'
import http from 'http'
import chalk from 'chalk'
import chokidar from 'chokidar'
import { formatDistanceToNow } from 'date-fns'
import { CliUx } from '@oclif/core'
import { buildImage } from '../docker'
import { SpawnResult, SpawnRequestBody, HTTPError } from '../api'
import { readRequestBody, createColorGetter, type Color } from './util'
import { Logger } from './logger'
import { LocalPlane, runPlane, ensurePlaneImage, isV1StatusAlive, type StatusV1 } from './plane'

const CTRL_C = '\u0003'
const DEV_SERVER_PORT = 8888

type Backend = {
  spawnResult: SpawnResult
  imageId: string
  spawnTime: number
  lastStatus: StatusV1 | null
  lock: string | null
  isStreaming: boolean
  color: Color
  closeStreams: (() => void) | null
}

type Options = {
  dockerfile: string
  watch?: string[]
}

export async function createDevServer({ dockerfile, watch }: Options): Promise<void> {
  await ensurePlaneImage()
  const devServer = new DevServer({ dockerfile, watch })
  await devServer.start()
}

class DevServer {
  currentImageId: string | null = null
  fsWatcher: chokidar.FSWatcher | null = null
  devBackends: Map<string, Backend> = new Map()
  getColor = createColorGetter()
  logger: Logger
  plane: LocalPlane

  constructor(private opts: Options) {
    this.logger = new Logger(this.getFooter.bind(this))
    this.logger.log(['Starting plane'])
    const { url, process, containerName } = runPlane()
    this.plane = new LocalPlane(url, process, containerName, this.logger)
  }

  // returns a promise that resolves when the dev server is stopped
  async start(): Promise<void> {
    const { watch } = this.opts

    await this.plane.ready()

    this.logger.log(['Starting dev server...'])

    this.currentImageId = await this.buildSessionBackend()

    const server = this.startServer()

    const timeToExit = new Promise<void>(resolve => {
      const exitOnError = (err: Error) => {
        this.logger.log([
          '------------- ERROR -------------',
          err.toString(),
          '---------------------------------',
        ])
        resolve()
      }
      process.on('uncaughtException', exitOnError)
      process.on('uncaughtRejection', exitOnError)

      // listen for keyboard input
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', async (key: string) => {
        try {
          if (key === CTRL_C) resolve()
          if (key === 'b') await this.rebuild()
          if (key === 't') await this.terminateAllDevbackends()
        } catch {
          resolve()
        }
      })

      if (watch) {
        this.logger.log([`Watching ${watch.join(', ')} for changes...`, ''])
        const watchPaths = watch.map(w => path.resolve(process.cwd(), w))
        this.fsWatcher = chokidar.watch(watchPaths).on('change', async () => {
          try {
            await this.rebuild()
          } catch {
            resolve()
          }
        })
      }
    })

    this.logger.footerOn()

    const interval = setInterval(() => {
      this.logger.refreshFooter()
    }, 5000)

    await timeToExit

    this.logger.footerOff()

    clearInterval(interval)
    server.close()

    await this.terminateAllDevbackends()

    // close any streams that are still open
    for (const [name, backend] of this.devBackends) {
      if (backend.closeStreams) backend.closeStreams()
      this.devBackends.delete(name)
    }

    this.plane.kill()

    this.fsWatcher?.close()
    process.stdin.removeAllListeners()
    process.stdin.setRawMode(false)
    process.stdin.unref()

    // eslint-disable-next-line unicorn/no-process-exit, no-process-exit
    process.exit(0)
  }

  getFooter(): string[] {
    const footer = ['']
    if (this.devBackends.size > 0) {
      CliUx.ux.table<Backend>([...this.devBackends.values()], {
        name: {
          header: 'Name',
          get: backend => chalk[backend.color](backend.spawnResult.name),
        },
        status: {
          header: 'Status',
          get: backend => chalk[backend.color](backend.lastStatus?.state ?? '-'),
        },
        spawned: {
          header: 'Spawn time',
          get: backend => chalk[backend.color](`${formatDistanceToNow(new Date(backend.spawnTime))} ago`),
        },
        image: {
          header: 'Image ID',
          get: backend => chalk[backend.color](backend.imageId.slice(0, 7)),
        },
        lock: {
          header: 'Lock',
          get: backend => chalk[backend.color](backend.lock ?? '-'),
        },
      }, {
        printLine: line => footer.push(line),
      })
    } else {
      footer.push(chalk.bold` No running backends`)
    }
    footer.push(
      '',
      chalk.bold.italic` ${chalk.underline`[b]`} Build ${chalk.underline`[t]`} Terminate backends ${chalk.underline`[ctrl-c]`} Stop`,
      '',
    )
    return footer
  }

  async buildSessionBackend(): Promise<string> {
    const { dockerfile } = this.opts
    this.logger.log(['Building image...'])
    this.logger.clearFooter()
    const imageId = buildImage(dockerfile)
    this.logger.log(['Image built.'])
    return imageId
  }

  async rebuild(): Promise<void> {
    this.currentImageId = await this.buildSessionBackend()

    const outdatedBackends = [...this.devBackends.values()].filter(backend => backend.imageId !== this.currentImageId).map(backend => backend.spawnResult.name)
    if (outdatedBackends.length > 0) {
      this.logger.log(['', 'Terminating outdated backends...'])
      await this.terminateBackends(outdatedBackends)
    }
  }

  async terminateAllDevbackends(): Promise<void> {
    const backendNames = [...this.devBackends.values()].map(b => b.spawnResult.name)
    if (backendNames.length > 0) {
      this.logger.log(['', 'Terminating development backends...'])
      await this.terminateBackends(backendNames)
    } else {
      this.logger.log(['', 'No development backends to terminate'])
    }
  }

  async terminateBackends(backends: string[]): Promise<void> {
    const terminationPromises = backends.map(name => this.plane.terminate(name))
    this.logger.log([`Terminating ${backends.length} backend(s): ${backends.map(name => name).join(', ')}`])
    await Promise.all(terminationPromises)
    // we don't delete the backends from devBackends here because we want to let any last status updates and logs come through
    // when the backend receives a terminal status, then we'll close the streams and remove it from devBackends
  }

  async streamStatusAndLogs(backendName: string): Promise<void> {
    const backend = this.devBackends.get(backendName)
    if (!backend) throw new Error(`Backend ${backendName} not found in devBackends when attempting to stream status and logs`)

    backend.isStreaming = true

    const statusStream = this.plane.streamStatus(backendName, status => {
      backend.lastStatus = status
      this.logger.log([chalk[backend.color](`[${backendName}] status: ${status.state}`)])
      if (!isV1StatusAlive(status.state)) {
        if (backend?.closeStreams) {
          backend.closeStreams()
        }
        this.devBackends.delete(backendName)
      }
    })

    const logsStream = this.plane.streamLogs(backendName, log => {
      this.logger.log([chalk[backend.color](`[${backendName}] ${log}`)])
    })

    backend.closeStreams = () => {
      statusStream.close()
      logsStream.close()
    }

    await Promise.all([
      statusStream.closed,
      logsStream.closed,
    ])

    this.logger.log([chalk[backend.color](`[${backendName}] streams ended`)])
    backend.isStreaming = false
  }

  startServer(): http.Server {
    const server = http.createServer(async (req, res) => {
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.writeHead(204)
        res.end()
        return
      }

      const isSpawnReq = /^\/user\/([^/]+)\/service\/([^/]+)\/spawn/.exec(req.url ?? '') !== null
      if (req.method === 'POST' && isSpawnReq) {
        await this.handleSpawnRequest(req, res)
        return
      }

      const statusStreamMatch = /^\/backend\/([^/]+)\/status\/stream/.exec(req.url ?? '')
      if (req.method === 'GET' && statusStreamMatch !== null) {
        const backendName = statusStreamMatch[1]
        await this.handleStatusStreamRequest(backendName, res)
        return
      }

      const statusMatch = /^\/backend\/([^/]+)\/status/.exec(req.url ?? '')
      if (req.method === 'GET' && statusMatch !== null) {
        const backendName = statusMatch[1]
        await this.handleStatusRequest(backendName, res)
        return
      }

      res.writeHead(404)
      res.end()
    })

    server.listen(DEV_SERVER_PORT, () => {
      this.logger.log(['', `Jamsocket dev server running on http://localhost:${DEV_SERVER_PORT}`, ''])
    })

    return server
  }

  async handleStatusStreamRequest(backend: string, res: http.ServerResponse): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'text/event-stream')
    res.writeHead(200)
    const stream = this.plane.streamStatus(backend, status => {
      // needs to return {"state":"Ready","backend":"usv10","time":"2024-01-17T21:41:35.682891Z"}
      const data: StatusV1 = status
      res.write(`data:${JSON.stringify(data)}\n\n`)
    })
    await stream.closed

    res.end()
  }

  async handleStatusRequest(backendName: string, res: http.ServerResponse): Promise<void> {
    const b = this.devBackends.get(backendName)
    // if the dev CLI doesn't know about this backend, then 404
    if (!b || b.lastStatus === null) {
      res.writeHead(404)
      res.end()
      return
    }

    // needs to return {"state":"Ready","backend":"usv10","time":"2024-01-17T21:41:35.682891Z"}
    const data: StatusV1 = b.lastStatus
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify(data))
  }

  async handleSpawnRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // TODO: We are just ignoring account/service here. Is there some kind of validation we
    // could do here to help clients avoid issues when going to production?
    const text = await readRequestBody(req)
    let body: Record<string, any> = {}
    try {
      body = JSON.parse(text)
    } catch {}

    const result = await this.spawnBackend(body)
    if (result instanceof HTTPError) {
      res.writeHead(result.status)
      res.end(result.toString())
      return
    }

    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify(result))
  }

  async spawnBackend(body: SpawnRequestBody): Promise<SpawnResult | HTTPError> {
    const imageId = this.currentImageId
    if (!imageId) return new HTTPError(500, 'Internal Error', 'spawnBackend called before currentImageId was set. This is a bug.')

    const result = await this.plane.spawn(imageId, body.env, body.grace_period_seconds, body.lock)
    if (result instanceof HTTPError) return result

    if (this.devBackends.has(result.name)) {
      if (result.spawned) {
        return new HTTPError(500, 'Internal Error', `Spawned backend ${result.name} already exists in devBackends but "spawned=true" in spawn response. Some bug has occurred.`)
      }
      const backend = this.devBackends.get(result.name)!
      if (backend.imageId !== imageId) {
        this.logger.log([chalk.red`Warning: Spawn with lock returned a running backend with an outdated version of the session backend code. Blocking spawn.`])
        return new HTTPError(500, 'Internal Error', 'jamsocket dev-server: Spawn with lock returned a running backend with an outdated version of the session backend code. Blocking spawn.')
      }
    } else if (result.spawned) {
      // rewrite status_url to point back to this dev server
      result.status_url = `http://localhost:${DEV_SERVER_PORT}/backend/${result.name}/status`

      this.devBackends.set(result.name, {
        spawnResult: result,
        imageId: imageId,
        spawnTime: Date.now(),
        lastStatus: null,
        lock: body.lock ?? null,
        isStreaming: false,
        color: this.getColor(),
        closeStreams: null,
      })
      this.logger.log(['', `Spawned backend: ${result.name}`])
    } else {
      this.logger.log([chalk.red`Warning: Spawn with lock returned a running backend that was not originally spawned by this dev server. This may be dangerous. Blocking spawn.`])
      return new HTTPError(500, 'Internal Error', 'jamsocket dev-server: Spawn with lock returned a running backend that was not originally spawned by this dev server. This may be dangerous. Blocking spawn.')
    }

    const backend = this.devBackends.get(result.name)!
    if (!backend.isStreaming) {
      this.logger.log([`Streaming status and logs for ${result.name}`, ''])
      this.streamStatusAndLogs(result.name)
    }

    if (result.spawned) {
      this.logger.refreshFooter()
    }

    return result
  }
}
