import { Command, CliUx } from '@oclif/core'
import { JamsocketApi } from '../api'
import { readJamsocketConfig, writeJamsocketConfig } from '../common'

export default class Login extends Command {
  static description = 'Authenticates user with jamcr.io container registery'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {}

  static args = []

  public async run(): Promise<void> {
    const config = readJamsocketConfig()
    if (config !== null) {
      this.log(`User ${config.username} is already logged in. Run jamsocket logout first.`)
      return
    }

    const username = await CliUx.ux.prompt('username')
    const password = await CliUx.ux.prompt('password', { type: 'hide' })

    const buff = Buffer.from(`${username}:${password}`, 'utf-8')
    const auth = buff.toString('base64')

    const api = new JamsocketApi(auth);
    await api.checkAuth();

    writeJamsocketConfig({ username: username, auth: auth })
    this.log('Login Succeeded')
  }
}
