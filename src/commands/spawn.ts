import {Command, Flags} from '@oclif/core'

export default class Spawn extends Command {
  static description = 'Spawns a session-lived application backend from the provided docker image'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {
    env: Flags.string({char: 'e', description: 'optional JSON object of environment variables to pass to the container'}),
  }

  static args = [{name: 'image'}]

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Spawn)
    this.log(`not implemented: called with image: "${args.image}" and env: "${flags.env}"`)

    // get username
    // if not found, bail and tell user they need to login with jamsocket login first
    // otherwise construct image as jamcr.io/USERNAME/IMAGE
    // get base64-encoded username:password and construct authorization header using username:password
    // take provided image and env vars and construct body of request
    // get back 3 URLs (status URL, loading page URL, direct-to-container URL) and print out instructions for using them

    // curl -d \
    // -H "Authorization: Bearer ${TOKEN}" \
    // -H "Content-Type: application/json" \
    // '{"image": "jamcr.io/acmecorp/hello-app"}' \
    // -X POST https://jamsocket.dev/spawn/init
  }
}
