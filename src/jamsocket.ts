import { JamsocketApi, BackendInfoResult, RunningBackendsResult, SpawnRequestBody, SpawnResult, StatusMessage, TerminateResult } from './api'
import type { ServiceCreateResult, ServiceListResult, ServiceInfoResult, ServiceDeleteResult } from './api'
import { JamsocketConfig } from './jamsocket-config'
import { tag as dockerTag, push as dockerPush } from './docker'

export class Jamsocket {
  constructor(private config: JamsocketConfig | null, private api: JamsocketApi) {}

  public static fromEnvironment(): Jamsocket {
    const config = JamsocketConfig.fromSaved()
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
    const result = await this.api.serviceImage(config.getAccount(), service, config.getAccessToken())
    return result.imageName
  }

  public async push(service: string, image: string, tag?: string): Promise<void> {
    const config = this.expectAuthorized()

    let prefixedImage = await this.serviceImage(service)
    if (tag) prefixedImage += `:${tag}`

    console.log(`Tagging (${prefixedImage}).`)
    dockerTag(image, prefixedImage)

    console.log('Pushing.')
    const auth = config.getRegistryAuth()
    await dockerPush(prefixedImage, auth)

    console.log('Done.')
  }

  public spawn(service: string, env?: Record<string, string>, grace?: number, port?: number, tag?: string, requireBearerToken?: boolean, lock?: string): Promise<SpawnResult> {
    const config = this.expectAuthorized()

    const body: SpawnRequestBody = {
      env,
      grace_period_seconds: grace,
      port,
      tag,
      require_bearer_token: requireBearerToken,
      lock,
    }

    return this.api.spawn(config.getAccount(), service, config.getAccessToken(), body)
  }

  public terminate(backend: string): Promise<TerminateResult> {
    const config = this.expectAuthorized()
    return this.api.terminate(backend, config.getAccessToken())
  }

  public backendInfo(backend: string): Promise<BackendInfoResult> {
    const config = this.expectAuthorized()
    return this.api.backendInfo(backend, config.getAccessToken())
  }

  public listRunningBackends(): Promise<RunningBackendsResult> {
    const config = this.expectAuthorized()
    return this.api.listRunningBackends(config.getAccount(), config.getAccessToken())
  }

  public serviceCreate(service: string): Promise<ServiceCreateResult> {
    const config = this.expectAuthorized()
    return this.api.serviceCreate(config.getAccount(), service, config.getAccessToken())
  }

  public serviceDelete(service: string): Promise<ServiceDeleteResult> {
    const config = this.expectAuthorized()
    return this.api.serviceDelete(config.getAccount(), service, config.getAccessToken())
  }

  public serviceInfo(service: string): Promise<ServiceInfoResult> {
    const config = this.expectAuthorized()
    return this.api.serviceInfo(config.getAccount(), service, config.getAccessToken())
  }

  public serviceList(): Promise<ServiceListResult> {
    const config = this.expectAuthorized()
    return this.api.serviceList(config.getAccount(), config.getAccessToken())
  }

  public streamLogs(backend: string, callback: (v: string) => void): Promise<void> {
    const config = this.expectAuthorized()
    return this.api.streamLogs(backend, config.getAccessToken(), callback)
  }

  public streamMetrics(backend: string, callback: (v: string) => void): Promise<void> {
    const config = this.expectAuthorized()
    return this.api.streamMetrics(backend, config.getAccessToken(), callback)
  }

  public streamStatus(backend: string, callback: (v: StatusMessage) => void): Promise<void> {
    const config = this.expectAuthorized()
    return this.api.streamStatus(backend, config.getAccessToken(), callback)
  }

  public status(backend: string): Promise<StatusMessage> {
    const config = this.expectAuthorized()
    return this.api.status(backend, config.getAccessToken())
  }
}
