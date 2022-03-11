import { Command } from '@oclif/core'
import { JamsocketApi } from '../../api'
import { readJamsocketConfig } from '../../common'

export default class Create extends Command {
  static description = 'Revoke a token permanently.'

  static examples = [
    '<%= config.bin %> <%= command.id %> jNCuGvecEEk706SDm2xYRJc7mqplE2',
  ]

  static args = [{ name: 'token', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Create)
    const config = readJamsocketConfig()
    if (config === null) {
      this.error('No user credentials found. Log in with jamsocket login')
    }

    const { auth } = config
    const api = new JamsocketApi(auth)
    await api.tokenRevoke(args.token)
    this.log(`Revoked token: ${args.token}`)
  }
}
