import path from 'path'
import http from 'http'
import chalk from 'chalk'
import chokidar from 'chokidar'
import { formatDistanceToNow } from 'date-fns'
import { CliUx } from '@oclif/core'
import { buildImage } from '../lib/docker'
import type { BuildImageOptions } from '../lib/docker'
import {
  JamsocketConnectRequestBody,
  V1Status,
  JamsocketConnectResponse,
  HTTPError,
  V2Status,
  SpawnRequestBody,
  PublicV2State,
  PlaneTerminationReason,
  PlaneTerminationKind,
} from '../api'
import { readRequestBody, createColorGetter, sleep, type Color } from './util'
import { Logger } from './logger'
import type { StreamHandle, PlaneConnectResponse, PlaneV2StatusMessage } from './plane'
import {
  LocalPlane,
  runPlane,
  ensurePlaneImage,
  isV2StatusAlive,
  dockerKillPlaneBackends,
  isV2ErrorStatus,
} from './plane'

const CTRL_C = '\u0003'
const DEFAULT_DEV_SERVER_PORT = 8080

type Backend = {
  name: string
  imageId: string
  spawnTime: number
  lastStatus: PlaneV2StatusMessage | null
  lastV1Status: StatusMsgV1 | null
  key: string | null
  color: Color
  logsStream: StreamHandle | null
  statusStream: StreamHandle | null
}

type StatusMsgV1 = {
  state: V1Status
  time: string
  backend: string
}

