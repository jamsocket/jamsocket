import { eventStream, request } from './request'

enum HttpMethod {
    Get = 'GET',
    Post = 'POST',
}

export type SpawnRequestBody = {
    env?: Record<string, string>; // env vars always map strings to strings
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

export class JamsocketApi {
    apiBase: string

    constructor(private auth: string) {
      this.apiBase = process.env.JAMSOCKET_SERVER_API ?? 'https://jamsocket.dev'
    }

    private async makeAuthenticatedRequest(endpoint: string, method: HttpMethod, body?: any): Promise<any> {
      const url = `${this.apiBase}${endpoint}`
      const response = await request(url, body || null, {
        method,
        headers: { 'Authorization': `Basic ${this.auth}` },
      })

      let responseBody
      try {
        responseBody = JSON.parse(response.body)
      } catch (error) {
        throw new Error(`jamsocket: error parsing JSON response - ${error}: ${response.body}`)
      }

      if (response.statusCode && response.statusCode >= 400) {
        const { message, status, code, id } = responseBody.error
        throw new Error(`jamsocket: ${status} - ${code}: ${message} (id: ${id})`)
      }

      return responseBody
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
}
