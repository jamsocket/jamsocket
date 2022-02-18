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
    const response = await request(endpoint, null, {
      headers: { 'Authorization': `Basic ${auth}` },
    })

    // TODO: Handle creation errors & authentication errors
    // console.log(response.statusCode)
    // console.log(response.statusMessage)

    // TODO: handle malformed response
    const services = JSON.parse(response.body).services
    for (const service of services) {
      // TODO: print a table that gives information about each service
      this.log(service)
    }
  }
}
