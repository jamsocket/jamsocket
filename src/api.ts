import { request } from "./common"

export type SpawnRequestBody = {
    env?: Record<string, string>; // env vars always map strings to strings
    port?: number;
    tag?: string;
}

// TODO(paul): formalize the API return types and create a public API spec (OpenAPI?)

export class JamsocketApi {
    apiBase: string

    constructor(private auth: string) {
        this.apiBase = process.env.JAMSOCKET_SERVER_API ?? 'https://jamsocket.dev'
    }

    private async makeAuthenticatedRequest(endpoint: string, body?: any): Promise<any> {
        const url = `${this.apiBase}${endpoint}`;
        const response = await request(url, body || null, {
            method: body ? 'POST' : 'GET',
            headers: { 'Authorization': `Basic ${this.auth}` },
        });

        let responseBody
        try {
            responseBody = JSON.parse(response.body);
        } catch (error) {
            throw new Error(`jamsocket: error parsing JSON response - ${error}: ${response.body}`);
        }

        if (response.statusCode && response.statusCode >= 400) {
            const { message, status, code, id } = responseBody.error
            throw new Error(`jamsocket: ${status} - ${code}: ${message} (id: ${id})`);
        }

        return responseBody
    }

    public async checkAuth(): Promise<void> {
        const url = `/api/auth`;
        await this.makeAuthenticatedRequest(url);
    }

    public async serviceImage(username: string, serviceName: string): Promise<string> {
        const url = `/api/user/${username}/service/${serviceName}/image`;
        const result = await this.makeAuthenticatedRequest(url);
        return result['imageName']
    }

    public async serviceCreate(username: string, name: string) {
        const url = `/api/user/${username}/service`;
        const result = await this.makeAuthenticatedRequest(url, {
            name
        });
        return result;
    }

    public async serviceList(username: string) {
        const url = `/user/${username}/services`;
        const result = await this.makeAuthenticatedRequest(url);
        return result;
    }

    public async spawn(username: string, serviceName: string, body: SpawnRequestBody): Promise<any> {
        const url = `/api/user/${username}/service/${serviceName}/spawn`
        const result = await this.makeAuthenticatedRequest(url, body);
        return result
    }
}