type Options = {
  dockerfile: string
  watch?: string[]
  port?: number
  interactive?: boolean
  styleLogOutput?: boolean
  dockerOptions?: BuildImageOptions
  useStaticToken?: boolean
  dockerNetwork?: string
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
  useStaticToken = false
  dockerNetwork: string | undefined
  imagesBuilding = 0
  styleLogOutput = true

  constructor(private opts: Options) {
    if (opts.port) this.port = opts.port
    if (opts.useStaticToken) this.useStaticToken = opts.useStaticToken
    if (opts.dockerNetwork) this.dockerNetwork = opts.dockerNetwork
    if (opts.styleLogOutput !== undefined) this.styleLogOutput = opts.styleLogOutput
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
      const watchPaths = watch.map((w) => path.resolve(process.cwd(), w))
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
      this.logger.log([
        chalk.red`Error during shutdown: ${error instanceof Error ? error.toString() : 'Unknown error'}`,
      ])
      // eslint-disable-next-line unicorn/no-process-exit, no-process-exit
      process.exit(1)
    }
  }

  getFooter(): string[] {
    const footer = ['']
    if (this.imagesBuilding > 0) {
      footer.push(chalk.yellow` Rebuilding session backend image... Not ready to spawn`)
    } else if (this.devBackends.size > 0) {
      CliUx.ux.table<Backend>(
        [...this.devBackends.values()],
        {
          name: {
            header: 'Name',
            get: (backend) => chalk[backend.color](backend.name),
          },
          status: {
            header: 'Status',
            get: (backend) => chalk[backend.color](backend.lastStatus?.status ?? '-'),
          },
          spawned: {
            header: 'Spawn time',
            get: (backend) =>
              chalk[backend.color](`${formatDistanceToNow(new Date(backend.spawnTime))} ago`),
          },
          image: {
            header: 'Image ID',
            get: (backend) => chalk[backend.color](backend.imageId.slice(0, 7)),
          },
          key: {
            header: 'Key (aka lock)',
            get: (backend) => chalk[backend.color](backend.key ?? '-'),
          },
        },
        {
          printLine: (line) => footer.push(line),
        },
      )
    } else if (this.currentImageId === null) {
      footer.push(
        chalk.red` No running backends (Not ready to spawn - the session backend is still building or has failed to build)`,
      )
    } else {
      footer.push(chalk.bold` No running backends. Ready to spawn!`)
    }
    footer.push(
      '',
      chalk.bold
        .italic` ${chalk.underline`[b]`} Build ${chalk.underline`[t]`} Terminate backends ${chalk.underline`[ctrl-c]`} Stop`,
      '',
    )
    return footer
  }

  async buildSessionBackend(): Promise<void> {
    this.currentImageId = null
    this.imagesBuilding += 1
    const { dockerfile, dockerOptions } = this.opts
    this.logger.log([`Building image with Dockerfile: ${dockerfile}`])

    /* eslint-disable unicorn/consistent-function-scoping */
    const stdioWrite = (val: string) => this.logger.log([val])

    let imageId: string
    try {
      imageId = await buildImage(dockerfile, dockerOptions, stdioWrite, stdioWrite)
    } catch (error) {
      this.currentImageId = null
      this.imagesBuilding -= 1
      const msg = error instanceof Error ? error.toString() : 'Unknown error'
      this.logger.log([chalk.red`Error building image: ${msg}`])
      return
    }
    this.currentImageId = imageId
    this.imagesBuilding -= 1
    this.logger.log([chalk.blue`Successfully built image`])
  }

  async rebuild(): Promise<void> {
    this.terminateAllDevbackends()
    await this.buildSessionBackend()
  }

  async terminateAllDevbackends(): Promise<void> {
    const backendNames = [...this.devBackends.values()].map((b) => b.name)
    if (backendNames.length > 0) {
      this.logger.log(['', 'Terminating session backends...'])
      await this.terminateBackends(backendNames, true)
    } else {
      this.logger.log(['', 'No session backends to terminate'])
    }
  }

  async terminateBackends(backends: string[], force = false): Promise<void> {
    const terminationPromises = backends.map((name) => this.plane.terminate(name, force))
    this.logger.log([
      `Terminating ${backends.length} backend(s): ${backends.map((name) => name).join(', ')}`,
    ])
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
    // doing some gymnastics to translate v2 statuses to v1 statuses
    // once we drop support for v1 statuses in a future version, we can
    // remove a lot of this extra logic
    let lastAliveStatusMsg: PlaneV2StatusMessage | null = null
    let lastV1Status: string | null = null
    backend.statusStream = this.plane.streamStatus(backend.name, (status) => {
      const v1Status = translateStatusToV1(status, lastAliveStatusMsg)
      if (
        lastAliveStatusMsg === null ||
        (isPreterminatingStatus(status.status) && status.time > lastAliveStatusMsg.time)
      ) {
        lastAliveStatusMsg = status
      }

      const dontEmit = lastV1Status && v1Status === lastV1Status
      lastV1Status = v1Status
      if (!dontEmit) {
        backend.lastV1Status = {
          state: v1Status,
          time: new Date(status.time).toISOString(),
          backend: backend.name,
        }
      }

      backend.lastStatus = status
      this.logger.log([
        `Status for ${this.applyBackendStyle(backend, backend.name)}: ${status.status}`,
      ])
      if (!isV2StatusAlive(status.status)) {
        backend.statusStream?.close()
        backend.logsStream?.close()
        this.devBackends.delete(backend.name)
        if (isV2ErrorStatus(status)) {
          this.logger.log([
            chalk.yellow`See https://docs.jamsocket.com/platform/troubleshooting for help on troubleshooting unexpected terminated statuses.`,
          ])
        }
      }
      // once we hit Starting, we're safe to start listening to logs
      if (status.status === 'starting') {
        this.streamLogs(backend)
      }
    })
    this.logger.log([`Streaming status for ${this.applyBackendStyle(backend, backend.name)}`])

    try {
      await backend.statusStream.closed
    } catch (error) {
      const msg = error instanceof Error ? error.toString() : 'Unknown error'
      this.logger.log([chalk.red`Error streaming status: ${msg}`])
    }

    this.logger.log([`Status stream ended for ${this.applyBackendStyle(backend, backend.name)}`])
  }

  applyBackendStyle(backend: Backend, text: string) {
    if (!this.styleLogOutput) return text
    return chalk[backend.color](text)
  }

  async streamLogs(backend: Backend): Promise<void> {
    backend.logsStream = await this.plane.streamLogs(backend.name, (log) => {
      this.logger.log([this.applyBackendStyle(backend, `[${backend.name}] ${log}`)])
    })
    this.logger.log([`Streaming logs for ${this.applyBackendStyle(backend, backend.name)}`])
    try {
      await backend.logsStream.closed
    } catch (error) {
      const msg = error instanceof Error ? error.toString() : 'Unknown error'
      this.logger.log([chalk.red`Error streaming logs: ${msg}`])
    }

    this.logger.log([`Logs stream ended for ${this.applyBackendStyle(backend, backend.name)}`])
  }

  startServer(): http.Server {
    const server = http.createServer(async (req, res) => {
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.writeHead(204)
        res.end()
        return
      }

      // -------- v1 endpoints --------

      const isSpawnReq = /^\/user\/([^/]+)\/service\/([^/]+)\/spawn/.exec(req.url ?? '') !== null
      if (req.method === 'POST' && isSpawnReq) {
        await this.handleSpawnRequest(req, res)
        return
      }

      const v1StatusStreamMatch = /^\/backend\/([^/]+)\/status\/stream/.exec(req.url ?? '')
      if (req.method === 'GET' && v1StatusStreamMatch !== null) {
        const backendName = v1StatusStreamMatch[1]
        await this.handleV1StatusStreamRequest(backendName, res)
        return
      }

      const v1StatusMatch = /^\/backend\/([^/]+)\/status/.exec(req.url ?? '')
      if (req.method === 'GET' && v1StatusMatch !== null) {
        const backendName = v1StatusMatch[1]
        await this.handleV1StatusRequest(backendName, res)
        return
      }

      const v1TerminateMatch = /^\/backend\/([^/]+)\/terminate/.exec(req.url ?? '')
      if (req.method === 'POST' && v1TerminateMatch !== null) {
        const backendName = v1TerminateMatch[1]
        await this.handleV1TerminateRequest(backendName, res)
        return
      }

      // -------- v2 endpoints --------

      const isConnectReq = /^\/v2\/service\/([^/]+)\/([^/]+)\/connect/.exec(req.url ?? '') !== null
      if (req.method === 'POST' && isConnectReq) {
        await this.handleConnectRequest(req, res)
        return
      }

      const statusStreamMatch = /^\/v2\/backend\/([^/]+)\/status\/stream/.exec(req.url ?? '')
      if (req.method === 'GET' && statusStreamMatch !== null) {
        const backendName = statusStreamMatch[1]
        await this.handleStatusStreamRequest(backendName, res)
        return
      }

      const statusMatch = /^\/v2\/backend\/([^/]+)\/status/.exec(req.url ?? '')
      if (req.method === 'GET' && statusMatch !== null) {
        const backendName = statusMatch[1]
        await this.handleStatusRequest(backendName, res)
        return
      }

      const terminateMatch = /^\/v2\/backend\/([^/]+)\/terminate/.exec(req.url ?? '')
      if (req.method === 'POST' && terminateMatch !== null) {
        const backendName = terminateMatch[1]
        await this.handleTerminateRequest(backendName, req, res)
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
    const stream = this.plane.streamStatus(backend, (status) => {
      const data: PublicV2State = getPublicV2State(status)
      res.write(`data:${JSON.stringify(data)}\n\n`)
    })
    await stream.closed

    res.end()
  }

  async handleV1StatusStreamRequest(backend: string, res: http.ServerResponse): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'text/event-stream')
    res.writeHead(200)

    let lastAliveStatusMsg: PlaneV2StatusMessage | null = null
    let lastV1Status: string | null = null

    const stream = this.plane.streamStatus(backend, (v2Status) => {
      const v1Status = translateStatusToV1(v2Status, lastAliveStatusMsg)
      if (
        lastAliveStatusMsg === null ||
        (isPreterminatingStatus(v2Status.status) && v2Status.time > lastAliveStatusMsg.time)
      ) {
        lastAliveStatusMsg = v2Status
      }

      const dontEmit = lastV1Status && v1Status === lastV1Status
      lastV1Status = v1Status
      if (dontEmit) return

      const data: StatusMsgV1 = {
        state: v1Status,
        time: new Date(v2Status.time).toISOString(),
        backend: backend,
      }
      res.write(`data:${JSON.stringify(data)}\n\n`)
    })
    await stream.closed

    res.end()
  }

  async handleV1StatusRequest(backendName: string, res: http.ServerResponse): Promise<void> {
    let b = this.devBackends.get(backendName)
    // if the dev CLI doesn't know about this backend yet, it may just need to sleep for a bit
    // and then try again one more time
    if (!b || b.lastV1Status === null) {
      await sleep(500)
      b = this.devBackends.get(backendName)
    }

    // if the dev CLI still doesn't know about this backend, then 404
    if (!b || b.lastV1Status === null) {
      res.writeHead(404)
      res.end()
      return
    }

    const data: StatusMsgV1 = b.lastV1Status
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify(data))
  }

  async handleStatusRequest(backendName: string, res: http.ServerResponse): Promise<void> {
    let b = this.devBackends.get(backendName)
    // if the dev CLI doesn't know about this backend yet, it may just need to sleep for a bit
    // and then try again one more time
    if (!b || b.lastStatus === null) {
      await sleep(500)
      b = this.devBackends.get(backendName)
    }

    // if the dev CLI still doesn't know about this backend, then 404
    if (!b || b.lastStatus === null) {
      res.writeHead(404)
      res.end()
      return
    }

    const data: PublicV2State = getPublicV2State(b.lastStatus)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify(data))
  }

  async handleTerminateRequest(
    backendName: string,
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const b = this.devBackends.get(backendName)
    // if the dev CLI doesn't know about this backend, then 404
    if (!b || b.lastStatus === null) {
      res.writeHead(404)
      res.end()
      return
    }

    const text = await readRequestBody(req)
    let body: Record<string, any> = {}
    try {
      if (text.length > 0) {
        body = JSON.parse(text)
      }
    } catch {
      res.writeHead(400)
      res.end('Failed to parse the request body as JSON')
      return
    }

    await this.terminateBackends([backendName], body.hard === true)
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end('{"status":"ok"}')
  }

  async handleV1TerminateRequest(backendName: string, res: http.ServerResponse): Promise<void> {
    const b = this.devBackends.get(backendName)
    // if the dev CLI doesn't know about this backend, then 404
    if (!b || b.lastStatus === null) {
      res.writeHead(404)
      res.end()
      return
    }

    // v1 always hard terminates
    await this.terminateBackends([backendName], true)
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end('{"status":"ok"}')
  }

  async handleConnectRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // TODO: We are just ignoring account/service here. Is there some kind of validation we
    // could do here to help clients avoid issues when going to production?
    const text = await readRequestBody(req)
    let body: Record<string, any> = {}
    try {
      if (text.length > 0) {
        body = JSON.parse(text)
      }
    } catch {
      res.writeHead(400)
      res.end('Failed to parse the request body as JSON')
      return
    }

    const result = await this.spawnBackend(body)
    if (result instanceof HTTPError) {
      res.writeHead(result.status)
      res.end(result.toString())
      return
    }

    const respBody: JamsocketConnectResponse = {
      backend_id: result.backend_id,
      status_url: `http://localhost:${this.port}/v2/backend/${result.backend_id}/status`,
      status: result.status,
      spawned: result.spawned,
      ready_url: '',
      url: result.url,
      secret_token: result.secret_token,
      token: result.token,
    }
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify(respBody))
  }

  async handleSpawnRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // TODO: We are just ignoring account/service here. Is there some kind of validation we
    // could do here to help clients avoid issues when going to production?
    const text = await readRequestBody(req)
    let body: SpawnRequestBody = {}
    try {
      body = JSON.parse(text)
    } catch {
      res.writeHead(400)
      res.end('Failed to parse the request body as JSON')
      return
    }

    const connectReq: JamsocketConnectRequestBody = {
      key: body.lock,
      spawn: {
        executable: {
          env: body.env,
        },
        max_idle_seconds: body.grace_period_seconds,
      },
    }

    const result = await this.spawnBackend(connectReq)
    if (result instanceof HTTPError) {
      res.writeHead(result.status)
      res.end(result.toString())
      return
    }

    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify(result))
  }

  async spawnBackend(body: JamsocketConnectRequestBody): Promise<PlaneConnectResponse | HTTPError> {
    const imageId = await this.waitUntilImageIsReady(60_000) // wait up to 60 seconds for the image to be ready
    if (!imageId) {
      this.logger.log([
        chalk.red`Error spawning backend: the latest build of your session backend's Dockerfile has either failed or is still ongoing. Check the logs above and make sure there are no docker build errors before spawning.`,
      ])
      return new HTTPError(
        500,
        'Internal Error',
        "Error spawning backend: the latest build of your session backend's Dockerfile has either failed or has not yet completed. Make sure all docker build errors are resolved and a new image is built before spawning.",
      )
    }

    const result = await this.plane.spawn(imageId, body, this.useStaticToken, this.dockerNetwork)
    if (result instanceof HTTPError) return result

    const existingBackend = this.devBackends.get(result.backend_id)
    if (existingBackend) {
      if (result.spawned) {
        return new HTTPError(
          500,
          'Internal Error',
          `Spawned backend ${result.backend_id} already exists in devBackends but "spawned=true" in spawn response. Some bug has occurred.`,
        )
      }
      if (existingBackend.imageId !== imageId) {
        this.logger.log([
          chalk.red`Warning: Spawn with key returned a running backend with an outdated version of the session backend code. Blocking spawn.`,
        ])
        return new HTTPError(
          500,
          'Internal Error',
          'jamsocket dev-server: Spawn with key returned a running backend with an outdated version of the session backend code. Blocking spawn.',
        )
      }
    } else if (result.spawned) {
      const backend = {
        name: result.backend_id,
        imageId: imageId,
        spawnTime: Date.now(),
        key: body.key ?? null,
        color: this.getColor(),
        lastStatus: null,
        lastV1Status: null,
        statusStream: null,
        logsStream: null,
      }
      this.devBackends.set(result.backend_id, backend)
      this.logger.log([`Spawned backend: ${this.applyBackendStyle(backend, result.backend_id)}`])
      this.streamStatus(backend)
    } else {
      this.logger.log([
        chalk.red`Warning: Spawn with key returned a running backend that was not originally spawned by this dev server. Blocking spawn.`,
      ])
      return new HTTPError(
        500,
        'Internal Error',
        'jamsocket dev-server: Spawn with key returned a running backend that was not originally spawned by this dev server. Blocking spawn.',
      )
    }

    // rewrite status_url to point back to this dev server
    const transformedResult = {
      ...result,
      status_url: `http://localhost:${this.port}/backend/${result.backend_id}/status`,
    }

    return transformedResult
  }

  // resolves with the image ID when the image is ready
  // or null if the image fails to build or the timeout is reached
  async waitUntilImageIsReady(timeoutMs: number): Promise<string | null> {
    const start = Date.now()
    while (start + timeoutMs > Date.now()) {
      if (this.imagesBuilding === 0) {
        return this.currentImageId
      }
      await sleep(500)
    }
    return null
  }
}

