import { Command, Flags } from '@oclif/core'
import { Jamsocket } from '../jamsocket'

export default class Push extends Command {
  static description = 'Pushes a docker image to the jamcr.io container registry under your logged in user\'s name'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service my-image',
    '<%= config.bin %> <%= command.id %> my-service my-image -t my-tag',
  ]

  static flags = {
    tag: Flags.string({ char: 't', description: 'optional tag to apply to the image in the jamsocket registry' }),
  }

  static args = [
    { name: 'service', description: 'Jamsocket service to push the image to', required: true },
    { name: 'image', description: 'Docker image to push', required: true },
  ]

  public async run(): Promise<void> {
    const jamsocket = Jamsocket.fromEnvironment()
    const { args, flags } = await this.parse(Push)
    await jamsocket.push(args.service, args.image, flags.tag)
  }
}
