export type BackendStatus =
  | 'scheduled'
  | 'loading'
  | 'starting'
  | 'waiting'
  | 'ready'
  | 'terminating'
  | 'hard-terminating'
  | 'terminated'

export type TerminationKind = 'soft' | 'hard'
export type TerminationReason =
  | 'swept'
  | 'external'
  | 'key_expired'
  | 'lost'
  | 'startup_timeout'
  | 'internal_error'

export type BackendState =
  | { status: 'scheduled'; time: string }
  | { status: 'loading'; time: string }
  | { status: 'starting'; time: string }
  | { status: 'waiting'; time: string }
  | { status: 'ready'; time: string }
  | { status: 'terminating'; time: string; termination_reason: TerminationReason }
  | { status: 'hard-terminating'; time: string; termination_reason: TerminationReason }
  | {
      status: 'terminated'
      time: string
      termination_reason?: TerminationReason | null
      termination_kind?: TerminationKind | null
      exit_error?: boolean | null
    }

export type ConnectResponse = {
  backend_id: string
  spawned: boolean
  status: BackendStatus
  token: string
  url: string
  secret_token?: string | null
  status_url: string
  ready_url: string
}

export type ConnectRequest = {
  key?: string
  spawn?:
    | boolean
    | {
        tag?: string
        cluster?: string
        lifetime_limit_seconds?: number
        max_idle_seconds?: number
        executable?: {
          mount?: string | boolean
          env?: Record<string, string>
          resource_limits?: {
            // The CPU period (in microseconds), defaults to 100_000 (100ms)
            cpu_period?: number
            // Proportion of period the container is allowed to use (in percent, e.g. 100 = 100%)
            cpu_period_percent?: number
            // Total cpu time allocated to container (in seconds)
            cpu_time_limit?: number
            memory_limit_bytes?: number
            disk_limit_bytes?: number
          }
        }
      }
  user?: string
  auth?: Record<string, any>
}

export function isConnectResponse(msg: any): msg is ConnectResponse {
  if (typeof msg !== 'object') return false
  if (typeof msg.backend_id !== 'string') return false
  if (typeof msg.spawned !== 'boolean') return false
  if (typeof msg.status !== 'string') return false
  if (typeof msg.token !== 'string') return false
  if (typeof msg.url !== 'string') return false
  if (typeof msg.status_url !== 'string') return false
  return true
}

export function isBackendState(msg: any): msg is BackendState {
  if (typeof msg !== 'object') return false
  if (typeof msg.status !== 'string') return false
  if (typeof msg.time !== 'string') return false
  if (
    msg.status === 'terminating' ||
    msg.status === 'hard-terminating' ||
    msg.termination_reason !== undefined
  ) {
    if (typeof msg.termination_reason !== 'string') return false
  }
  if (msg.termination_kind !== undefined && typeof msg.termination_kind !== 'string') return false
  if (msg.exit_error !== undefined && typeof msg.exit_error !== 'boolean') return false
  return true
}

export class HTTPError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message)
    this.name = 'HTTPError'
  }
}
