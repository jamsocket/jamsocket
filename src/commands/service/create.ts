import { Command } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import { lightMagenta } from '../../formatting'

export default class Create extends Command {
  static description = 'Creates a service'

  static examples = ['<%= config.bin %> <%= command.id %> my-service']

  static args = [{ name: 'name', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Create)

    const jamsocket = Jamsocket.fromEnvironment()
    await jamsocket.serviceCreate(args.name)

    this.log(`Created service: ${lightMagenta(args.name)}`)
  }
}
