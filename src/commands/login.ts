import { spawnSync } from 'child_process'
import { Command, CliUx } from '@oclif/core'
import { readJamsocketConfig, writeJamsocketConfig, REGISTRY } from '../common'

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
      // This may not be true if the user has run docker logout jamrc.io
      // Should we do this part? Or just write over whatever is there?
      this.error(`User ${config.username} is already logged in. Run jamsocket logout first.`)
    }

    const username = await CliUx.ux.prompt('username')
    const password = await CliUx.ux.prompt('password', { type: 'hide' })

    const loginOutput = spawnSync('docker', ['login', REGISTRY, '-u', username, '--password-stdin'], { encoding: 'utf-8', input: password })
    process.stderr.write(loginOutput.stderr)
    if (loginOutput.status !== 0) {
      this.error(loginOutput.error ?? 'Error logging in')
    }

    const buff = Buffer.from(`${username}:${password}`, 'utf-8')
    const auth = buff.toString('base64')
    writeJamsocketConfig({ username: username, auth: auth })
    this.log('Login Succeeded')
  }
}
