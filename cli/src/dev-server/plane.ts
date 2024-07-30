import { spawn, type ChildProcessWithoutNullStreams, spawnSync } from 'child_process'
import readline from 'readline'
import chalk from 'chalk'
import EventSource from 'eventsource'
import { HTTPError, V2Status, JamsocketConnectRequestBody, ConnectResourceLimits, PlaneV2StatusMessage } from '../api'
import { sleep } from './util'
import { spawnDockerSync } from '../lib/docker'
import type { Logger } from './logger'

type PlaneConnectRequest = {
  key?: {
    name: string
    namespace?: string
    tag?: string
  }
  user?: string
  auth?: Record<string, any>
  spawn_config?: {
    id?: string
    cluster?: string
    pool?: string
    executable: {
      image: string
      pull_policy?: 'Always' | 'Never' | 'IfNotPresent'
      credentials?: { username: string; password: string }
      resource_limits?: ConnectResourceLimits
      mount?: boolean | string
      network_name?: string
      env?: Record<string, string>
    }
    lifetime_limit_seconds?: number
    max_idle_seconds?: number
    use_static_token?: boolean
    subdomain?: string
  }
}

export type PlaneConnectResponse = {
  backend_id: string
  spawned: boolean
  token: string
  url: string
  secret_token: string
  status_url: string
  status: V2Status
}

export type StreamHandle = {
  closed: Promise<void>
  close: () => void
}

const PLANE_IMAGE = 'plane/quickstart:sha-d9d16d9'
const LAST_N_PLANE_LOGS = 20 // the number of plane logs to show if a Plane error is enountered

// NOTE: this class works with a Plane2 interface, but its own interface is meant to be compatible with Jamsocket V1
export class LocalPlane {
  private _readyPromise: Promise<void> | null = null
  onExit: Promise<void>
  constructor(
    private url: string,
    private process: ChildProcessWithoutNullStreams,
    private containerName: string,
    private logger: Logger,
  ) {
    const planeLogs: string[] = []

    readline.createInterface({ input: this.process.stderr }).on('line', line => {
      planeLogs.push(chalk.red(`[plane stderr] ${line}`))
      while (planeLogs.length > LAST_N_PLANE_LOGS) planeLogs.shift()
    })
    readline.createInterface({ input: this.process.stdout }).on('line', line => {
      planeLogs.push(`[plane stdout] ${line}`)
      while (planeLogs.length > LAST_N_PLANE_LOGS) planeLogs.shift()
    })

    this.onExit = new Promise(resolve => {
      this.process.on('exit', () => {
        if (planeLogs.length > 0) {
          this.logger.log(planeLogs)
        }
        this.logger.log([`Plane process exited with code: ${this.process.exitCode ?? 'unknown'}`])
        resolve()
      })
    })
  }

  kill(): void {
    spawnSync('docker', ['kill', this.containerName])
  }

  ready(): Promise<void> {
    if (this._readyPromise) return this._readyPromise
    this._readyPromise = new Promise(resolve => {
      // wait for the "[SERVICE] entered RUNNING state" lines to appear in the logs
      const planeServices = new Set(['plane-controller', 'plane-drone', 'plane-proxy', 'postgres'])
      const rl = readline.createInterface({ input: this.process.stdout }).on('line', line => {
        const match = /([a-z-]+) entered RUNNING state/.exec(line)
        if (match && planeServices.has(match[1])) {
          planeServices.delete(match[1])
          if (planeServices.size === 0) {
            rl.close()
            resolve()
          }
        }
      })
    })
    return this._readyPromise
  }

  async streamLogs(backend: string, callback: (logLine: string) => void): Promise<StreamHandle> {
    const containerName = `plane-${backend}`

    // there can be race conditions where the container is not yet available, so let's retry a few times
    let retries = 0
    while (retries < 3) {
      const result = spawnSync('docker', ['container', 'inspect', containerName])
      if (result.status === 0) break
      await sleep(500)
      retries += 1
    }

    const logsProcess = spawn('docker', ['logs', containerName, '-f'])
    const stdout = readline.createInterface({ input: logsProcess.stdout }).on('line', callback)
    const stderr = readline.createInterface({ input: logsProcess.stderr }).on('line', callback)

    const close = () => {
      stdout.close()
      stderr.close()
      logsProcess.kill()
    }
    const closed = new Promise<void>((resolve, reject) => {
      logsProcess.on('error', err => {
        if (err.message.includes('ENOENT')) {
          reject(new Error('Docker command not found. Make sure Docker is installed and in your PATH.'))
        } else {
          reject(err)
        }
      })

      logsProcess.on('close', resolve)
    })

    return { close, closed }
  }

