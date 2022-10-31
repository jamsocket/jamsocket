import { Command, Flags } from '@oclif/core'
import * as inquirer from 'inquirer'
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
    const { os, arch } = jamsocket.getImagePlatform(args.image)
    if (os !== 'linux' || arch !== 'amd64') {
      this.log()
      this.warn(`The image ${args.image} may not be compatible with Jamsocket because its image os/arch is ${os}/${arch}.`)
      this.log('If you encounter errors while spawning with this image, you may need to rebuild the image with the platform flag (--platform=linux/amd64) and push again.')
      this.log()

      const response = await inquirer.prompt([{
        name: 'goAhead',
        message: 'Go ahead and push image?',
        type: 'list',
        choices: [{ name: 'no' }, { name: 'yes' }],
      }])

      if (response.goAhead !== 'yes') {
        this.log('Image push canceled.')
        return
      }
    }
    await jamsocket.push(args.service, args.image, flags.tag)
  }
}
