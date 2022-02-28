import { Command, Flags } from '@oclif/core'
import { readJamsocketConfig } from '../common'
import { JamsocketApi } from '../api'
import { ContainerManager } from '../container-manager'

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
    const config = readJamsocketConfig()
    if (config === null) {
      this.error('No user credentials found. Log in with jamsocket login')
    }

    const { args, flags } = await this.parse(Push)
    const { username, auth } = config
    const api = new JamsocketApi(auth)
    const containerManager = new ContainerManager()

    let prefixedImage = await (await api.serviceImage(username, args.service)).imageName
    if (flags.tag) prefixedImage += `:${flags.tag}`

    this.log('Tagging.')
    containerManager.tag(args.image, prefixedImage)

    this.log('Pushing.')
    await containerManager.push(prefixedImage, auth)

    this.log('Done.')
  }
}
