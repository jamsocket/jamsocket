import { Command, Flags } from '@oclif/core'
import { Jamsocket } from '../jamsocket'

const MAX_PORT = (2 ** 16) - 1

export default class Spawn extends Command {
  static description = 'Spawns a session-lived application backend from the provided docker image'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service',
    '<%= config.bin %> <%= command.id %> my-service -p 8080',
    '<%= config.bin %> <%= command.id %> my-service -e=\'{"SOME_ENV_VAR": "foo"}\'',
    '<%= config.bin %> <%= command.id %> my-service -g 60',
    '<%= config.bin %> <%= command.id %> my-service -t latest',
  ]

  static flags = {
    env: Flags.string({ char: 'e', description: 'optional JSON object of environment variables to pass to the container' }),
    grace: Flags.integer({ char: 'g', description: 'optional grace period (in seconds) to wait after last connection is closed before shutting down container' }),
    port: Flags.integer({ char: 'p', description: 'optional port for jamsocket to proxy requests to (default is 8080)' }),
    tag: Flags.string({ char: 't', description: 'optional tag for the service to spawn (default is latest)' }),
  }

  static args = [{ name: 'service', required: true }]

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Spawn)

    let env
    if (flags.env) {
      try {
        env = JSON.parse(flags.env)
      } catch (error) {
        this.error(`Error parsing env. Must be valid JSON. ${error}`)
      }
    }

    if (flags.port !== undefined && (flags.port < 1 || flags.port > MAX_PORT)) {
      this.error(`Error parsing port. Must be an integer >= 1 and <= ${MAX_PORT}. Received for --port: ${flags.port}`)
    }

    const jamsocket = Jamsocket.fromEnvironment()
    const responseBody = await jamsocket.spawn(args.service, env, flags.grace, flags.port, flags.tag)

    this.log(JSON.stringify(responseBody, null, 2))
  }
}
