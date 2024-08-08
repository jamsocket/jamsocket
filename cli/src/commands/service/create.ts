import { Command } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import { lightMagenta } from '../../lib/formatting'

export default class Create extends Command {
  static description = 'Creates a service'

  static examples = ['<%= config.bin %> <%= command.id %> my-service']

  static args = [{ name: 'service', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Create)

    const jamsocket = Jamsocket.fromEnvironment()
    await jamsocket.serviceCreate(args.service)

    this.log(`Created service: ${lightMagenta(args.service)}`)
  }
}
