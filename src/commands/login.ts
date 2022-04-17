import { Command, CliUx } from '@oclif/core'
import { JamsocketApi, AuthenticationError } from '../api'
import { readJamsocketConfig, writeJamsocketConfig } from '../common'

export default class Login extends Command {
  static description = 'Authenticates user with jamcr.io container registery'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {}

  static args = []

  public async run(): Promise<void> {
    const api = JamsocketApi.fromEnvironment()
    const config = readJamsocketConfig()
    if (config !== null) {
      const { auth } = config
      try {
        await api.checkAuth(auth)
        this.log(`User ${config.username} is already logged in. To log in with a different user, run jamsocket logout first.`)
        return
      } catch (error) {
        const isAuthError = error instanceof AuthenticationError
        if (!isAuthError) throw error
      }
    }

    const username = await CliUx.ux.prompt('username')
    const password = await CliUx.ux.prompt('password', { type: 'hide' })

    const buff = Buffer.from(`${username}:${password}`, 'utf-8')
    const auth = buff.toString('base64')

    await api.checkAuth(auth)

    writeJamsocketConfig({ username: username, auth: auth })
    this.log('Login Succeeded')
  }
}
