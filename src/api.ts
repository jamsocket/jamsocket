import { eventStream, request, Headers, EventStreamReturn } from './request'
import * as https from 'https'

enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Delete = 'DELETE'
}

export type CheckAuthResult = {
  status: 'ok';
  account: string | null;
  accounts: string[];
}

export type SpawnRequestBody = {
  env?: Record<string, string>; // env vars always map strings to strings
  grace_period_seconds?: number;
  port?: number;
  tag?: string;
  require_bearer_token?: boolean;
  lock?: string;
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

export interface ServiceInfoResult {
  name: string,
  account_name: string,
  created_at: string,
  last_spawned_at: string | null,
  last_image_upload_time: string | null,
  last_image_tag: string | null,
  spawn_tokens_count: number,
}

export interface ServiceDeleteResult {
  status: 'ok'
}

export interface SpawnResult {
  url: string,
  name: string,
  ready_url: string,
  status_url: string,
  bearer_token?: string,
  spawned: boolean,
  status: string | null
}

export type BackendWithStatus = {
  name: string
  created_at: string
  service_name: string
  cluster_name: string
  account_name: string
  status?: string
  status_timestamp?: string
}

export interface RunningBackendsResult {
  running_backends: BackendWithStatus[]
}

export interface TerminateResult {
  status: 'ok',
}

export interface BackendStatus {
  value: string
  timestamp: string
}

export interface BackendInfoResult {
  name: string
  created_at: string
  service_name: string
  cluster_name: string
  account_name: string
  statuses: BackendStatus[]
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

export interface StatusMessage {
  state: string,
  time: Date,
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

  private async makeRequest<T>(endpoint: string, method: HttpMethod, body?: any, headers?: Headers): Promise<T> {
    const url = `${this.apiBase}${endpoint}`
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

  private async makeAuthenticatedRequest<T>(endpoint: string, method: HttpMethod, authToken: string, body?: any): Promise<T> {
    const additionalHeaders = { 'Authorization': `Bearer ${authToken}` }
    try {
      // NOTE: this await here is required so that all the Promise "callback" logic is wrapped in this try/catch
      return await this.makeRequest<T>(endpoint, method, body, additionalHeaders)
    } catch (error) {
      if (error instanceof HTTPError && AUTH_ERROR_HTTP_CODES.has(error.status)) throw new AuthenticationError(error.status, error.code, error.message)
      throw error
    }
  }

  private makeAuthenticatedStreamRequest(endpoint: string, authToken: string, callback: (line: string) => void): EventStreamReturn {
    const url = `${this.apiBase}${endpoint}`
    return eventStream(url, {
      ...this.options,
      method: HttpMethod.Get,
      headers: { 'Authorization': `Bearer ${authToken}` },
    }, callback)
  }

  public checkAuth(authToken: string): Promise<CheckAuthResult> {
    const url = '/auth'
    return this.makeAuthenticatedRequest<CheckAuthResult>(url, HttpMethod.Get, authToken)
  }

  public serviceImage(username: string, serviceName: string, authToken: string): Promise<ServiceImageResult> {
    const url = `/user/${username}/service/${serviceName}/image`
    return this.makeAuthenticatedRequest<ServiceImageResult>(url, HttpMethod.Get, authToken)
  }

  public serviceCreate(username: string, name: string, authToken: string): Promise<ServiceCreateResult> {
    const url = `/user/${username}/service`
    return this.makeAuthenticatedRequest<ServiceCreateResult>(url, HttpMethod.Post, authToken, {
      name,
    })
  }

  public serviceDelete(username: string, serviceName: string, authToken: string): Promise<ServiceDeleteResult> {
    const url = `/user/${username}/service/${serviceName}/delete`
    return this.makeAuthenticatedRequest<ServiceDeleteResult>(url, HttpMethod.Post, authToken)
  }

  public serviceInfo(username: string, serviceName: string, authToken: string): Promise<ServiceInfoResult> {
    const url = `/user/${username}/service/${serviceName}`
    return this.makeAuthenticatedRequest<ServiceInfoResult>(url, HttpMethod.Get, authToken)
  }

  public serviceList(username: string, authToken: string): Promise<ServiceListResult> {
    const url = `/user/${username}/services`
    return this.makeAuthenticatedRequest<ServiceListResult>(url, HttpMethod.Get, authToken)
  }

  public spawn(username: string, serviceName: string, authToken: string, body: SpawnRequestBody): Promise<SpawnResult> {
    const url = `/user/${username}/service/${serviceName}/spawn`
    return this.makeAuthenticatedRequest<SpawnResult>(url, HttpMethod.Post, authToken, body)
  }

  public listRunningBackends(username: string, authToken: string): Promise<RunningBackendsResult> {
    const url = `/user/${username}/backends`
    return this.makeAuthenticatedRequest<RunningBackendsResult>(url, HttpMethod.Get, authToken)
  }

  public streamLogs(backend: string, authToken: string, callback: (line: string) => void): EventStreamReturn {
    const url = `/backend/${backend}/logs`
    return this.makeAuthenticatedStreamRequest(url, authToken, callback)
  }

  public streamMetrics(backend: string, authToken: string, callback: (line: string) => void): EventStreamReturn {
    const url = `/backend/${backend}/metrics/stream`
    return this.makeAuthenticatedStreamRequest(url, authToken, callback)
  }

  public streamStatus(backend: string, authToken: string, callback: (statusMessage: StatusMessage) => void): EventStreamReturn {
    const url = `/backend/${backend}/status/stream`
    const wrappedCallback = (line: string) => {
      const val = JSON.parse(line)
      callback({
        state: val.state,
        time: new Date(val.time),
      })
    }
    return this.makeAuthenticatedStreamRequest(url, authToken, wrappedCallback)
  }

  public async status(backend: string, authToken: string): Promise<StatusMessage> {
    const url = `/backend/${backend}/status`
    return this.makeAuthenticatedRequest<StatusMessage>(url, HttpMethod.Get, authToken)
  }

  public async terminate(backend: string, authToken: string): Promise<TerminateResult> {
    const url = `/backend/${backend}/terminate`
    return this.makeAuthenticatedRequest<TerminateResult>(url, HttpMethod.Post, authToken)
  }

  public async backendInfo(backend: string, authToken: string): Promise<BackendInfoResult> {
    const url = `/backend/${backend}`
    return this.makeAuthenticatedRequest<BackendInfoResult>(url, HttpMethod.Get, authToken)
  }

  public async startLoginAttempt(): Promise<CliLoginAttemptResult> {
    const url = '/cli_login'
    return this.makeRequest<CliLoginAttemptResult>(url, HttpMethod.Post, {})
  }

  public async completeLoginAttempt(token: string, code: string): Promise<CompleteCliLoginResult> {
    const url = `/cli_login/${token}/complete`
    return this.makeRequest<CompleteCliLoginResult>(url, HttpMethod.Post, { code })
  }

  public async revokeUserSession(userSessionId: string, authToken: string): Promise<UserSessionRevokeResult> {
    const url = `/user_session/${userSessionId}`
    return this.makeAuthenticatedRequest<UserSessionRevokeResult>(url, HttpMethod.Delete, authToken)
  }

  public streamLoginStatus(loginToken: string): Promise<boolean> {
    const endpoint = `/cli_login/${loginToken}/status/stream`
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
