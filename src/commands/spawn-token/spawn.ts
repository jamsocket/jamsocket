import { Command } from '@oclif/core'
import chalk from 'chalk'
import { JamsocketApi } from '../../api'
import { lightBlue, blue } from '../../formatting'

export default class Spawn extends Command {
  static description = 'Spawn a backend using a spawn token.'

  static examples = [
    '<%= config.bin %> <%= command.id %> jNCuGvecEEk706SDm2xYRJc7mqplE2',
  ]

  static args = [{ name: 'token', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Spawn)
    const api = JamsocketApi.fromEnvironment()
    const responseBody = await api.spawnTokenSpawn(args.token)
    this.log(lightBlue('Backend spawned!'))
    this.log(chalk.bold`backend name: `, blue(responseBody.name))
    this.log(chalk.bold`backend url:  `, blue(responseBody.url))
    this.log(chalk.bold`status url:   `, blue(responseBody.status_url))
    this.log(chalk.bold`ready url:    `, blue(responseBody.ready_url))
  }
}
