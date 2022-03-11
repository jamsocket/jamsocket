import { Command, Flags } from '@oclif/core'
import { JamsocketApi, SpawnRequestBody } from '../api'
import { readJamsocketConfig } from '../common'

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
    const config = readJamsocketConfig()
    if (config === null) {
      this.error('No user credentials found. Log in with jamsocket login')
    }

    const { username, auth } = config
    const body: SpawnRequestBody = {}
    if (flags.env) {
      let env
      try {
        env = JSON.parse(flags.env)
      } catch (error) {
        this.error(`Error parsing env. Must be valid JSON. ${error}`)
      }

      body.env = env
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

    if (flags.grace) {
      // eslint-disable-next-line camelcase
      body.grace_period_seconds = flags.grace
    }

    const api = new JamsocketApi(auth)
    const responseBody = await api.spawn(username, args.service, body)

    this.log(JSON.stringify(responseBody, null, 2))
  }
}
