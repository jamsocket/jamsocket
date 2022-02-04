import {Command, Flags} from '@oclif/core'

export default class Push extends Command {
  static description = 'Pushes a docker image to the jamcr.io container registry under your logged in user\'s name'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {
    tag: Flags.string({char: 't', description: 'optional tag to apply to the docker image'}),
  }

  static args = [{name: 'image', description: 'Docker image to push to jamcr.io', required: true}]

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Push)
    this.log(`not implemented: called with image: "${args.image}" and tag: "${flags.tag}"`)
    // if tag is provided, docker tag [image] [tag]
    // if no tag is provided, tag === image
    // get stored username
    // if no username, tell user they must log in first with jamsocket login
    // docker push jamcr.io/USERNAME/TAG
  }
}
