import { Command, CliUx, Flags } from '@oclif/core'
import chalk from 'chalk'
import { JamsocketApi, AuthenticationError } from '../api'
import { deleteJamsocketConfig, JamsocketConfig } from '../jamsocket-config'
import { lightMagenta, lightGreen, lightBlue, gradientBlue } from '../formatting'

export default class Login extends Command {
  static description = 'Authenticates user to the Jamsocket API.'

  static examples = ['<%= config.bin %> <%= command.id %>']

  static flags = {
    token: Flags.string({
      char: 't',
      description: 'for automated environments, optional API token to log into the CLI with',
    }),
  }

  public async run(): Promise<void> {
    const api = JamsocketApi.fromEnvironment()
    const savedConfig = JamsocketConfig.fromSaved()
    if (savedConfig !== null) {
      const token = savedConfig.getAccessToken()
      try {
        const result = await api.checkAuth(token)
        this.log()
        if (result.account === null)
          throw new Error(
            `No account found for logged in user. You may need to log in to ${api.getAppBaseUrl()} to finish setting up your account.`,
          )
        this.log(
          `You are already logged into account ${lightBlue(
            result.account,
          )}. To log into a different account, run ${lightMagenta('jamsocket logout')} first.\n`,
        )
        return
      } catch (error) {
        const isAuthError = error instanceof AuthenticationError
        if (!isAuthError) throw error
        deleteJamsocketConfig()
      }
    }

    const { flags } = await this.parse(Login)

    const token = flags.token?.trim()

    // if an API token is provided, check the auth and save an ApiTokenConfig
    if (token) {
      if (!token.includes('.')) {
        throw new Error('Invalid token. Token must contain a period.')
      }

      const { account } = await api.checkAuth(token)
      if (account === null)
        throw new Error(
          `No account found for user. You may need to log in to ${api.getAppBaseUrl()} to finish setting up your account.`,
        )
      const config = new JamsocketConfig({ api_token: { account, token } })
      config.save()
      this.log(`Logged in using API token as "${account}"`)
      return
    }

    const loginAttempt = await api.startLoginAttempt()

    this.log()
    this.log(chalk.bold`Log in with this URL:\n`)
    this.log(`    ${lightBlue(api.getLoginUrl(loginAttempt.token))}\n`)

    CliUx.ux.action.start('')
    const success = await api.streamLoginStatus(loginAttempt.token)
    CliUx.ux.action.stop(success ? '✅' : '❌')
    if (!success) {
      throw new Error('Login attempt failed. Try running jamsocket login again.')
    }

    this.log()
    const code = (
      await CliUx.ux.prompt(`Paste the ${lightGreen('4-digit code')} you received at login here`)
    ).trim()

    const userSession = await api.completeLoginAttempt(loginAttempt.token, code)
    const authResult = await api.checkAuth(userSession.token)

    if (authResult.account === null)
      throw new Error(
        `No account found for user. You may need to ${lightMagenta(
          `log in to ${api.getAppBaseUrl()}`,
        )} to finish setting up your account.`,
      )

    const config = new JamsocketConfig({
      user_session: {
        uuid: userSession.uuid,
        user_id: userSession.user_id,
        token: userSession.token,
        primary_account: authResult.account,
      },
    })
    config.save()

    this.log()
    this.log(`Welcome to ${gradientBlue('Jamsocket')}!`)
    this.log(`You're logged in as ${lightMagenta(authResult.account)}\n`)
  }
}
