import { Command } from '@oclif/core'
import { request, readJamsocketConfig, API, getServiceListEndpoint } from '../../common'

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

    const endpoint = `${API}${getServiceListEndpoint(username)}`
    const responseBody = await request(endpoint, null, {
      headers: { 'Authorization': `Basic ${auth}` },
    })

    // TODO: Handle creation errors & authentication errors
    this.log(`response from ${endpoint}:`)
    this.log(responseBody)
  }
}