function translateStatusToV1(
  plane2StatusMsg: PlaneV2StatusMessage,
  lastAliveStatusMsg: PlaneV2StatusMessage | null,
): V1Status {
  switch (plane2StatusMsg.status) {
    case 'scheduled':
    case 'loading':
      return 'Loading'
    case 'starting':
    case 'waiting':
      return 'Starting'
    case 'ready':
    case 'terminating':
    case 'hard-terminating':
      return 'Ready'
    case 'terminated':
      if (plane2StatusMsg.termination_reason === 'external') {
        return 'Terminated'
      }
      if (plane2StatusMsg.termination_reason === 'internal-error') {
        return 'Lost'
      }
      if (
        plane2StatusMsg.termination_reason &&
        ['swept', 'key_expired'].includes(plane2StatusMsg.termination_reason)
      ) {
        return 'Swept'
      }
      if (!lastAliveStatusMsg || ['scheduled', 'loading'].includes(lastAliveStatusMsg.status)) {
        return 'ErrorLoading'
      }
      if (lastAliveStatusMsg.status === 'starting') {
        return 'ErrorStarting'
      }
      if (lastAliveStatusMsg.status === 'waiting') {
        if (plane2StatusMsg.termination_reason === 'startup_timeout') return 'TimedOutBeforeReady'
        return 'ErrorStarting'
      }
      // if we've gotten here, the last alive status was 'ready'
      if (plane2StatusMsg.exit_error === undefined) return 'Terminated'
      if (plane2StatusMsg.exit_error === false) return 'Exited'
      return 'Failed'
  }
}

