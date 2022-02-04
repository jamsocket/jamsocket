import { Command, Flags } from '@oclif/core'
import { readJamsocketConfig } from '../common'

export default class Push extends Command {
  static description = 'Pushes a docker image to the jamcr.io container registry under your logged in user\'s name'

  static examples = [
    '<%= config.bin %> <%= command.id %> 33fe99c5649e -t my-image',
  ]

  static flags = {
    tag: Flags.string({ char: 't', description: 'optional tag to apply to the docker image' }),
  }

  static args = [{ name: 'image', description: 'Docker image to push to jamcr.io', required: true }]

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Push)
    // if tag is provided, docker tag [image] [tag]
    // if no tag is provided, tag === image
    const config = readJamsocketConfig()
    if (config === null) {
      // throw an error here about not being logged in
      return
    }
    // run docker tag if necessary
    // get stored username
    const { username } = config
    // docker push jamcr.io/USERNAME/TAG
  }
}
