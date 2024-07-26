import { eventStream, request, Headers, EventStreamReturn } from './request'
import type { JamsocketConfig } from './jamsocket-config'
import * as https from 'https'

enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Delete = 'DELETE'
}

export type CheckAuthResult = {
  status: 'ok';
  // account: string | null; // this is now deprecated
  accounts: string[];
  is_admin: boolean;
}

export type SpawnRequestBody = {
  env?: Record<string, string>; // env vars always map strings to strings
  grace_period_seconds?: number;
  lock?: string;
  service_environment?: string;
}

export type V1Status =
  | 'Loading'
  | 'Starting'
  | 'Ready'
  | 'Swept'
  | 'Exited'
  | 'Terminated'
  | 'Failed'
  | 'ErrorLoading'
  | 'ErrorStarting'
  | 'TimedOutBeforeReady'

export type V2Status =
  | 'scheduled'
  | 'loading'
  | 'starting'
  | 'waiting'
  | 'ready'
  | 'terminating'
  | 'hard-terminating'
  | 'terminated'

export type ConnectResourceLimits = {
  cpu_period?: number;
  // Proportion of period used by container (in microseconds)
  cpu_period_percent?: number;
  // Total cpu time allocated to container (in seconds)
  cpu_time_limit?: number;
  memory_limit_bytes?: number;
  disk_limit_bytes?: number;
}

export type JamsocketConnectRequestBody = {
  key?: string;
  spawn?: boolean | {
    tag?: string;
    lifetime_limit_seconds?: number;
    max_idle_seconds?: number;
    executable?: {
      mount?: string | boolean;
      env?: Record<string, string>;
      resource_limits?: ConnectResourceLimits;
    };
  };
  user?: string;
  auth?: Record<string, any>;
}

export type JamsocketConnectResponse = {
  backend_id: string;
  spawned: boolean;
  status: V2Status;
  token: string;
  url: string;
  secret_token?: string | null;
  status_url: string;
  ready_url: string;
}

// these are public messages that come over the status and status/stream endpoints
export type PlaneTerminationReason = 'swept' | 'external' | 'key_expired' | 'lost' | 'startup_timeout'
export type PlaneTerminationKind = 'soft' | 'hard'
export type PlaneV2StatusMessage =
  | { status: 'scheduled', time: number }
  | { status: 'loading', time: number }
  | { status: 'starting', time: number }
  | { status: 'waiting', time: number }
  | { status: 'ready', time: number }
  | { status: 'terminating', time: number, termination_reason: PlaneTerminationReason }
  | { status: 'hard-terminating', time: number, termination_reason: PlaneTerminationReason }
  | { status: 'terminated', time: number, termination_reason?: PlaneTerminationReason, termination_kind?: PlaneTerminationKind, exit_error?: boolean }

export type PlaneV2State =
  | { status: 'scheduled' }
  | { status: 'loading' }
  | { status: 'starting' }
  | { status: 'waiting', address?: string }
  | { status: 'ready', address?: string }
  | { status: 'terminating', last_status: V2Status, reason: PlaneTerminationReason }
  | { status: 'hard-terminating', last_status: V2Status, reason: PlaneTerminationReason }
  | { status: 'terminated', last_status: V2Status, reason: PlaneTerminationReason, termination: PlaneTerminationKind, exit_code?: number | null }

export type UpdateEnvironmentBody = {
  name?: string;
  image_tag?: string;
}

export interface ServiceImageResult {
  status: 'ok',
  imageName: string,
}

export interface ServiceListResult {
  services: Array<string>,
}

export interface ServiceCreateResult {
  status: 'ok',
}

export type Image = {
  repository: string,
  digest: string,
  tag: string,
  upload_time: string,
}

export interface ServiceImagesResult {
  images: Image[]
}

export interface Environment {
  name: string,
  image_tag: string,
  cluster: string,
  created_at: string,
  last_spawned_at: string | null,
}

export interface ServiceInfoResult {
  name: string,
  account_name: string,
  created_at: string,
  last_spawned_at: string | null,
  last_image_upload_time: string | null,
  last_image_digest: string | null,
  image_name: string,
  environments: Environment[],
}

