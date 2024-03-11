import path from 'path'
import http from 'http'
import chalk from 'chalk'
import chokidar from 'chokidar'
import { formatDistanceToNow } from 'date-fns'
import { CliUx } from '@oclif/core'
import { buildImage } from '../docker'
import type { BuildImageOptions } from '../docker'
import { SpawnResult, SpawnRequestBody, HTTPError } from '../api'
import { readRequestBody, createColorGetter, type Color } from './util'
import { Logger } from './logger'
import type { StreamHandle, StatusV1 } from './plane'
import { LocalPlane, runPlane, ensurePlaneImage, isV1StatusAlive, isV1ErrorStatus, dockerKillPlaneBackends } from './plane'

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
  interactive?: boolean
  dockerOptions?: BuildImageOptions
}

export async function createDevServer(opts: Options): Promise<void> {
  await ensurePlaneImage()

  let devServer: DevServer | null = null
  try {
    devServer = new DevServer(opts)

    process.on('SIGINT', () => devServer?.exit())
    process.on('SIGTERM', () => devServer?.exit())
    process.on('SIGHUP', () => devServer?.exit())
    process.on('uncaughtException', (err: Error) => devServer?.exit(err))
    process.on('uncaughtRejection', (reason: Error | any) => {
      const err = reason instanceof Error ? reason : new Error('Uncaught rejection')
      devServer?.exit(err)
    })

    await devServer.start()
  } catch (error) {
    if (devServer) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      devServer.exit(err)
    }
  }
}

class DevServer {
  currentImageId: string | null = null
  fsWatcher: chokidar.FSWatcher | null = null
  devBackends: Map<string, Backend> = new Map()
  getColor = createColorGetter()
  logger: Logger
  plane: LocalPlane
  server: http.Server | null = null
  port: number = DEFAULT_DEV_SERVER_PORT

  constructor(private opts: Options) {
    if (opts.port) this.port = opts.port
    this.logger = new Logger(this.getFooter.bind(this))
    this.logger.log(['Starting plane'])
    const { url, process, containerName } = runPlane()
    this.plane = new LocalPlane(url, process, containerName, this.logger)
    this.plane.onExit.then(() => this.exit(new Error('Plane exited unexpectedly')))
  }

