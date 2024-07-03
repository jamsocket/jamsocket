import 'isomorphic-fetch' // fetch polyfill for older versions of Node

export type SpawnResult = {
  url: string
  name: string
  readyUrl: string
  statusUrl: string
  spawned: boolean
  status: string
}

export type JamsocketDevInitOptions = {
  dev: true
  port?: number
}

export type JamsocketInitOptions =
  | {
      account: string
      token: string
      service: string
      apiUrl?: string
    }
  | JamsocketDevInitOptions

export type JamsocketSpawnOptions = {
  tag?: string
  lock?: string
  env?: Record<string, string>
  gracePeriodSeconds?: number
  serviceEnvironment?: string
}

type JamsocketApiSpawnBody = {
  tag?: string
  lock?: string
  env?: Record<string, string>
  grace_period_seconds?: number
  service_environment?: string
}

const JAMSOCKET_DEV_PORT = 8080
const JAMSOCKET_API = 'https://api.jamsocket.com'

function isJamsocketDevInitOptions(opts: any): opts is JamsocketDevInitOptions {
  return opts.dev === true
}

function validatePort(port: any): number {
  if (!Number.isInteger(port)) {
    throw new Error(`Jamsocket dev port must be an integer, got ${typeof port}`)
  }
  return port
}

export type JamsocketInstance = {
  /**
   * @deprecated Calling a `JamsocketInstance` as a function is deprecated. Use the `spawn` method instead.
   */
  (opts: JamsocketSpawnOptions): Promise<SpawnResult>
  spawn(opts: JamsocketSpawnOptions): Promise<SpawnResult>
}

export function init(opts: JamsocketInitOptions): JamsocketInstance {
  let account: string
  let token: string
  let service: string
  let apiUrl: string

  if (isJamsocketDevInitOptions(opts)) {
    account = '-'
    token = '-'
    service = '-'
    const port = opts.port ? validatePort(opts.port) : JAMSOCKET_DEV_PORT
    apiUrl = `http://localhost:${port}`
  } else {
    account = opts.account
    token = opts.token
    service = opts.service
    apiUrl = opts.apiUrl || JAMSOCKET_API
  }

  const spawnInner = async function (spawnOpts: JamsocketSpawnOptions = {}): Promise<SpawnResult> {
    const reqBody: JamsocketApiSpawnBody = {}
    if (spawnOpts.tag) reqBody.tag = spawnOpts.tag
    if (spawnOpts.lock) reqBody.lock = spawnOpts.lock
    if (spawnOpts.env) reqBody.env = spawnOpts.env
    if (spawnOpts.gracePeriodSeconds) reqBody.grace_period_seconds = spawnOpts.gracePeriodSeconds
    if (spawnOpts.serviceEnvironment) reqBody.service_environment = spawnOpts.serviceEnvironment

    const response = await fetch(`${apiUrl}/user/${account}/service/${service}/spawn`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error(`Error spawning backend: ${response.status} ${await response.text()}`)
    }
    const body = await response.json()
    return {
      url: body.url,
      name: body.name,
      readyUrl: body.ready_url,
      statusUrl: body.status_url,
      spawned: body.spawned,
      status: body.status,
    }
  }

  const spawn = async function (spawnOpts: JamsocketSpawnOptions = {}): Promise<SpawnResult> {
    console.warn(
      'Calling the result of Jamsocket.init(...)() directly is deprecated, call Jamsocket.init().spawn(...) instead.',
    )
    return spawnInner(spawnOpts)
  }

  spawn.spawn = spawnInner
  return spawn
}

export default { init }