export interface ServiceDeleteResult {
  status: 'ok'
}

export interface EnvironmentUpdateResult {
  status: 'ok'
}

export interface SpawnResult {
  url: string,
  name: string,
  ready_url: string,
  status_url: string,
  spawned: boolean,
  status: V1Status | null
}

export type BackendWithStatus = {
  name: string
  created_at: string
  service_name: string
  cluster_name: string
  account_name: string
  status?: V2Status
  status_timestamp?: string
  key?: string
}

export interface RunningBackendsResult {
  running_backends: BackendWithStatus[]
}

export interface TerminateResult {
  status: 'ok',
}

export interface BackendV2Status {
  value: PlaneV2State,
  timestamp: string
}

export interface BackendInfoResult {
  name: string
  created_at: string
  service_name: string
  cluster_name: string
  account_name: string
  statuses: BackendV2Status[]
  image_digest: string
  key?: string | null
  environment_name?: string | null
  max_mem_bytes?: number | null
}

export interface UserSessionRevokeResult {
  status: 'ok',
}

export interface CliLoginAttemptResult {
  token: string,
}

export interface CompleteCliLoginResult {
  uuid: string,
  user_id: string,
  user_agent: string
  created_at: string,
  expiration: string,
  token: string,
  user_is_admin?: boolean,
  user_email?: string,
}

export class HTTPError extends Error {
  constructor(public status: number, public code: string | null, message: string) {
    super(message)
    this.name = 'HTTPError'
  }
}

export const AUTH_ERROR_HTTP_CODES = new Set([401, 403, 407])
export class AuthenticationError extends HTTPError {
  constructor(public status: number, public code: string | null, message: string) {
    super(status, code, message)
    this.name = 'AuthenticationError'
  }
}

export class JamsocketApi {
  constructor(private apiBase: string, private options: https.RequestOptions = {}) {}

  public static fromEnvironment(): JamsocketApi {
    const override = process.env.JAMSOCKET_SERVER_API
    let apiBase
    if (override === undefined) {
      apiBase = 'https://api.jamsocket.com'
    } else {
      console.warn(`Using Jamsocket server override: ${override}`)
      apiBase = override
    }

    const allowInsecure = process.env.ALLOW_INSECURE === 'true'
    let rejectUnauthorized
    if (allowInsecure) {
      if (override === undefined) {
        console.warn('Insecure connections are only allowed when overriding the Jamsocket server. (Ignoring env var ALLOW_INSECURE)')
        rejectUnauthorized = true
      } else {
        console.warn('Allowing insecure connections. (Found env var ALLOW_INSECURE)')
        rejectUnauthorized = false
      }
    }

    return new JamsocketApi(apiBase, { rejectUnauthorized })
  }

  public getAppBaseUrl(): string {
    const hostname = new URL(this.apiBase).hostname
    const parts = hostname.split('.')
    if (parts[0] === 'api') {
      parts.shift()
    }
    const rootDomain = parts.join('.')
    return `https://app.${rootDomain}`
  }

  public getLoginUrl(loginToken: string): string {
    const baseUrl = this.getAppBaseUrl()
    return `${baseUrl}/cli-login/${loginToken}`
  }

  private async makeRequest<T>(endpoint: string, method: HttpMethod, body?: any, headers?: Headers, config?: JamsocketConfig): Promise<T> {
    const url = `${this.apiBase}${endpoint}`
    const user = config?.getUserEmail() ?? null
    if (user) {
      headers = { ...headers, 'X-Jamsocket-User': user }
    }
    const response = await request(url, body || null, { ...this.options, method, headers })

    const isJSONContentType = response.headers['content-type'] === 'application/json'
    let responseBody
    try {
      responseBody = JSON.parse(response.body)
    } catch {}
    const isValidJSON = isJSONContentType && responseBody !== undefined

    if (response.statusCode && response.statusCode >= 400) {
      if (isJSONContentType && isValidJSON) {
        const { message, status, code, id } = responseBody.error
        throw new HTTPError(response.statusCode, code, `jamsocket: ${status} - ${code}: ${message} (id: ${id})`)
      }
      throw new HTTPError(response.statusCode, null, `jamsocket: ${response.statusCode}: ${response.body}`)
    }

    if (!isJSONContentType) {
      throw new Error(`Unexpected content-type: ${response.headers['content-type']}. Url was: ${url}.`)
    }

    if (!isValidJSON) {
      throw new Error(`jamsocket: error parsing JSON response: "${response.body}". Url was: ${url}. Status was: ${response.statusCode}`)
    }

    return responseBody
  }

