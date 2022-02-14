import { spawn, spawnSync } from 'child_process'
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
      this.error('No user credentials found. Log in with jamsocket login')
    }

    const { args, flags } = await this.parse(Push)

    const { username } = config
    const prefixedImage = `${REGISTRY}/${username}/${flags.tag ?? args.image}`

    const tagOutput = spawnSync('docker', ['tag', args.image, prefixedImage], { encoding: 'utf-8' })
    process.stderr.write(tagOutput.stderr)
    if (tagOutput.status !== 0) {
      this.error(tagOutput.error ?? 'Error tagging image')
    }

    const pushProcess = spawn('docker', ['push', prefixedImage], { stdio: 'inherit' })
    pushProcess.on('close', code => {
      if (code === 0) {
        this.log('Image Successfully Pushed')
      } else {
        this.error('There was an error pushing the image')
      }
    })
  }
}
