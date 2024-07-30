import { homedir, EOL } from 'os'
import { resolve, dirname } from 'path'
import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'

export const JAMSOCKET_CONFIG_DIR = resolve(homedir(), '.jamsocket')
const JAMSOCKET_CONFIG_PATH = resolve(JAMSOCKET_CONFIG_DIR, 'config.json')

type LoggedInType = 'user_session' | 'api_token'

export type UserSessionConfig = {
  user_session: {
    uuid: string
    token: string
    user_id: string
    selected_account: string
    user_is_admin: boolean
    user_email?: string
  }
}

export type ApiTokenConfig = {
  api_token: {
    account: string
    token: string
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isUserSessionConfig(config: any): config is UserSessionConfig {
  return (
    config !== undefined &&
    config.user_session !== undefined &&
    config.user_session.uuid !== undefined &&
    config.user_session.token !== undefined &&
    config.user_session.user_id !== undefined &&
    config.user_session.selected_account !== undefined
  )
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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

  loggedInType(): LoggedInType {
    if (isUserSessionConfig(this.config)) return 'user_session'
    return 'api_token'
  }

  updateSelectedAccount(selectedAccount: string): void {
    if (isUserSessionConfig(this.config)) {
      this.config.user_session.selected_account = selectedAccount
    } else {
      throw new Error(
        'Cannot update selected account for API token config. This is a bug with the Jamsocket CLI.',
      )
    }
  }

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
  private getAccessToken(): string {
    if (isApiTokenConfig(this.config)) return this.config.api_token.token
    return this.config.user_session.token
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.getAccessToken()}`,
    }
    if (this.isAdmin()) {
      headers['X-Jamsocket-Admin-As-Account'] = this.getAccount()
    }
    return headers
  }

  getAccount(): string {
    if (isApiTokenConfig(this.config)) return this.config.api_token.account
    return this.config.user_session.selected_account
  }

  getUserEmail(): string | null {
    if (isUserSessionConfig(this.config)) return this.config.user_session.user_email ?? null
    return null
  }

  isAdmin(): boolean {
    if (isUserSessionConfig(this.config)) return this.config.user_session.user_is_admin
    return false
  }

  getRegistryAuth(): string {
    // this version of the token is used for Basic Authorization, which is required for our Docker registry
    const account = this.getAccount()
    const token = this.getAccessToken()
    const buff = Buffer.from(`${account}:${token}`, 'utf-8')
    return buff.toString('base64')
  }
}
