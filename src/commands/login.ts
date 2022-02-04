import { exec } from 'child_process'
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
      // TODO: this may not be true if the user has run docker logout jamrc.io
      // Should we do this part? Or just write over whatever is there?
      this.log(`User ${config.username} is already logged in. Run jamsocket logout first.`)
      return
    }

    const username = await CliUx.ux.prompt('username')
    const password = await CliUx.ux.prompt('password', { type: 'hide' })

    const { stderr } = exec(`docker login ${REGISTRY} -u="${username}" -p="${password}"`, err => {
      if (err) throw err
      // TODO: check response status code, if status code is not good, tell the user it failed and to try again
      const buff = Buffer.from(`${username}:${password}`, 'utf-8')
      const auth = buff.toString('base64')
      writeJamsocketConfig({ username: username, auth: auth })
    })
    stderr?.on('data', chunk => process.stderr.write(chunk))
  }
}
