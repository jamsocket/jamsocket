import { Command, Flags } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'

const MAX_PORT = (2 ** 16) - 1

export default class Create extends Command {
  static description = 'Generate a token that can be used to spawn the given service.'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service',
    '<%= config.bin %> <%= command.id %> my-service --tag latest --grace 300',
  ]

  static flags = {
    grace: Flags.integer({ char: 'g', description: 'optional grace period (in seconds) to wait after last connection is closed before shutting down container' }),
    port: Flags.integer({ char: 'p', hidden: true, description: 'optional port for jamsocket to proxy requests to (default is 8080)' }),
    tag: Flags.string({ char: 't', description: 'optional tag for the service to spawn (default is latest)' }),
  }

  static args = [{ name: 'service', required: true }]

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Create)

    if (flags.port !== undefined && (flags.port < 1 || flags.port > MAX_PORT)) {
      this.error(`Error parsing port. Must be an integer >= 1 and <= ${MAX_PORT}. Received for --port: ${flags.port}`)
    }

    const jamsocket = Jamsocket.fromEnvironment()

    const { token } = await jamsocket.spawnTokenCreate(args.service, flags.grace, flags.port, flags.tag)
    this.log(token)
  }
}
