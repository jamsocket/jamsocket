import { Command } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'

export default class Create extends Command {
  static description = 'Gets some information about a service'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service',
  ]

  static args = [{ name: 'name', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Create)

    const jamsocket = Jamsocket.fromEnvironment()
    const serviceInfo = await jamsocket.serviceInfo(args.name)

    this.log(JSON.stringify(serviceInfo, null, 2))
  }
}