  async start() {
    const { watch, interactive } = this.opts

    // listen for keyboard input
    if (interactive !== false) {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true)
      }
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', async (key: string) => {
        try {
          if (key === CTRL_C) await this.exit()
          if (key === 'b') await this.rebuild()
          if (key === 't') await this.terminateAllDevbackends()
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Unknown error')
          await this.exit(err)
        }
      })
    }

    if (watch) {
      this.logger.log([`Watching ${watch.join(', ')} for changes...`, ''])
      const watchPaths = watch.map(w => path.resolve(process.cwd(), w))
      this.fsWatcher = chokidar.watch(watchPaths).on('change', async () => {
        try {
          await this.rebuild()
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Error rebuilding session backend')
          await this.exit(err)
        }
      })
    }

    await this.plane.ready()

    await this.buildSessionBackend()

    this.logger.log(['Starting dev server...'])
    this.server = this.startServer()

    if (interactive !== false) {
      this.logger.footerOn()
    }
  }

  async exit(error?: Error) {
    // make sure no errors are thrown during shutdown
    // which can cause a fail loop that never exits
    try {
      if (error) {
        this.logger.log([
          chalk.red('------------- ERROR -------------'),
          chalk.red(error.toString()),
          chalk.red('---------------------------------'),
        ])
      }

      this.logger.footerOff()

      if (this.server) {
        this.logger.log(['Shutting down dev server...'])
        this.server.close()
      }

      this.logger.log(['Terminating session backends...'])
      await this.terminateAllDevbackends()

      // close any streams that are still open
      for (const [name, backend] of this.devBackends) {
        backend.statusStream?.close()
        backend.logsStream?.close()
        this.devBackends.delete(name)
      }

      this.logger.log(['Stopping Plane...'])
      this.plane.kill()

      this.fsWatcher?.close()
      process.stdin.removeAllListeners()
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
      }
      process.stdin.unref()

      this.logger.log(['Goodbye!'])
      // eslint-disable-next-line unicorn/no-process-exit, no-process-exit
      process.exit(error ? 1 : 0)
    } catch (error) {
      this.logger.log([chalk.red`Error during shutdown: ${error instanceof Error ? error.toString() : 'Unknown error'}`])
      // eslint-disable-next-line unicorn/no-process-exit, no-process-exit
      process.exit(1)
    }
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
    } else if (this.currentImageId === null) {
      footer.push(chalk.red` No running backends (Not ready to spawn - the session backend is still building or has failed to build)`)
    } else {
      footer.push(chalk.bold` No running backends. Ready to spawn!`)
    }
    footer.push(
      '',
      chalk.bold.italic` ${chalk.underline`[b]`} Build ${chalk.underline`[t]`} Terminate backends ${chalk.underline`[ctrl-c]`} Stop`,
      '',
    )
    return footer
  }

  async buildSessionBackend(): Promise<void> {
    this.currentImageId = null
    const { dockerfile, dockerOptions } = this.opts
    this.logger.log([`Building image with Dockerfile: ${dockerfile}`])
    this.logger.clearFooter()
    let imageId: string
    try {
      imageId = buildImage(dockerfile, dockerOptions)
    } catch (error) {
      this.currentImageId = null
      const msg = error instanceof Error ? error.toString() : 'Unknown error'
      this.logger.log([chalk.red`Error building image: ${msg}`])
      return
    }
    this.currentImageId = imageId
    this.logger.log([chalk.blue`Successfully built image`])
  }

  async rebuild(): Promise<void> {
    await this.buildSessionBackend()

    const curBackends = [...this.devBackends.values()]
    // if the current image is null, the session backend failed to build, let's terminate all backends
    const outdatedBackends = this.currentImageId === null ? curBackends : curBackends.filter(backend => backend.imageId !== this.currentImageId)
    const outdatedBackendNames = outdatedBackends.map(b => b.name)
    if (outdatedBackendNames.length > 0) {
      this.logger.log(['', 'Terminating outdated backends...'])
      await this.terminateBackends(outdatedBackendNames)
    }
  }

  async terminateAllDevbackends(): Promise<void> {
    const backendNames = [...this.devBackends.values()].map(b => b.name)
    if (backendNames.length > 0) {
      this.logger.log(['', 'Terminating session backends...'])
      await this.terminateBackends(backendNames)
    } else {
      this.logger.log(['', 'No session backends to terminate'])
    }
  }

  async terminateBackends(backends: string[]): Promise<void> {
    const terminationPromises = backends.map(name => this.plane.terminate(name))
    this.logger.log([`Terminating ${backends.length} backend(s): ${backends.map(name => name).join(', ')}`])
    try {
      await Promise.all(terminationPromises)
    } catch (error) {
      this.logger.log([
        chalk.red`Error terminating backends: ${error instanceof Error ? error.toString() : 'Unknown error'}`,
        chalk.red`Attempting to kill backends with docker...`,
      ])
      dockerKillPlaneBackends(backends)
    }

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
        if (isV1ErrorStatus(status.state)) {
          this.logger.log([chalk.yellow`See https://docs.jamsocket.com/platform/troubleshooting for help on troubleshooting ${status.state} statuses`])
        }
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
    if (!imageId) {
      this.logger.log([chalk.red`Error spawning backend: the latest build of your session backend's Dockerfile has either failed or is still ongoing. Check the logs above and make sure there are no docker build errors before spawning.`])
      return new HTTPError(500, 'Internal Error', 'Error spawning backend: the latest build of your session backend\'s Dockerfile has either failed or has not yet completed. Make sure all docker build errors are resolved and a new image is built before spawning.')
    }

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