  private async makeAuthenticatedRequest<T>(endpoint: string, method: HttpMethod, configOrAuthToken: JamsocketConfig | string, body?: any): Promise<T> {
    let config: JamsocketConfig | undefined
    let authHeaders: Record<string, string> = {}
    if (typeof configOrAuthToken === 'string') {
      config = undefined
      authHeaders = { 'Authorization': `Bearer ${configOrAuthToken}` }
    } else {
      config = configOrAuthToken
      authHeaders = config.getAuthHeaders()
    }

    try {
      // NOTE: this await here is required so that all the Promise "callback" logic is wrapped in this try/catch
      return await this.makeRequest<T>(endpoint, method, body, authHeaders, config)
    } catch (error) {
      if (error instanceof HTTPError && AUTH_ERROR_HTTP_CODES.has(error.status)) throw new AuthenticationError(error.status, error.code, error.message)
      throw error
    }
  }

  private makeStreamRequest(endpoint: string, headers: Headers | null, callback: (line: string) => void, config?: JamsocketConfig): EventStreamReturn {
    const url = `${this.apiBase}${endpoint}`
    const user = config?.getUserEmail() ?? null
    if (user) {
      headers = { ...headers, 'X-Jamsocket-User': user }
    }
    return eventStream(url, {
      ...this.options,
      method: HttpMethod.Get,
      headers: { ...headers },
    }, callback)
  }

  private makeAuthenticatedStreamRequest(endpoint: string, config: JamsocketConfig, callback: (line: string) => void): EventStreamReturn {
    const authHeaders = config.getAuthHeaders()
    return this.makeStreamRequest(endpoint, authHeaders, callback, config)
  }

  public checkAuthToken(authToken: string): Promise<CheckAuthResult> {
    const url = '/auth'
    return this.makeAuthenticatedRequest<CheckAuthResult>(url, HttpMethod.Get, authToken)
  }

  public checkAuthConfig(config: JamsocketConfig): Promise<CheckAuthResult> {
    const url = '/auth'
    return this.makeAuthenticatedRequest<CheckAuthResult>(url, HttpMethod.Get, config)
  }

  public serviceImage(accountName: string, serviceName: string, config: JamsocketConfig): Promise<ServiceImageResult> {
    const url = `/v2/service/${accountName}/${serviceName}/image-name`
    return this.makeAuthenticatedRequest<ServiceImageResult>(url, HttpMethod.Get, config)
  }

  public serviceCreate(accountName: string, name: string, config: JamsocketConfig): Promise<ServiceCreateResult> {
    const url = `/v2/account/${accountName}/service`
    return this.makeAuthenticatedRequest<ServiceCreateResult>(url, HttpMethod.Post, config, {
      name,
    })
  }

  public serviceDelete(accountName: string, serviceName: string, config: JamsocketConfig): Promise<ServiceDeleteResult> {
    const url = `/v2/service/${accountName}/${serviceName}/delete`
    return this.makeAuthenticatedRequest<ServiceDeleteResult>(url, HttpMethod.Post, config)
  }

  public serviceInfo(accountName: string, serviceName: string, config: JamsocketConfig): Promise<ServiceInfoResult> {
    const url = `/v2/service/${accountName}/${serviceName}`
    return this.makeAuthenticatedRequest<ServiceInfoResult>(url, HttpMethod.Get, config)
  }

  public serviceList(accountName: string, config: JamsocketConfig): Promise<ServiceListResult> {
    const url = `/v2/account/${accountName}/services`
    return this.makeAuthenticatedRequest<ServiceListResult>(url, HttpMethod.Get, config)
  }

