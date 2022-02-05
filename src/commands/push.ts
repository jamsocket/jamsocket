import { execSync } from 'child_process'
import { Command, Flags } from '@oclif/core'
import { readJamsocketConfig, REGISTRY } from '../common'

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
    const config = readJamsocketConfig()
    if (config === null) {
      // TODO: throw an error here about not being logged in
      return
    }

    const { args, flags } = await this.parse(Push)

    const { username } = config
    const prefixedImage = `${REGISTRY}/${username}/${flags.tag ?? args.image}`

    if (flags.tag) {
      // TODO: sanitize user input before passing to this command
      // TODO: wrap in try/catch to handle errors
      execSync(`docker tag ${args.image} ${prefixedImage}`)
    }

    // TODO: wrap in try/catch to handle errors
    // TODO: sanitize user input before using username or image in command
    // TODO: don't use execSync, so we can show docker's upload progress
    const output = execSync(`docker push ${prefixedImage}`, { encoding: 'utf-8' })
    console.log('docker push response:', output)
    this.log('Image Successfully Pushed')
  }
}
