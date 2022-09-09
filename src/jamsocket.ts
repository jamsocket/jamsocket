import { JamsocketApi, ServiceCreateResult, ServiceListResult, SpawnRequestBody, SpawnResult, StatusMessage, SpawnTokenCreateResult, SpawnTokenRequestBody, SpawnTokenRevokeResult } from './api'
import { JamsocketConfig, readJamsocketConfig } from './jamsocket-config'
import { ContainerManager, detectContainerManager } from './container-manager'

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
    const result = await this.api.serviceImage(config.username, service, config.auth)
    return result.imageName
  }

  public async push(service: string, image: string, tag?: string): Promise<void> {
    const config = this.expectAuthorized()
    const containerManager: ContainerManager = detectContainerManager()

    let prefixedImage = await this.serviceImage(service)
    if (tag) prefixedImage += `:${tag}`

    console.log(`Tagging (${prefixedImage}).`)
    containerManager.tag(image, prefixedImage)

    console.log('Pushing.')
    await containerManager.push(prefixedImage, config.auth)

    console.log('Done.')
  }

  public spawn(service: string, env?: Record<string, string>, grace?: number, port?: number, tag?: string): Promise<SpawnResult> {
    const config = this.expectAuthorized()

    const body: SpawnRequestBody = {
      env,
      grace_period_seconds: grace,
      port,
      tag,
    }

    return this.api.spawn(config.username, service, config.auth, body)
  }

  public serviceCreate(service: string): Promise<ServiceCreateResult> {
    const config = this.expectAuthorized()
    return this.api.serviceCreate(config.username, service, config.auth)
  }

  public serviceList(): Promise<ServiceListResult> {
    const config = this.expectAuthorized()
    return this.api.serviceList(config.username, config.auth)
  }

  public streamLogs(backend: string, callback: (v: string) => void): Promise<void> {
    const config = this.expectAuthorized()
    return this.api.streamLogs(backend, config.auth, callback)
  }

  public streamStatus(backend: string, callback: (v: StatusMessage) => void): Promise<void> {
    const config = this.expectAuthorized()
    return this.api.streamStatus(backend, config.auth, callback)
  }

  public status(backend: string): Promise<StatusMessage> {
    const config = this.expectAuthorized()
    return this.api.status(backend, config.auth)
  }

  public spawnTokenCreate(service: string, grace?: number, port?: number, tag?: string): Promise<SpawnTokenCreateResult> {
    const config = this.expectAuthorized()
    const body: SpawnTokenRequestBody = {
      grace_period_seconds: grace,
      port,
      tag,
    }

    return this.api.spawnTokenCreate(config.username, service, config.auth, body)
  }

  public spawnTokenRevoke(token: string): Promise<SpawnTokenRevokeResult> {
    const config = this.expectAuthorized()
    return this.api.spawnTokenRevoke(token, config.auth)
  }
}
