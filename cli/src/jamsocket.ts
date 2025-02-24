import { JamsocketApi } from './api'
import type {
  ServiceCreateResult,
  ServiceListResult,
  ServiceInfoResult,
  ServiceDeleteResult,
  ServiceImagesResult,
  EnvironmentUpdateResult,
  JamsocketConnectRequestBody,
  JamsocketConnectResponse,
  BackendInfoResult,
  RunningBackendsResult,
  SpawnRequestBody,
  SpawnResult,
  TerminateResult,
  PublicV2State,
  TerminateAllBackendsResult,
  TerminateAllBackendsBody,
} from './api'
import { JamsocketConfig } from './jamsocket-config'
import { tag as dockerTag, push as dockerPush } from './lib/docker'
import type { EventStreamReturn } from './lib/request'

export class Jamsocket {
  constructor(
    public config: JamsocketConfig | null,
    public api: JamsocketApi,
  ) {}

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
    const result = await this.api.serviceImage(config.getAccount(), service, config)
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

  // eslint-ignore-next-line max-params
  public spawn(
    service: string,
    serviceEnvironment?: string,
    env?: Record<string, string>,
    grace?: number,
    lock?: string,
  ): Promise<SpawnResult> {
    const config = this.expectAuthorized()

    const body: SpawnRequestBody = {
      env,
      grace_period_seconds: grace,
      lock,
      service_environment: serviceEnvironment,
    }

    return this.api.spawn(config.getAccount(), service, config, body)
  }

  public connect(
    service: string,
    serviceEnvironment: string | null,
    body?: JamsocketConnectRequestBody,
  ): Promise<JamsocketConnectResponse> {
    const config = this.expectAuthorized()
    return this.api.connect(config.getAccount(), service, serviceEnvironment, config, body)
  }

  public terminate(backend: string, hard: boolean): Promise<TerminateResult> {
    const config = this.expectAuthorized()
    return this.api.terminate(backend, hard, config)
  }

  public terminateAllBackends(
    serviceName: string,
    body: TerminateAllBackendsBody,
  ): Promise<TerminateAllBackendsResult> {
    const config = this.expectAuthorized()
    return this.api.terminateAllBackends(config.getAccount(), serviceName, body, config)
  }

  public backendInfo(backend: string): Promise<BackendInfoResult> {
    const config = this.expectAuthorized()
    return this.api.backendInfo(backend, config)
  }

  public listRunningBackends(): Promise<RunningBackendsResult> {
    const config = this.expectAuthorized()
    return this.api.listRunningBackends(config.getAccount(), config)
  }

  public serviceCreate(service: string): Promise<ServiceCreateResult> {
    const config = this.expectAuthorized()
    return this.api.serviceCreate(config.getAccount(), service, config)
  }

  public serviceDelete(service: string): Promise<ServiceDeleteResult> {
    const config = this.expectAuthorized()
    return this.api.serviceDelete(config.getAccount(), service, config)
  }

  public serviceInfo(service: string): Promise<ServiceInfoResult> {
    const config = this.expectAuthorized()
    return this.api.serviceInfo(config.getAccount(), service, config)
  }

  public serviceList(): Promise<ServiceListResult> {
    const config = this.expectAuthorized()
    return this.api.serviceList(config.getAccount(), config)
  }

  public updateEnvironment(
    service: string,
    environment: string | null,
    imageTag: string,
  ): Promise<EnvironmentUpdateResult> {
    const config = this.expectAuthorized()
    return this.api.updateEnvironment(config.getAccount(), service, environment, config, {
      image_tag: imageTag,
    })
  }

  public imagesList(service: string): Promise<ServiceImagesResult> {
    const config = this.expectAuthorized()
    return this.api.imagesList(config.getAccount(), service, config)
  }

  public streamLogs(backend: string, callback: (v: string) => void): EventStreamReturn {
    const config = this.expectAuthorized()
    return this.api.streamLogs(backend, config, callback)
  }

  public streamMetrics(backend: string, callback: (v: string) => void): EventStreamReturn {
    const config = this.expectAuthorized()
    return this.api.streamMetrics(backend, config, callback)
  }

  public streamStatus(
    backend: string,
    callback: (v: PublicV2State) => void,
    config?: JamsocketConfig,
  ): EventStreamReturn {
    return this.api.streamStatus(backend, callback, config)
  }

  public status(backend: string, config?: JamsocketConfig): Promise<PublicV2State> {
    return this.api.status(backend, config)
  }
}
