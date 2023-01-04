import { eventStream, request, Headers } from './request'
import * as https from 'https'

enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Delete = 'DELETE'
}

export type CheckAuthResult = {
  status: 'ok';
  account: string;
}

export type SpawnRequestBody = {
  env?: Record<string, string>; // env vars always map strings to strings
  grace_period_seconds?: number;
  port?: number;
  tag?: string;
}

export type SpawnTokenRequestBody = {
  grace_period_seconds?: number;
  port?: number;
  tag?: string;
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
  ready_url?: string,
  status_url?: string,
}

export interface SpawnTokenCreateResult {
  token: string,
}

export interface SpawnTokenRevokeResult {
  status: 'ok',
}

export interface TerminateResult {
  status: 'ok',
}

export class HTTPError extends Error {
  constructor(public code: number, message: string) {
    super(message)
    this.name = 'HTTPError'
  }
}

const AUTH_ERROR_HTTP_CODES = new Set([401, 403, 407])
export class AuthenticationError extends HTTPError {
  constructor(public code: number, message: string) {
    super(code, message)
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

  public getLoginUrl(): string {
    const hostname = new URL(this.apiBase).hostname
    const parts = hostname.split('.')
    if (parts[0] === 'api') {
      parts.shift()
    }
    const rootDomain = parts.join('.')
    return `https://app.${rootDomain}/cli-login`
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
        throw new HTTPError(response.statusCode, `jamsocket: ${status} - ${code}: ${message} (id: ${id})`)
      }
      throw new HTTPError(response.statusCode, `jamsocket: ${response.statusCode}: ${response.body}`)
    }

    if (!isJSONContentType) {
      throw new Error(`Unexpected content-type: ${response.headers['content-type']}. Url was: ${url}.`)
    }

    if (!isValidJSON) {
      throw new Error(`jamsocket: error parsing JSON response: "${response.body}". Url was: ${url}. Status was: ${response.statusCode}`)
    }

    return responseBody
  }

  private async makeAuthenticatedRequest<T>(endpoint: string, method: HttpMethod, apiToken: string, body?: any): Promise<T> {
    const additionalHeaders = { 'Authorization': `Bearer ${apiToken}` }
    try {
      // NOTE: this await here is required so that all the Promise "callback" logic is wrapped in this try/catch
      return await this.makeRequest<T>(endpoint, method, body, additionalHeaders)
    } catch (error) {
      if (error instanceof HTTPError && AUTH_ERROR_HTTP_CODES.has(error.code)) throw new AuthenticationError(error.code, error.message)
      throw error
    }
  }

  private async makeAuthenticatedStreamRequest(endpoint: string, apiToken: string, callback: (line: string) => void): Promise<void> {
    const url = `${this.apiBase}${endpoint}`
    return eventStream(url, {
      ...this.options,
      method: HttpMethod.Get,
      headers: { 'Authorization': `Bearer ${apiToken}` },
    }, callback)
  }

  public checkAuth(apiToken: string): Promise<CheckAuthResult> {
    const url = '/auth'
    return this.makeAuthenticatedRequest<CheckAuthResult>(url, HttpMethod.Get, apiToken)
  }

  public serviceImage(username: string, serviceName: string, apiToken: string): Promise<ServiceImageResult> {
    const url = `/user/${username}/service/${serviceName}/image`
    return this.makeAuthenticatedRequest<ServiceImageResult>(url, HttpMethod.Get, apiToken)
  }

  public serviceCreate(username: string, name: string, apiToken: string): Promise<ServiceCreateResult> {
    const url = `/user/${username}/service`
    return this.makeAuthenticatedRequest<ServiceCreateResult>(url, HttpMethod.Post, apiToken, {
      name,
    })
  }

  public serviceDelete(username: string, serviceName: string, apiToken: string): Promise<ServiceDeleteResult> {
    const url = `/user/${username}/service/${serviceName}/delete`
    return this.makeAuthenticatedRequest<ServiceDeleteResult>(url, HttpMethod.Post, apiToken)
  }

  public serviceInfo(username: string, serviceName: string, apiToken: string): Promise<ServiceInfoResult> {
    const url = `/user/${username}/service/${serviceName}`
    return this.makeAuthenticatedRequest<ServiceInfoResult>(url, HttpMethod.Get, apiToken)
  }

  public serviceList(username: string, apiToken: string): Promise<ServiceListResult> {
    const url = `/user/${username}/services`
    return this.makeAuthenticatedRequest<ServiceListResult>(url, HttpMethod.Get, apiToken)
  }

  public spawn(username: string, serviceName: string, apiToken: string, body: SpawnRequestBody): Promise<SpawnResult> {
    const url = `/user/${username}/service/${serviceName}/spawn`
    return this.makeAuthenticatedRequest<SpawnResult>(url, HttpMethod.Post, apiToken, body)
  }

  public streamLogs(backend: string, apiToken: string, callback: (line: string) => void): Promise<void> {
    const url = `/backend/${backend}/logs`
    return this.makeAuthenticatedStreamRequest(url, apiToken, callback)
  }

  public streamStatus(backend: string, apiToken: string, callback: (statusMessage: StatusMessage) => void): Promise<void> {
    const url = `/backend/${backend}/status/stream`
    const wrappedCallback = (line: string) => {
      const val = JSON.parse(line)
      callback({
        state: val.state,
        time: new Date(val.time),
      })
    }
    return this.makeAuthenticatedStreamRequest(url, apiToken, wrappedCallback)
  }

  public async status(backend: string, apiToken: string): Promise<StatusMessage> {
    const url = `/backend/${backend}/status`
    return this.makeAuthenticatedRequest<StatusMessage>(url, HttpMethod.Get, apiToken)
  }

  public async terminate(backend: string, apiToken: string): Promise<TerminateResult> {
    const url = `/backend/${backend}/terminate`
    return this.makeAuthenticatedRequest<TerminateResult>(url, HttpMethod.Post, apiToken)
  }

  public async spawnTokenCreate(username: string, serviceName: string, apiToken: string, body: SpawnTokenRequestBody): Promise<SpawnTokenCreateResult> {
    const url = `/user/${username}/service/${serviceName}/token`
    return this.makeAuthenticatedRequest<SpawnTokenCreateResult>(url, HttpMethod.Post, apiToken, body)
  }

  public async spawnTokenRevoke(spawnToken: string, apiToken: string): Promise<SpawnTokenRevokeResult> {
    const url = `/token/${spawnToken}`
    return this.makeAuthenticatedRequest<SpawnTokenRevokeResult>(url, HttpMethod.Delete, apiToken)
  }

  public async spawnTokenSpawn(spawnToken: string): Promise<SpawnResult> {
    const url = `/token/${spawnToken}/spawn`
    return this.makeRequest<SpawnResult>(url, HttpMethod.Post, {})
  }
}