  public updateEnvironment(accountName: string, service: string, environment: string, config: JamsocketConfig, body: UpdateEnvironmentBody): Promise<EnvironmentUpdateResult> {
    const url = `/v2/service-env/${accountName}/${service}/${environment}/update`
    return this.makeAuthenticatedRequest<EnvironmentUpdateResult>(url, HttpMethod.Post, config, body)
  }

  public spawn(accountName: string, serviceName: string, config: JamsocketConfig, body: SpawnRequestBody): Promise<SpawnResult> {
    const url = `/v1/user/${accountName}/service/${serviceName}/spawn`
    return this.makeAuthenticatedRequest<SpawnResult>(url, HttpMethod.Post, config, body)
  }

  public listRunningBackends(accountName: string, config: JamsocketConfig): Promise<RunningBackendsResult> {
    const url = `/v2/account/${accountName}/backends`
    return this.makeAuthenticatedRequest<RunningBackendsResult>(url, HttpMethod.Get, config)
  }

  public imagesList(accountName: string, serviceName: string, config: JamsocketConfig): Promise<ServiceImagesResult> {
    const url = `/v2/service/${accountName}/${serviceName}/images`
    return this.makeAuthenticatedRequest<ServiceImagesResult>(url, HttpMethod.Get, config)
  }

  public streamLogs(backend: string, config: JamsocketConfig, callback: (line: string) => void): EventStreamReturn {
    const url = `/v2/backend/${backend}/logs`
    return this.makeAuthenticatedStreamRequest(url, config, callback)
  }

  public streamMetrics(backend: string, config: JamsocketConfig, callback: (line: string) => void): EventStreamReturn {
    const url = `/v2/backend/${backend}/metrics/stream`
    return this.makeAuthenticatedStreamRequest(url, config, callback)
  }

  public streamStatus(backend: string, callback: (statusMessage: PlaneV2StatusMessage) => void, config?: JamsocketConfig): EventStreamReturn {
    const url = `/v2/backend/${backend}/status/stream`
    const wrappedCallback = (line: string) => {
      const val = JSON.parse(line)
      callback(val)
    }
    return this.makeStreamRequest(url, null, wrappedCallback, config)
  }

  public async status(backend: string, config?: JamsocketConfig): Promise<PlaneV2StatusMessage> {
    const url = `/v2/backend/${backend}/status`
    return this.makeRequest<PlaneV2StatusMessage>(url, HttpMethod.Get, undefined, undefined, config)
  }

  public async terminate(backend: string, hard: boolean, config: JamsocketConfig): Promise<TerminateResult> {
    const url = `/v2/backend/${backend}/terminate`
    return this.makeAuthenticatedRequest<TerminateResult>(url, HttpMethod.Post, config, { hard })
  }

  public async backendInfo(backend: string, config: JamsocketConfig): Promise<BackendInfoResult> {
    const url = `/v2/backend/${backend}`
    return this.makeAuthenticatedRequest<BackendInfoResult>(url, HttpMethod.Get, config)
  }

  public async startLoginAttempt(): Promise<CliLoginAttemptResult> {
    const url = '/cli-login'
    return this.makeRequest<CliLoginAttemptResult>(url, HttpMethod.Post, {})
  }

  public async completeLoginAttempt(token: string, code: string): Promise<CompleteCliLoginResult> {
    const url = `/cli-login/${token}/complete`
    return this.makeRequest<CompleteCliLoginResult>(url, HttpMethod.Post, { code })
  }

  public async revokeUserSession(userSessionId: string, config: JamsocketConfig): Promise<UserSessionRevokeResult> {
    const url = `/user-session/${userSessionId}/delete`
    return this.makeAuthenticatedRequest<UserSessionRevokeResult>(url, HttpMethod.Post, config)
  }

  public streamLoginStatus(loginToken: string): Promise<boolean> {
    const endpoint = `/cli-login/${loginToken}/status/stream`
    const url = `${this.apiBase}${endpoint}`
    // right now, this stream only returns a single message and then closes
    return new Promise(resolve => {
      const stream = eventStream(url, {
        ...this.options,
        method: HttpMethod.Get,
      }, (line: string) => {
        const val = JSON.parse(line)
        resolve(val.status === 'ok')
        stream.close()
      })
    })
  }
}
