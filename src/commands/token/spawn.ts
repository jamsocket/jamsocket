import { Command } from '@oclif/core'
import { JamsocketApi } from '../../api'

export default class Spawn extends Command {
  static description = 'Spawn a backend using a token.'

  static examples = [
    '<%= config.bin %> <%= command.id %> jNCuGvecEEk706SDm2xYRJc7mqplE2',
  ]

  static args = [{ name: 'token', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Spawn)
    const api = JamsocketApi.fromEnvironment()
    const responseBody = await api.tokenSpawn(args.token)
    this.log(JSON.stringify(responseBody, null, 2))
  }
}
