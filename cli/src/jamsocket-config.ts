import { homedir, EOL } from 'os'
import { resolve, dirname } from 'path'
import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'

export const JAMSOCKET_CONFIG_DIR = resolve(homedir(), '.jamsocket')
const JAMSOCKET_CONFIG_PATH = resolve(JAMSOCKET_CONFIG_DIR, 'config.json')

export type UserSessionConfig = {
  user_session: {
    uuid: string
    token: string
    user_id: string
    primary_account: string
  }
}

export type ApiTokenConfig = {
  api_token: {
    account: string
    token: string
  }
}

export function isUserSessionConfig(config: any): config is UserSessionConfig {
  return (
    config !== undefined &&
    config.user_session !== undefined &&
    config.user_session.uuid !== undefined &&
    config.user_session.token !== undefined &&
    config.user_session.user_id !== undefined &&
    config.user_session.primary_account !== undefined
  )
}

export function isApiTokenConfig(config: any): config is ApiTokenConfig {
  return (
    config !== undefined &&
    config.api_token !== undefined &&
    config.api_token.token !== undefined &&
    config.api_token.account !== undefined
  )
}

export function deleteJamsocketConfig(): void {
  if (!existsSync(JAMSOCKET_CONFIG_PATH)) return
  unlinkSync(JAMSOCKET_CONFIG_PATH)
}

export class JamsocketConfig {
  public static fromSaved(): JamsocketConfig | null {
    if (!existsSync(JAMSOCKET_CONFIG_PATH)) return null
    const contents = readFileSync(JAMSOCKET_CONFIG_PATH, 'utf-8')

    let config
    try {
      config = JSON.parse(contents)
    } catch {
      deleteJamsocketConfig()
      return null
    }

    const isInvalidConfig = isApiTokenConfig(config) === isUserSessionConfig(config)

    if (isInvalidConfig) {
      deleteJamsocketConfig()
      return null
    }

    return new JamsocketConfig(config)
  }

  constructor(private config: UserSessionConfig | ApiTokenConfig) {}

  save(): void {
    const dir = dirname(JAMSOCKET_CONFIG_PATH)
    mkdirSync(dir, { recursive: true })
    writeFileSync(JAMSOCKET_CONFIG_PATH, `${JSON.stringify(this.config, null, 2)}${EOL}`)
  }

  getSessionUuid(): string | null {
    if (isUserSessionConfig(this.config)) return this.config.user_session.uuid
    return null
  }

  // returns a token that can access our API endpoints (either a user session token or api token)
  getAccessToken(): string {
    if (isApiTokenConfig(this.config)) return this.config.api_token.token
    return this.config.user_session.token
  }

  getAccount(): string {
    if (isApiTokenConfig(this.config)) return this.config.api_token.account
    return this.config.user_session.primary_account
  }

  getRegistryAuth(): string {
    // this version of the token is used for Basic Authorization, which is required for our Docker registry
    const account = this.getAccount()
    const token = this.getAccessToken()
    const buff = Buffer.from(`${account}:${token}`, 'utf-8')
    return buff.toString('base64')
  }
}
