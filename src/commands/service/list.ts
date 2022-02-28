import { Command } from '@oclif/core'
import { JamsocketApi } from '../../api'
import { readJamsocketConfig } from '../../common'

export default class List extends Command {
  static description = 'List services for the logged-in user'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  public async run(): Promise<void> {
    const config = readJamsocketConfig()
    if (config === null) {
      this.error('No user credentials found. Log in with jamsocket login')
    }

    const { username, auth } = config
    const api = new JamsocketApi(auth)
    const responseBody = await api.serviceList(username)
    const services = responseBody.services

    for (const service of services) {
      this.log(service)
    }
  }
}
