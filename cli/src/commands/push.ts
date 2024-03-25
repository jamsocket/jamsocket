import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import { Jamsocket } from '../jamsocket'
import { getImagePlatform, buildImage } from '../docker'
import { lightMagenta, blue } from '../formatting'

export default class Push extends Command {
  static description = 'Builds and pushes an image to Jamsocket\'s container registry using the provided Dockerfile.'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service -f path/to/Dockerfile',
    '<%= config.bin %> <%= command.id %> my-service -f path/to/Dockerfile -c .',
    '<%= config.bin %> <%= command.id %> my-service my-image -t my-tag',
  ]

  static flags = {
    dockerfile: Flags.string({ char: 'f', description: 'path to the Dockerfile to build the image from' }),
    context: Flags.string({ char: 'c', description: 'path to the build context for the Dockerfile (defaults to current working directory)' }),
    tag: Flags.string({ char: 't', description: 'optional tag to apply to the image in the jamsocket registry' }),
  }

  static args = [
    { name: 'service', description: 'Jamsocket service to push the image to', required: true },
    { name: 'image', description: 'Optionally, provide an image to push instead of a Dockerfile', required: false },
  ]

  public async run(): Promise<void> {
    const jamsocket = Jamsocket.fromEnvironment()
    const { args, flags } = await this.parse(Push)

    // make sure either Dockerfile or an image is provided (not both or neither)
    if (Boolean(args.image) === Boolean(flags.dockerfile)) {
      this.error('Either an image or a Dockerfile must be provided. Rerun with --help for more information.')
    }

    let image: string | null = null

    if (args.image) {
      if (flags.context !== undefined) {
        throw new Error('--context flag should only be used with the --dockerfile flag')
      }
      const { os, arch } = getImagePlatform(args.image)
      if (os !== 'linux' || arch !== 'amd64') {
        this.log()
        this.warn(chalk.bold.red`The image ${args.image} may not be compatible with Jamsocket because its image os/arch is ${os}/${arch}.`)
        this.log('If you encounter errors while spawning with this image, you may need to rebuild the image with the platform flag (--platform=linux/amd64) and push again.')
        this.log()

        const response = await inquirer.prompt([{
          name: 'goAhead',
          message: lightMagenta('Go ahead and push image?'),
          type: 'list',
          choices: [{ name: 'no' }, { name: 'yes' }],
        }])

        if (response.goAhead !== 'yes') {
          this.log('Image push canceled.')
          return
        }
      }
      image = args.image
    }

    if (flags.dockerfile) {
      const options = flags.context ? { path: flags.context } : undefined
      this.log(blue(`Building image from Dockerfile: ${flags.dockerfile}`))
      image = await buildImage(flags.dockerfile, options)
    }

    if (!image) {
      // we should never encounter this error because of the check at the beginning of the function
      this.error('Error building/finding image.')
    }

    this.log()
    this.log(blue('Pushing image to Jamsocket...'))
    await jamsocket.push(args.service, image, flags.tag)
  }
}
