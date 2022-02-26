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

    let responseBody
    try {
      responseBody = JSON.parse(response.body)
    } catch (error) {
      this.error(`jamsocket: error parsing JSON response - ${error}: ${response.body}`)
    }

    if (response.statusCode && response.statusCode >= 400) {
      const { message, status, code, id } = responseBody.error
      this.error(`jamsocket: ${status} - ${code}: ${message} (id: ${id})`)
    } else {
      // TODO: print a table that gives information about each service
      const services = responseBody.services
      for (const service of services) {
        this.log(service)
      }
    }
  }
}
