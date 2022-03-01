import { Command, Flags } from '@oclif/core'
import { JamsocketApi, TokenRequestBody } from '../../api'
import { readJamsocketConfig } from '../../common'

const MAX_PORT = (2 ** 16) - 1

export default class Create extends Command {
  static description = 'Generate a token that can be used to spawn the given service.'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service',
    '<%= config.bin %> <%= command.id %> my-service --port 8080',
    '<%= config.bin %> <%= command.id %> my-service --tag latest --port 8080 --grace 300',
  ]

  static flags = {
    grace: Flags.integer({ char: 'g', description: 'optional grace period (in seconds) to wait after last connection is closed before shutting down container' }),
    port: Flags.integer({ char: 'p', description: 'optional port for jamsocket to proxy requests to (default is 8080)' }),
    tag: Flags.string({ char: 't', description: 'optional tag for the service to spawn (default is latest)' }),
  }

  static args = [{ name: 'service', required: true }]

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Create)
    const config = readJamsocketConfig()
    if (config === null) {
      this.error('No user credentials found. Log in with jamsocket login')
    }

    const body: TokenRequestBody = {}
    if (flags.grace) {
      // eslint-disable-next-line camelcase
      body.grace_period = flags.grace
    }

    if (flags.port !== undefined) {
      if (flags.port < 1 || flags.port > MAX_PORT) {
        this.error(`Error parsing port. Must be an integer >= 1 and <= ${MAX_PORT}. Received for --port: ${flags.port}`)
      }

      body.port = flags.port
    }

    if (flags.tag) {
      body.tag = flags.tag
    }

    const { username, auth } = config

    const api = new JamsocketApi(auth)
    const { token } = await api.tokenCreate(username, args.service, body)
    this.log(token)
  }
}
