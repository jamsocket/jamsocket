import { Command, CliUx } from '@oclif/core'
import { Image } from '../../api'
import { Jamsocket } from '../../jamsocket'

export default class Images extends Command {
  static aliases = ['images']

  static description = 'List uploaded images for a given service (limited to 50 most recent images)'

  static examples = ['<%= config.bin %> <%= command.id %> my-service']

  static args = [{ name: 'service', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Images)

    const jamsocket = Jamsocket.fromEnvironment()
    const responseBody = await jamsocket.imagesList(args.service)

    if (responseBody.images.length === 0) {
      this.log('No images found for this service.\n')
      return
    }

    this.log()

    if (responseBody.images.length >= 50) {
      this.log('Found 50 or more images. Showing the 50 most recent.\n')
    } else {
      this.log('Found the following images:\n')
    }

    CliUx.ux.table<Image>(
      responseBody.images,
      {
        digest: { header: 'Digest' },
        tag: { header: 'Tag' },
        upload_time: {
          header: 'Uploaded',
          get: (row) => new Date(row.upload_time),
        },
        repository: { header: 'Repository' },
      },
      {
        printLine: this.log.bind(this),
      },
    )
    this.log()
  }
}
