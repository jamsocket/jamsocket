import 'server-only'
import 'isomorphic-fetch' // fetch polyfill for older versions of Node
import { SpawnResult } from './types'

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
  requireBearerToken?: boolean
}

type JamsocketApiSpawnBody = {
  tag?: string
  lock?: string
  env?: Record<string, string>
  grace_period_seconds?: number
  require_bearer_token?: boolean
  port?: number
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

export function init(opts: JamsocketInitOptions) {
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

  return async function spawn(spawnOpts: JamsocketSpawnOptions = {}): Promise<SpawnResult> {
    const reqBody: JamsocketApiSpawnBody = {}
    if (spawnOpts.lock) reqBody.lock = spawnOpts.lock
    if (spawnOpts.tag) reqBody.tag = spawnOpts.tag
    if (spawnOpts.env) reqBody.env = spawnOpts.env
    if (spawnOpts.gracePeriodSeconds) reqBody.grace_period_seconds = spawnOpts.gracePeriodSeconds
    if (spawnOpts.requireBearerToken) reqBody.require_bearer_token = spawnOpts.requireBearerToken

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
      bearerToken: body.bearer_token,
    }
  }
}
