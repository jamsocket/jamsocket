import { Command, CliUx, Flags } from '@oclif/core'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import { JamsocketApi, AuthenticationError, CompleteCliLoginResult } from '../api'
import { deleteJamsocketConfig, JamsocketConfig } from '../jamsocket-config'
import { lightMagenta, lightGreen, lightBlue, gradientBlue } from '../formatting'

export default class Login extends Command {
  static description = 'Authenticates user to the Jamsocket API.'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static args = [
    { name: 'account', description: 'Account to use when logging in. (Only necessary for users with multiple accounts.)', required: false },
  ]

  static flags = {
    token: Flags.string({ char: 't', description: 'for automated environments, optional API token to log into the CLI with' }),
  }

  public async run(): Promise<void> {
    const api = JamsocketApi.fromEnvironment()
    const savedConfig = JamsocketConfig.fromSaved()

    const { flags, args } = await this.parse(Login)
    const requestedAccount = args.account

    if (savedConfig !== null) {
      try {
        const result = await api.checkAuthConfig(savedConfig)
        this.log()
        if (result.accounts.length === 0) throw new Error(`No account found for logged in user. You may need to log in to ${api.getAppBaseUrl()} to finish setting up your account.`)

        // if logged in with api token, say "You are already logged in as account" and drop out
        if (savedConfig.loggedInType() === 'api_token') {
          this.log(`You are already logged in as account ${lightBlue(savedConfig.getAccount())}. To log into a different account, run ${lightMagenta('jamsocket logout')} first.\n`)
          return
        }

        // if did not request an account, say "You are already logged in as account" and drop out
        if (!requestedAccount) {
          this.log(`You are already logged in as account ${lightBlue(savedConfig.getAccount())}.\n`)

          if (result.accounts.length > 1) {
            this.log(`Run ${lightMagenta('jamsocket login <account>')} to switch to one of the following accounts: ${result.accounts.map(n => lightBlue(n)).join(', ')}.\n`)
            this.log(`Otherwise, run ${lightMagenta('jamsocket logout')} first to log into an account not listed here.\n`)
          } else {
            this.log(`To log into a different account, run ${lightMagenta('jamsocket logout')} first.\n`)
          }
          return
        }

        // if requested an account, check that the account is in the list of accounts
        // if it is, update the primary account and say "You are now logged in as account"
        if (result.accounts.includes(requestedAccount) || result.is_admin) {
          savedConfig.updateSelectedAccount(requestedAccount)
          savedConfig.save()
          this.log(`You're logged in as ${lightBlue(requestedAccount)}\n`)
          return
        }

        // if it is not, fail
        this.log(`You do not have access to account ${lightBlue(requestedAccount)}.`)
        return
      } catch (error) {
        deleteJamsocketConfig()
        const isAuthError = error instanceof AuthenticationError
        if (!isAuthError) throw error
      }
    }

    const token = flags.token?.trim()

    // if an API token is provided, check the auth and save an ApiTokenConfig
    if (token) {
      if (!token.includes('.')) {
        throw new Error('Invalid token. Token must contain a period.')
      }

      const { accounts } = await api.checkAuthToken(token)
      this.log()
      if (accounts.length === 0) throw new Error(`No account found for user. You may need to log in to ${api.getAppBaseUrl()} to finish setting up your account.`)
      // an api token can only be used for one account, so this should be the only account in the list
      const account = accounts[0]

      if (requestedAccount && requestedAccount !== account) {
        throw new Error(`You do not have access to account "${requestedAccount}".`)
      }

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
    const code = (await CliUx.ux.prompt(`Paste the ${lightGreen('4-digit code')} you received at login here`)).trim()

    const userSession = await api.completeLoginAttempt(loginAttempt.token, code)
    const authResult = await api.checkAuthToken(userSession.token)

    if (authResult.accounts.length === 0) throw new Error(`No account found for user. You may need to ${lightMagenta(`log in to ${api.getAppBaseUrl()}`)} to finish setting up your account.`)

    // if they requested an account, check if that account is in the list of accounts
    if (requestedAccount) {
      if (authResult.accounts.includes(requestedAccount) || authResult.is_admin) {
        this.finalizeUserSessionLogin(userSession, requestedAccount)
        return
      }

      throw new Error(`You do not have access to account ${lightBlue(requestedAccount)}.`)
    }

    // otherwise, they did not request a specific account...
    // if they only have one account, then use that account
    if (authResult.accounts.length === 1) {
      this.finalizeUserSessionLogin(userSession, authResult.accounts[0])
      return
    }

    // otherwise, they have multiple accounts, so prompt them to select an account
    this.log()
    const response = await inquirer.prompt([{
      name: 'account',
      message: 'You have access to multiple accounts. Please specify which account you would like to use.',
      type: 'list',
      choices: authResult.accounts.map(account => ({ name: account })),
    }])

    if (response.account !== null) {
      this.finalizeUserSessionLogin(userSession, response.account)
      return
    }

    throw new Error('Auth failed. No account selected. Try running jamsocket login again.')
  }

  finalizeUserSessionLogin(
    userSession: CompleteCliLoginResult,
    selectedAccount: string,
  ): void {
    const config = new JamsocketConfig({
      user_session: {
        uuid: userSession.uuid,
        user_id: userSession.user_id,
        token: userSession.token,
        selected_account: selectedAccount,
        user_is_admin: userSession.user_is_admin ?? false,
        user_email: userSession.user_email,
      },
    })
    config.save()

    this.log()
    this.log(`Welcome to ${gradientBlue('Jamsocket')}!`)
    this.log(`You're logged in as ${lightMagenta(selectedAccount)}\n`)
  }
}
