import { Command, Flags } from '@oclif/core'
import { request, readJamsocketConfig, API, SPAWN_INIT_ENDPOINT, REGISTRY } from '../common'

type SpawnRequestBody = {
  image: string;
  env?: Record<string, string>; // env vars always map strings to strings
  port?: number;
}

const MAX_PORT = (2 ** 16) - 1

export default class Spawn extends Command {
  static description = 'Spawns a session-lived application backend from the provided docker image'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-image -e=\'{"PORT":8080}\'',
  ]

  static flags = {
    env: Flags.string({ char: 'e', description: 'optional JSON object of environment variables to pass to the container' }),
    port: Flags.integer({ char: 'p', description: 'port for jamsocket to send requests to (default is 8080)' }),
  }

  static args = [{ name: 'image' }]

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Spawn)
    const config = readJamsocketConfig()
    if (config === null) {
      this.error('No user credentials found. Log in with jamsocket login')
    }

    const { username, auth } = config
    const body: SpawnRequestBody = { image: `${REGISTRY}/${username}/${args.image}` }
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

    const endpoint = `${API}${SPAWN_INIT_ENDPOINT}`
    const response = await request(endpoint, body, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}` },
    })

    // TODO: Give better instructions on how to use the values returned in the response
    this.log(`response from ${endpoint}:`)
    this.log(JSON.stringify(JSON.parse(response.body), null, 2))
  }
}
