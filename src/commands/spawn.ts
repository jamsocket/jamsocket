import { Command, Flags } from '@oclif/core'
import { readJamsocketConfig, API, SPAWN_INIT_ENDPOINT, REGISTRY } from '../common'

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
    this.log(`not implemented: called with image: "${args.image}" and env: "${flags.env}"`)

    const config = readJamsocketConfig()
    if (config === null) {
      // throw an error here about not being logged in
      return
    }

    const { username, auth } = config
    const body: SpawnRequestBody = { image: `${REGISTRY}/${username}/${args.image}` }
    if (flags.env) {
      // decode env and throw if not JSON
      const env = JSON.parse(flags.env)
      body.env = env
    }

    const headers = {
      // eslint-disable-next-line quote-props
      'Authorization': `Bearer ${auth}`,
      'Content-Type': 'application/json',
    }

    const endpoint = `${API}${SPAWN_INIT_ENDPOINT}`
    const jsonBody = JSON.stringify(body)

    // if not found, bail and tell user they need to login with jamsocket login first
    // otherwise construct image as jamcr.io/USERNAME/IMAGE
    // get base64-encoded username:password and construct authorization header using username:password
    // take provided image and env vars and construct body of request
    // get back 3 URLs (status URL, loading page URL, direct-to-container URL) and print out instructions for using them

    // curl -d \
    // -H "Authorization: Bearer ${auth}" \
    // -H "Content-Type: application/json" \
    // '{"image": "jamcr.io/acmecorp/hello-app"}' \
    // -X POST https://jamsocket.dev/spawn/init
  }
}
