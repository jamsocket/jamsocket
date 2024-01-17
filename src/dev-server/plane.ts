import { spawn, type ChildProcessWithoutNullStreams, spawnSync } from 'child_process'
import readline from 'readline'
import chalk from 'chalk'
import EventSource from 'eventsource'
import { SpawnResult, HTTPError } from '../api'
import type { Logger } from './logger'

export type PlaneConnectResponse = {
  backend_id: string
  spawned: boolean
  token: string
  url: string
  secret_token: string
  status_url: string
  status: string
}
export type PlaneStatusMessage = {
  status: string,
  time: number,
}
export type StatusV1 = {
  state: string,
  time: string,
  backend: string,
}
export type StreamHandle = {
  closed: Promise<void>
  close: () => void
}

const PLANE_IMAGE = 'plane/quickstart:sha-90eefde'

// NOTE: this class works with a Plane2 interface, but its own interface is meant to be compatible with Jamsocket V1
export class LocalPlane {
  private _readyPromise: Promise<void> | null = null
  constructor(
    private url: string,
    private process: ChildProcessWithoutNullStreams,
    private containerName: string,
    private logger: Logger,
  ) {
    readline.createInterface({ input: this.process.stderr }).on('line', line => {
      this.logger.log([chalk.red(`[plane stderr] ${line}`)])
    })
    readline.createInterface({ input: this.process.stdout }).on('line', line => {
      this.logger.log([`[plane stdout] ${line}`])
    })
    this.process.on('exit', () => {
      this.logger.log([`Plane process exited with code: ${this.process.exitCode ?? 'unknown'}`])
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

  streamLogs(backend: string, callback: (logLine: string) => void): StreamHandle {
    const containerName = `plane-${backend}`
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

  async terminate(backend: string): Promise<void | HTTPError> {
    // TODO: should we do a soft-terminate here?
    const terminateUrl = `${this.url}/ctrl/b/${backend}/hard-terminate`
    const response = await fetch(terminateUrl, { method: 'POST' })
    const body = await response.text()
    if (response.status !== 200) {
      throw new HTTPError(response.status, response.statusText, `Failed to terminate backend: ${response.status} ${response.statusText} - ${body}`)
    }
  }

  streamStatus(backend: string, callback: (statusMessage: StatusV1) => void): StreamHandle {
    const statusUrl = `${this.url}/pub/b/${backend}/status-stream`
    const es = new EventSource(statusUrl)
    es.addEventListener('message', (e: MessageEvent) => {
      const val = JSON.parse(e.data) as PlaneStatusMessage
      const v1Status = translateStatusToV1(val.status)
      if (v1Status === null) return
      callback({
        state: v1Status,
        time: (new Date(val.time)).toISOString(),
        backend,
      })
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
    env?: Record<string, string>,
    gracePeriodSeconds?: number,
    lock?: string,
  ): Promise<SpawnResult | HTTPError> {
    const spawnUrl = `${this.url}/ctrl/connect`
    const spawnBody = {
      key: lock ? {
        name: lock,
        tag: image,
      } : undefined,
      spawn_config: {
        executable: { image, env },
        max_idle_seconds: gracePeriodSeconds,
      },
    }
    const response = await fetch(spawnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(spawnBody),
    })

    const body = await response.text()

    if (response.status !== 200) {
      return new HTTPError(response.status, response.statusText, `Failed to spawn backend: ${response.status} ${response.statusText} - ${body}`)
    }

    const bodyJson = JSON.parse(body) as PlaneConnectResponse
    return {
      name: bodyJson.backend_id,
      spawned: bodyJson.spawned,
      url: bodyJson.url,
      status_url: bodyJson.status_url,
      ready_url: '',
      status: bodyJson.status,
    }
  }
}

// Plane2 statuses: Scheduled, Loading, Starting, Waiting, Ready, Terminating, Terminated
// if this returns null, then ignore the status
function translateStatusToV1(plane2Status: string): string | null {
  switch (plane2Status) {
  case 'Scheduled':
  case 'Waiting':
  case 'Terminating':
    return null
  default:
    return plane2Status
  }
}

export function isV1StatusAlive(v1Status: string): boolean {
  return ['Loading', 'Starting', 'Ready'].includes(v1Status)
}

export function runPlane(): { url: string, process: ChildProcessWithoutNullStreams, containerName: string } {
  const containerName = `plane-quickstart-${Math.floor(Math.random() * 1_000_000)}`
  // NOTE: for now, plane quickstart MUST be run port 8080
  // and the cluster must be served on 9090 as these are
  // hardcoded in the quickstart image
  const process = spawn('docker', [
    'run',
    '-p',
    '8080:8080',
    '-p',
    '9090:9090',
    '--name',
    containerName,
    '-v',
    '/var/run/docker.sock:/var/run/docker.sock',
    PLANE_IMAGE,
  ])

  const url = 'http://localhost:8080'

  return { url, process, containerName }
}

export function ensurePlaneImage(): Promise<void> {
  const result = spawnSync('docker', ['image', 'inspect', PLANE_IMAGE])
  if (result.status === 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    console.log('Downloading plane/quickstart image...')
    const pullProcess = spawn('docker', ['pull', PLANE_IMAGE])
    pullProcess.stdout.on('data', data => {
      process.stdout.write(data)
    })
    pullProcess.stderr.on('data', data => {
      process.stdout.write(data)
    })
    pullProcess.on('exit', () => {
      if (pullProcess.exitCode === 0) {
        resolve()
      } else {
        reject()
      }
    })
  })
}
