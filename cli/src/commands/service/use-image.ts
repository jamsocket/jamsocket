import { Command, Flags } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import { blue, lightBlue, lightMagenta } from '../../lib/formatting'

export default class UseImage extends Command {
  static description = 'Sets the image tag or digest to use when spawning a service'

  static examples = ['<%= config.bin %> <%= command.id %> my-service -i latest']

  static flags = {
    image: Flags.string({
      char: 'i',
      required: true,
      description:
        'image tag or digest for the service to use (Run `jamsocket images` for a list of images you can use.)',
    }),
  }

  static args = [
    {
      name: 'service',
      required: true,
      description: 'Name of service whose spawning image should be updated.',
    },
  ]

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(UseImage)

    const jamsocket = Jamsocket.fromEnvironment()

    const parts = args.service.split('/')
    if (parts.length > 2 || parts[0] === '' || parts[1] === '') {
      this.error(`Invalid service name: ${args.service}`)
    }

    const service = parts[0]
    const environment = parts[1] ?? null

    await jamsocket.updateEnvironment(service, environment, flags.image)

    const fullServiceName = environment ? `${service}/${environment}` : service
    this.log(`Updated ${lightMagenta(fullServiceName)} to use image ${blue(flags.image)}`)
    this.log(
      `Run ${lightBlue(`jamsocket service info ${service}`)} for more information about your service.`,
    )
  }
}
