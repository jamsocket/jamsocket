import 'isomorphic-fetch' // fetch polyfill for older versions of Node
import type { ConnectRequest, ConnectResponse } from '@jamsocket/types'
export type {
  BackendStatus,
  TerminationKind,
  TerminationReason,
  BackendState,
  ConnectResponse,
  ConnectRequest,
} from '@jamsocket/types'

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

export class Jamsocket {
  account: string
  service: string
  token: string
  apiUrl: string

  constructor(opts: JamsocketInitOptions) {
    if (isJamsocketDevInitOptions(opts)) {
      this.account = '-'
      this.token = '-'
      this.service = '-'
      const port = opts.port ? validatePort(opts.port) : JAMSOCKET_DEV_PORT
      this.apiUrl = `http://localhost:${port}`
    } else {
      this.account = opts.account
      this.token = opts.token
      this.service = opts.service
      this.apiUrl = opts.apiUrl || JAMSOCKET_API
    }
  }

  async connect(connectRequest?: ConnectRequest): Promise<ConnectResponse> {
    const response = await fetch(
      `${this.apiUrl}/v2/service/${this.account}/${this.service}/connect`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(connectRequest || {}),
        cache: 'no-store',
      },
    )
    const bodyText = await response.text()
    if (!response.ok) {
      if (response.status === 429) {
        console.warn(
          "You've hit the spawn rate limit. This may be because you've spawned too many session backends in a short period of time or you're already running the maximum number of concurrent session backends. (related: https://docs.jamsocket.com/pricing/free-tier-limits)",
        )
      }
      throw new Error(`Error spawning backend: ${response.status} ${bodyText}`)
    }
    try {
      return JSON.parse(bodyText) as ConnectResponse
    } catch (e) {
      throw new Error(`Error parsing connect response: ${bodyText}`)
    }
  }
}
