import { Command } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'

export default class List extends Command {
  static description = 'List services for the logged-in user'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  public async run(): Promise<void> {
    const jamsocket = Jamsocket.fromEnvironment()
    const responseBody = await jamsocket.serviceList()

    for (const service of responseBody.services) {
      this.log(service)
    }
  }
}
