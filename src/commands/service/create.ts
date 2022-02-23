import { Command } from '@oclif/core'
import { request, readJamsocketConfig, API, SERVICE_CREATE_ENDPOINT } from '../../common'

export default class Create extends Command {
  static description = 'Creates a service'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service',
  ]

  static args = [{ name: 'name', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Create)
    const config = readJamsocketConfig()
    if (config === null) {
      this.error('No user credentials found. Log in with jamsocket login')
    }

    const { auth } = config
    const body = { name: args.name }

    const endpoint = `${API}${SERVICE_CREATE_ENDPOINT}`
    const response = await request(endpoint, body, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}` },
    })

    let responseBody
    try {
      responseBody = JSON.parse(response.body)
    } catch (error) {
      this.error(`jamsocket: error parsing JSON response: ${error}`)
    }

    if (response.statusCode && response.statusCode >= 400) {
      const { message, status, code, id } = responseBody.error
      this.error(`jamsocket: ${status} - ${code}: ${message} (id: ${id})`)
    } else {
      this.log(`Created service: ${body.name}`)
    }
  }
}
