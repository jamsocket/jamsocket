import { Command } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'

export default class Create extends Command {
  static description = 'Revoke a spawn token permanently.'

  static examples = [
    '<%= config.bin %> <%= command.id %> jNCuGvecEEk706SDm2xYRJc7mqplE2',
  ]

  static args = [{ name: 'token', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Create)
    const jamsocket = Jamsocket.fromEnvironment()

    await jamsocket.spawnTokenRevoke(args.token)
    this.log(`Revoked spawn token: ${args.token}`)
  }
}