  async terminate(backend: string, hard = false): Promise<void | HTTPError> {
    let terminateUrl = `${this.url}/ctrl/b/${backend}`
    terminateUrl += hard ? '/hard-terminate' : '/soft-terminate'
    const response = await fetch(terminateUrl, { method: 'POST' })
    const body = await response.text()
    if (response.status !== 200) {
      throw new HTTPError(response.status, response.statusText, `Failed to terminate backend: ${response.status} ${response.statusText} - ${body}`)
    }
  }

  streamStatus(backend: string, callback: (statusMessage: PlaneV2StatusMessage) => void): StreamHandle {
    const statusUrl = `${this.url}/pub/b/${backend}/status-stream`
    const es = new EventSource(statusUrl)
    es.addEventListener('message', (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as PlaneV2StatusMessage
      callback(msg)
    })
    let resolveClosed: () => void
    const closed = new Promise<void>(resolve => {
      resolveClosed = resolve
    })

    function close() {
      es.close()
      resolveClosed()
    }

    es.addEventListener('error', close)

    return { closed, close }
  }

  async spawn(
    image: string,
    connectReq: JamsocketConnectRequestBody,
    useStaticToken?: boolean,
    dockerNetwork?: string,
  ): Promise<PlaneConnectResponse | HTTPError> {
    const connectUrl = `${this.url}/ctrl/connect`

    const connectBody: PlaneConnectRequest = {
      key: connectReq.key ? {
        name: connectReq.key,
        tag: image,
      } : undefined,
      user: connectReq.user,
      auth: connectReq.auth,
    }

    if (connectReq.spawn !== false) {
      connectBody.spawn_config = {
        executable: { image, pull_policy: 'Never' },
        max_idle_seconds: 300,
      }
      if (useStaticToken) {
        connectBody.spawn_config.use_static_token = true
      }
      if (dockerNetwork) {
        connectBody.spawn_config.executable.network_name = dockerNetwork
      }
      if (typeof connectReq.spawn === 'object') {
        connectBody.spawn_config.executable.env = connectReq.spawn.executable?.env
        connectBody.spawn_config.executable.mount = connectReq.spawn.executable?.mount
        connectBody.spawn_config.executable.resource_limits = connectReq.spawn.executable?.resource_limits
        connectBody.spawn_config.lifetime_limit_seconds = connectReq.spawn.lifetime_limit_seconds
        connectBody.spawn_config.max_idle_seconds = connectReq.spawn.max_idle_seconds
      }
    }

    const response = await fetch(connectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(connectBody),
    })

    const body = await response.text()

    if (response.status !== 200) {
      return new HTTPError(response.status, response.statusText, `Failed to spawn backend: ${response.status} ${response.statusText} - ${body}`)
    }

    return JSON.parse(body) as PlaneConnectResponse
  }
}

export function dockerKillPlaneBackends(backendNames: string[]): void {
  for (const backendName of backendNames) {
    spawnSync('docker', ['kill', `plane-${backendName}`])
  }
}

export function isV2StatusAlive(v2Status: V2Status): boolean {
  return v2Status !== 'terminated'
}

export function isV2ErrorStatus(v2StatusMsg: PlaneV2StatusMessage): boolean {
  return v2StatusMsg.status === 'terminated' && Boolean(v2StatusMsg.exit_error) && v2StatusMsg.termination_reason !== 'external'
}

export function runPlane(): { url: string, process: ChildProcessWithoutNullStreams, containerName: string } {
  const containerName = `plane-quickstart-${Math.floor(Math.random() * 1_000_000)}`
  // NOTE: for now, plane quickstart MUST be run port 9191
  // and the cluster must be served on 9090 as these are
  // hardcoded in the quickstart image
  const process = spawn('docker', [
    'run',
    '-p',
    '9191:8080',
    '-p',
    '9090:9090',
    '--name',
    containerName,
    '--add-host',
    'host.docker.internal:host-gateway',
    '-v',
    '/var/run/docker.sock:/var/run/docker.sock',
    '--rm',
    PLANE_IMAGE,
  ])

  const url = 'http://localhost:9191'

  return { url, process, containerName }
}

export function ensurePlaneImage(): Promise<void> {
  const result = spawnSync('docker', ['image', 'inspect', PLANE_IMAGE])
  if (result.status === 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    console.log('Downloading plane/quickstart image...')
    const result = spawnDockerSync(['pull', PLANE_IMAGE], { stdio: 'inherit' })
    if (result.status === 0) {
      resolve()
    } else {
      reject(new Error('Failed to pull plane/quickstart image'))
    }
  })
}
