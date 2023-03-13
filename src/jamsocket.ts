import { JamsocketApi, SpawnRequestBody, SpawnResult, StatusMessage, TerminateResult } from './api'
import type { SpawnTokenCreateResult, SpawnTokenRequestBody, SpawnTokenRevokeResult } from './api'
import type { ServiceCreateResult, ServiceListResult, ServiceInfoResult, ServiceDeleteResult } from './api'
import { JamsocketConfig, readJamsocketConfig, getRegistryAuth } from './jamsocket-config'
import { tag as dockerTag, push as dockerPush } from './docker'

export class Jamsocket {
  constructor(private config: JamsocketConfig | null, private api: JamsocketApi) {}

  public static fromEnvironment(): Jamsocket {
    const config = readJamsocketConfig()
    const api = JamsocketApi.fromEnvironment()

    return new Jamsocket(config, api)
  }

  public expectAuthorized(): JamsocketConfig {
    if (this.config === null) {
      throw new Error('No user credentials found. Log in with jamsocket login')
    }

    return this.config
  }

  public async serviceImage(service: string): Promise<string> {
    const config = this.expectAuthorized()
    const result = await this.api.serviceImage(config.account, service, config.token)
    return result.imageName
  }

  public async push(service: string, image: string, tag?: string): Promise<void> {
    const config = this.expectAuthorized()

    let prefixedImage = await this.serviceImage(service)
    if (tag) prefixedImage += `:${tag}`

    console.log(`Tagging (${prefixedImage}).`)
    dockerTag(image, prefixedImage)

    console.log('Pushing.')
    const auth = getRegistryAuth(config.account, config.token)
    await dockerPush(prefixedImage, auth)

    console.log('Done.')
  }

  public spawn(service: string, env?: Record<string, string>, grace?: number, port?: number, tag?: string, requireBearerToken?: boolean): Promise<SpawnResult> {
    const config = this.expectAuthorized()

    const body: SpawnRequestBody = {
      env,
      grace_period_seconds: grace,
      port,
      tag,
      require_bearer_token: requireBearerToken,
    }

    return this.api.spawn(config.account, service, config.token, body)
  }

  public terminate(backend: string): Promise<TerminateResult> {
    const config = this.expectAuthorized()

    return this.api.terminate(backend, config.token)
  }

  public serviceCreate(service: string): Promise<ServiceCreateResult> {
    const config = this.expectAuthorized()
    return this.api.serviceCreate(config.account, service, config.token)
  }

  public serviceDelete(service: string): Promise<ServiceDeleteResult> {
    const config = this.expectAuthorized()
    return this.api.serviceDelete(config.account, service, config.token)
  }

  public serviceInfo(service: string): Promise<ServiceInfoResult> {
    const config = this.expectAuthorized()
    return this.api.serviceInfo(config.account, service, config.token)
  }

  public serviceList(): Promise<ServiceListResult> {
    const config = this.expectAuthorized()
    return this.api.serviceList(config.account, config.token)
  }

  public streamLogs(backend: string, callback: (v: string) => void): Promise<void> {
    const config = this.expectAuthorized()
    return this.api.streamLogs(backend, config.token, callback)
  }

  public streamStatus(backend: string, callback: (v: StatusMessage) => void): Promise<void> {
    const config = this.expectAuthorized()
    return this.api.streamStatus(backend, config.token, callback)
  }

  public status(backend: string): Promise<StatusMessage> {
    const config = this.expectAuthorized()
    return this.api.status(backend, config.token)
  }

  public spawnTokenCreate(service: string, grace?: number, port?: number, tag?: string): Promise<SpawnTokenCreateResult> {
    const config = this.expectAuthorized()
    const body: SpawnTokenRequestBody = {
      grace_period_seconds: grace,
      port,
      tag,
    }

    return this.api.spawnTokenCreate(config.account, service, config.token, body)
  }

  public spawnTokenRevoke(spawnToken: string): Promise<SpawnTokenRevokeResult> {
    const config = this.expectAuthorized()
    return this.api.spawnTokenRevoke(spawnToken, config.token)
  }
}
