import { eventStream, request, Headers } from './request'

enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Delete = 'DELETE'
}

export type SpawnRequestBody = {
  env?: Record<string, string>; // env vars always map strings to strings
  grace_period_seconds?: number;
  port?: number;
  tag?: string;
}

export type TokenRequestBody = {
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
  readyUrl?: string,
  statusUrl?: string,
}

export interface TokenCreateResult {
  token: string,
}

export interface TokenRevokeResult {
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

export class JamsocketApi {
  constructor(private apiBase: string) {}

  public static fromEnvironment(): JamsocketApi {
    const override = process.env.JAMSOCKET_SERVER_API
    let apiBase
    if (override === undefined) {
      apiBase = 'https://jamsocket.dev'
    } else {
      console.warn(`Using Jamsocket server override: ${override}`)
      apiBase = override
    }

    return new JamsocketApi(apiBase)
  }

  private async makeRequest(endpoint: string, method: HttpMethod, body?: any, headers?: Headers): Promise<any> {
    const url = `${this.apiBase}${endpoint}`
    const response = await request(url, body || null, { method, headers })

    if (response.headers['content-type'] !== 'application/json') {
      throw new Error(`Unexpected code from server, HTTP ${response.statusCode}. Url was: ${url}.`)
    }

    let responseBody
    try {
      responseBody = JSON.parse(response.body)
    } catch (error) {
      throw new Error(`jamsocket: error parsing JSON response - ${error}: "${response.body}". Url was: ${url}. Status was: ${response.statusCode}`)
    }

    if (response.statusCode && response.statusCode >= 400) {
      const { message, status, code, id } = responseBody.error
      throw new HTTPError(response.statusCode, `jamsocket: ${status} - ${code}: ${message} (id: ${id})`)
    }

    return responseBody
  }

  private async makeAuthenticatedRequest(endpoint: string, method: HttpMethod, auth: string, body?: any): Promise<any> {
    const additionalHeaders = { 'Authorization': `Basic ${auth}` }
    try {
      return this.makeRequest(endpoint, method, body, additionalHeaders)
    } catch (error) {
      if (error instanceof HTTPError && error.code < 500) throw new AuthenticationError(error.code, error.message)
    }
  }

  private async makeAuthenticatedStreamRequest(endpoint: string, auth: string, callback: (line: string) => void): Promise<void> {
    const url = `${this.apiBase}${endpoint}`
    return eventStream(url, {
      method: HttpMethod.Get,
      headers: { 'Authorization': `Basic ${auth}` },
    }, callback)
  }

  public checkAuth(auth: string): Promise<any> {
    const url = '/api/auth'
    return this.makeAuthenticatedRequest(url, HttpMethod.Get, auth)
  }

  public serviceImage(username: string, serviceName: string, auth: string): Promise<ServiceImageResult> {
    const url = `/api/user/${username}/service/${serviceName}/image`
    return this.makeAuthenticatedRequest(url, HttpMethod.Get, auth)
  }

  public serviceCreate(username: string, name: string, auth: string): Promise<ServiceCreateResult> {
    const url = `/api/user/${username}/service`
    return this.makeAuthenticatedRequest(url, HttpMethod.Post, auth, {
      name,
    })
  }

  public serviceList(username: string, auth: string): Promise<ServiceListResult> {
    const url = `/api/user/${username}/services`
    return this.makeAuthenticatedRequest(url, HttpMethod.Get, auth)
  }

  public spawn(username: string, serviceName: string, auth: string, body: SpawnRequestBody): Promise<SpawnResult> {
    const url = `/api/user/${username}/service/${serviceName}/spawn`
    return this.makeAuthenticatedRequest(url, HttpMethod.Post, auth, body)
  }

  public streamLogs(backend: string, auth: string, callback: (line: string) => void): Promise<void> {
    const url = `/api/backend/${backend}/logs`
    return this.makeAuthenticatedStreamRequest(url, auth, callback)
  }

  public async tokenCreate(username: string, serviceName: string, auth: string, body: TokenRequestBody): Promise<TokenCreateResult> {
    const url = `/api/user/${username}/service/${serviceName}/token`
    return this.makeAuthenticatedRequest(url, HttpMethod.Post, auth, body)
  }

  public async tokenRevoke(token: string, auth: string): Promise<TokenRevokeResult> {
    const url = `/api/token/${token}`
    return this.makeAuthenticatedRequest(url, HttpMethod.Delete, auth)
  }

  public async tokenSpawn(token: string): Promise<SpawnResult> {
    const url = `/api/token/${token}/spawn`
    return this.makeRequest(url, HttpMethod.Post, {})
  }
}
