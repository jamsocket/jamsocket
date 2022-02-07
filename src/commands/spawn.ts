import { Command, Flags } from '@oclif/core'
import { request, readJamsocketConfig, API, SPAWN_INIT_ENDPOINT, REGISTRY } from '../common'

type SpawnRequestBody = {
  image: string;
  env?: Record<string, string>; // env vars always map strings to strings
}

export default class Spawn extends Command {
  static description = 'Spawns a session-lived application backend from the provided docker image'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-image -e=\'{"PORT":8080}\'',
  ]

  static flags = {
    env: Flags.string({ char: 'e', description: 'optional JSON object of environment variables to pass to the container' }),
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

    const endpoint = `${API}${SPAWN_INIT_ENDPOINT}`
    const responseBody = await request(endpoint, body, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    })

    // TODO: Give better instructions on how to use the values returned in the response
    const response = JSON.parse(responseBody)
    this.log(`response from ${endpoint}:`)
    this.log(JSON.stringify(response, null, 2))
  }
}
