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
import type { StreamHandle, StatusV1 } from './plane'
import { LocalPlane, runPlane, ensurePlaneImage, isV1StatusAlive } from './plane'

const CTRL_C = '\u0003'
const DEFAULT_DEV_SERVER_PORT = 8080

type Backend = {
  name: string
  imageId: string
  spawnTime: number
  lastStatus: StatusV1 | null
  lock: string | null
  color: Color
  logsStream: StreamHandle | null
  statusStream: StreamHandle | null
}

type Options = {
  dockerfile: string
  watch?: string[]
  port?: number
}

export async function createDevServer(opts: Options): Promise<void> {
  await ensurePlaneImage()
  const devServer = new DevServer(opts)
  await devServer.start()
}

class DevServer {
  currentImageId: string | null = null
  fsWatcher: chokidar.FSWatcher | null = null
  devBackends: Map<string, Backend> = new Map()
  getColor = createColorGetter()
  logger: Logger
  plane: LocalPlane
  port: number = DEFAULT_DEV_SERVER_PORT

  constructor(private opts: Options) {
    if (opts.port) this.port = opts.port
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
      backend.statusStream?.close()
      backend.logsStream?.close()
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
          get: backend => chalk[backend.color](backend.name),
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
    this.logger.log([`Building image with Dockerfile: ${dockerfile}`])
    this.logger.clearFooter()
    const imageId = buildImage(dockerfile)
    this.logger.log(['Image built.'])
    return imageId
  }

  async rebuild(): Promise<void> {
    this.currentImageId = await this.buildSessionBackend()

    const outdatedBackends = [...this.devBackends.values()].filter(backend => backend.imageId !== this.currentImageId).map(backend => backend.name)
    if (outdatedBackends.length > 0) {
      this.logger.log(['', 'Terminating outdated backends...'])
      await this.terminateBackends(outdatedBackends)
    }
  }

  async terminateAllDevbackends(): Promise<void> {
    const backendNames = [...this.devBackends.values()].map(b => b.name)
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

  async streamStatus(backend: Backend): Promise<void> {
    backend.statusStream = this.plane.streamStatus(backend.name, status => {
      backend.lastStatus = status
      this.logger.log([`Status for ${chalk[backend.color](backend.name)}: ${status.state}`])
      if (!isV1StatusAlive(status.state)) {
        backend.statusStream?.close()
        backend.logsStream?.close()
        this.devBackends.delete(backend.name)
      }
      // once we hit Starting, we're safe to start listening to logs
      if (status.state === 'Starting') {
        this.streamLogs(backend)
      }
    })
    this.logger.log([`Streaming status for ${chalk[backend.color](backend.name)}`])

    try {
      await backend.statusStream.closed
    } catch (error) {
      const msg = error instanceof Error ? error.toString() : 'Unknown error'
      this.logger.log([chalk.red`Error streaming status: ${msg}`])
    }

    this.logger.log([`Status stream ended for ${chalk[backend.color](backend.name)}`])
  }

  async streamLogs(backend: Backend): Promise<void> {
    backend.logsStream = this.plane.streamLogs(backend.name, log => {
      this.logger.log([chalk[backend.color](`[${backend.name}] ${log}`)])
    })
    this.logger.log([`Streaming logs for ${chalk[backend.color](backend.name)}`])
    try {
      await backend.logsStream.closed
    } catch (error) {
      const msg = error instanceof Error ? error.toString() : 'Unknown error'
      this.logger.log([chalk.red`Error streaming logs: ${msg}`])
    }

    this.logger.log([`Logs stream ended for ${chalk[backend.color](backend.name)}`])
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

    server.listen(this.port, () => {
      this.logger.log(['', `Jamsocket dev server running on http://localhost:${this.port}`, ''])
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

    const existingBackend = this.devBackends.get(result.name)
    if (existingBackend) {
      if (result.spawned) {
        return new HTTPError(500, 'Internal Error', `Spawned backend ${result.name} already exists in devBackends but "spawned=true" in spawn response. Some bug has occurred.`)
      }
      if (existingBackend.imageId !== imageId) {
        this.logger.log([chalk.red`Warning: Spawn with lock returned a running backend with an outdated version of the session backend code. Blocking spawn.`])
        return new HTTPError(500, 'Internal Error', 'jamsocket dev-server: Spawn with lock returned a running backend with an outdated version of the session backend code. Blocking spawn.')
      }
    } else if (result.spawned) {
      const backend = {
        name: result.name,
        imageId: imageId,
        spawnTime: Date.now(),
        lock: body.lock ?? null,
        color: this.getColor(),
        lastStatus: null,
        statusStream: null,
        logsStream: null,
      }
      this.devBackends.set(result.name, backend)
      this.logger.log([`Spawned backend: ${chalk[backend.color](result.name)}`])
      this.streamStatus(backend)
    } else {
      this.logger.log([chalk.red`Warning: Spawn with lock returned a running backend that was not originally spawned by this dev server. Blocking spawn.`])
      return new HTTPError(500, 'Internal Error', 'jamsocket dev-server: Spawn with lock returned a running backend that was not originally spawned by this dev server. Blocking spawn.')
    }

    // rewrite status_url to point back to this dev server
    const transformedResult = {
      ...result,
      status_url: `http://localhost:${this.port}/backend/${result.name}/status`,
    }

    return transformedResult
  }
}