function isPreterminatingStatus(status: V2Status): boolean {
  return !['terminating', 'hard-terminating', 'terminated'].includes(status)
}

// NOTE: this function's implementation is a little funny because it's
// trying to get TypeScript to correctly infer types
type TerminatedV2State = {
  status: 'terminated'
  time: string
  exit_error?: boolean
  termination_reason?: PlaneTerminationReason
  termination_kind?: PlaneTerminationKind
}
function getPublicV2State(msg: PlaneV2StatusMessage): PublicV2State {
  const time = new Date(msg.time).toISOString()

  if (msg.status === 'scheduled') return { status: msg.status, time }
  if (msg.status === 'loading') return { status: msg.status, time }
  if (msg.status === 'starting') return { status: msg.status, time }
  if (msg.status === 'waiting') return { status: msg.status, time }
  if (msg.status === 'ready') return { status: msg.status, time }
  if (msg.status === 'terminating')
    return { status: msg.status, time, termination_reason: msg.termination_reason }
  if (msg.status === 'hard-terminating')
    return { status: msg.status, time, termination_reason: msg.termination_reason }

  // only "terminated" is left
  const exit_error = msg.exit_error
  const termination_kind = msg.termination_kind
  const termination_reason = msg.termination_reason
  const v2State: TerminatedV2State = { status: msg.status, time }
  if (exit_error) v2State.exit_error = exit_error
  if (termination_kind) v2State.termination_kind = termination_kind
  if (termination_reason) v2State.termination_reason = termination_reason
  return v2State
}
