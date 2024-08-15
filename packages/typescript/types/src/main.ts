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
        lifetime_limit_seconds?: number
        max_idle_seconds?: number
        executable?: {
          mount?: string | boolean
          env?: Record<string, string>
          resource_limits?: {
            cpu_period?: number
            // Proportion of period used by container (in microseconds)
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
