import { eventStream, request, Headers } from './request'

enum HttpMethod {
    Get = 'GET',
    Post = 'POST',
}

export type SpawnRequestBody = {
    env?: Record<string, string>; // env vars always map strings to strings
    // eslint-disable-next-line camelcase
    grace_period_seconds?: number;
    port?: number;
    tag?: string;
}

export type TokenRequestBody = {
  // eslint-disable-next-line camelcase
  grace_period_seconds?: number;
  port?: number;
  tag?: string;
}

interface ServiceImageResult {
    status: string,
    imageName: string,
}

interface ServiceListResult {
    services: Array<string>,
}

interface ServiceCreateResult {
    status: string,
}

interface SpawnResult {
    url: string,
    name: string,
    readyUrl?: string,
    statusUrl?: string,
}

interface TokenResult {
  token: string,
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
    apiBase: string

    constructor(private auth?: string) {
      this.apiBase = process.env.JAMSOCKET_SERVER_API ?? 'https://jamsocket.dev'
    }

    private async makeRequest(endpoint: string, method: HttpMethod, body?: any, headers?: Headers): Promise<any> {
      const url = `${this.apiBase}${endpoint}`
      const response = await request(url, body || null, { method, headers })

      let responseBody
      try {
        responseBody = JSON.parse(response.body)
      } catch (error) {
        throw new Error(`jamsocket: error parsing JSON response - ${error}: ${response.body}`)
      }

      if (response.statusCode && response.statusCode >= 400) {
        const { message, status, code, id } = responseBody.error
        throw new HTTPError(response.statusCode, `jamsocket: ${status} - ${code}: ${message} (id: ${id})`)
      }

      return responseBody
    }

    private async makeAuthenticatedRequest(endpoint: string, method: HttpMethod, body?: any): Promise<any> {
      const additionalHeaders = { 'Authorization': `Basic ${this.auth}` }
      try {
        return this.makeRequest(endpoint, method, body, additionalHeaders)
      } catch (error) {
        if (error instanceof HTTPError && error.code < 500) throw new AuthenticationError(error.code, error.message)
      }
    }

    private async makeAuthenticatedStreamRequest(endpoint: string, callback: (line: string) => void): Promise<void> {
      const url = `${this.apiBase}${endpoint}`
      return eventStream(url, {
        method: HttpMethod.Get,
        headers: { 'Authorization': `Basic ${this.auth}` },
      }, callback)
    }

    public checkAuth(): Promise<any> {
      const url = '/api/auth'
      return this.makeAuthenticatedRequest(url, HttpMethod.Get)
    }

    public serviceImage(username: string, serviceName: string): Promise<ServiceImageResult> {
      const url = `/api/user/${username}/service/${serviceName}/image`
      return this.makeAuthenticatedRequest(url, HttpMethod.Get)
    }

    public serviceCreate(username: string, name: string): Promise<ServiceCreateResult> {
      const url = `/api/user/${username}/service`
      return this.makeAuthenticatedRequest(url, HttpMethod.Post, {
        name,
      })
    }

    public serviceList(username: string): Promise<ServiceListResult> {
      const url = `/api/user/${username}/services`
      return this.makeAuthenticatedRequest(url, HttpMethod.Get)
    }

    public spawn(username: string, serviceName: string, body: SpawnRequestBody): Promise<SpawnResult> {
      const url = `/api/user/${username}/service/${serviceName}/spawn`
      return this.makeAuthenticatedRequest(url, HttpMethod.Post, body)
    }

    public streamLogs(backend: string, callback: (line: string) => void): Promise<void> {
      const url = `/api/backend/${backend}/logs`
      return this.makeAuthenticatedStreamRequest(url, callback)
    }

    public async tokenCreate(username: string, serviceName: string, body: TokenRequestBody): Promise<TokenResult> {
      const url = `/api/user/${username}/service/${serviceName}/token`
      return this.makeAuthenticatedRequest(url, HttpMethod.Post, body)
    }

    public async tokenSpawn(token: string): Promise<SpawnResult> {
      const url = `/api/token/${token}/spawn`
      return this.makeRequest(url, HttpMethod.Post, {})
    }
}
