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
  status: string,
  imageName: string,
}

export interface ServiceListResult {
  services: Array<string>,
}

export interface ServiceCreateResult {
  status: string,
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
  status: string,
}

export class HTTPError extends Error {
  constructor(public code: number, message: string) {
    super(message)
    this.name = 'HTTPError'
  }
}

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
      // Will switch back to https://jamsocket.dev once we complete the migration to Jamsocket's version p2
      apiBase = 'https://new.jamsocket.dev'
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
    return `https://app.${hostname}/cli-login`
  }

  private async makeRequest<T>(endpoint: string, method: HttpMethod, body?: any, headers?: Headers): Promise<T> {
    const url = `${this.apiBase}${endpoint}`
    const response = await request(url, body || null, { ...this.options, method, headers })

    const isJSONContentType = response.headers['content-type'] === 'application/json'
    let responseBody
    try {
      responseBody = JSON.parse(response.body)
      // TODO: add a runtime check here to make sure the response matches the type T
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
      return this.makeRequest<T>(endpoint, method, body, additionalHeaders)
    } catch (error) {
      if (error instanceof HTTPError && error.code < 500) throw new AuthenticationError(error.code, error.message)
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
    const url = '/api/auth'
    return this.makeAuthenticatedRequest<CheckAuthResult>(url, HttpMethod.Get, apiToken)
  }

  public serviceImage(username: string, serviceName: string, apiToken: string): Promise<ServiceImageResult> {
    const url = `/api/user/${username}/service/${serviceName}/image`
    return this.makeAuthenticatedRequest<ServiceImageResult>(url, HttpMethod.Get, apiToken)
  }

  public serviceCreate(username: string, name: string, apiToken: string): Promise<ServiceCreateResult> {
    const url = `/api/user/${username}/service`
    return this.makeAuthenticatedRequest<ServiceCreateResult>(url, HttpMethod.Post, apiToken, {
      name,
    })
  }

  public serviceList(username: string, apiToken: string): Promise<ServiceListResult> {
    const url = `/api/user/${username}/services`
    return this.makeAuthenticatedRequest<ServiceListResult>(url, HttpMethod.Get, apiToken)
  }

  public spawn(username: string, serviceName: string, apiToken: string, body: SpawnRequestBody): Promise<SpawnResult> {
    const url = `/api/user/${username}/service/${serviceName}/spawn`
    return this.makeAuthenticatedRequest<SpawnResult>(url, HttpMethod.Post, apiToken, body)
  }

  public streamLogs(backend: string, apiToken: string, callback: (line: string) => void): Promise<void> {
    const url = `/api/backend/${backend}/logs`
    return this.makeAuthenticatedStreamRequest(url, apiToken, callback)
  }

  public streamStatus(backend: string, apiToken: string, callback: (statusMessage: StatusMessage) => void): Promise<void> {
    const url = `/api/backend/${backend}/status/stream`
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
    const url = `/api/backend/${backend}/status`
    return this.makeAuthenticatedRequest<StatusMessage>(url, HttpMethod.Get, apiToken)
  }

  public async spawnTokenCreate(username: string, serviceName: string, apiToken: string, body: SpawnTokenRequestBody): Promise<SpawnTokenCreateResult> {
    const url = `/api/user/${username}/service/${serviceName}/token`
    return this.makeAuthenticatedRequest<SpawnTokenCreateResult>(url, HttpMethod.Post, apiToken, body)
  }

  public async spawnTokenRevoke(spawnToken: string, apiToken: string): Promise<SpawnTokenRevokeResult> {
    const url = `/api/token/${spawnToken}`
    return this.makeAuthenticatedRequest<SpawnTokenRevokeResult>(url, HttpMethod.Delete, apiToken)
  }

  public async spawnTokenSpawn(spawnToken: string): Promise<SpawnResult> {
    const url = `/api/token/${spawnToken}/spawn`
    return this.makeRequest<SpawnResult>(url, HttpMethod.Post, {})
  }
}
