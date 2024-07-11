import { Command } from '@oclif/core'
import { JamsocketApi, AuthenticationError } from '../api'
import { JamsocketConfig, deleteJamsocketConfig } from '../jamsocket-config'

export default class Logout extends Command {
  static description = 'Logs out of Jamsocket and removes locally-stored credentials.'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {}
  static args = []

  public async run(): Promise<void> {
    const api = JamsocketApi.fromEnvironment()
    const savedConfig = JamsocketConfig.fromSaved()
    if (savedConfig !== null) {
      deleteJamsocketConfig()
      const sessionUuid = savedConfig.getSessionUuid()
      if (sessionUuid !== null) {
        try {
          await api.revokeUserSession(sessionUuid, savedConfig)
        } catch (error) {
          const isAuthError = error instanceof AuthenticationError
          if (!isAuthError) throw error
        }
      }
    }
    this.log('Logged out')
  }
}
