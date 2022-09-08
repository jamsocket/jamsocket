import { Command, CliUx } from '@oclif/core'
import { JamsocketApi, AuthenticationError } from '../api'
import { readJamsocketConfig, writeJamsocketConfig } from '../jamsocket-config'

export default class Login extends Command {
  static description = 'Authenticates user to the Jamsocket API with a token.'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> W3guqHFk0FJdtquC.iDxcHZr4rg1AIWPxpnk0SWHm95Vfdl',
  ]

  static args = [
    { name: 'token', description: 'optional token to log into the CLI with' },
  ]

  public async run(): Promise<void> {
    const api = JamsocketApi.fromEnvironment()
    const config = readJamsocketConfig()
    if (config !== null) {
      const { auth } = config
      try {
        await api.checkAuth(auth)
        this.log('You are already logged in. To log in with a different token, run jamsocket logout first.')
        return
      } catch (error) {
        const isAuthError = error instanceof AuthenticationError
        if (!isAuthError) throw error
      }
    }

    const { args } = await this.parse(Login)

    let token = args.token.trim()
    if (!token) {
      this.log('Generate an API token at the following URL and paste it into the prompt below:\n')
      this.log(`    ${api.getLoginUrl()}\n`)
      token = (await CliUx.ux.prompt('token')).trim()
    }

    if (!token) {
      throw new Error('Token required to login.')
    }

    if (!token.includes('.')) {
      throw new Error('Invalid token. Token must contain a period.')
    }

    const [publicPortion, privatePortion] = token.split('.')

    const buff = Buffer.from(`${publicPortion}:${privatePortion}`, 'utf-8')
    const auth = buff.toString('base64')

    await api.checkAuth(auth)

    // should tokens be stored like this? or should they explicitly be tokens - no username?
    writeJamsocketConfig({ username: publicPortion, auth: auth })
    this.log('Login Succeeded')
  }
}
