import { Command, Flags } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import { blue, lightBlue, lightMagenta } from '../../formatting'

export default class UseImage extends Command {
  static description = 'Sets the image tag or digest to use when spawning a service/environment'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service -i latest',
    '<%= config.bin %> <%= command.id %> my-service prod -i sha256:1234abcd',
  ]

  static flags = {
    image: Flags.string({ char: 'i', required: true, description: 'image tag or digest for the service/environment to use (Run `jamsocket images` for a list of images you can use.)' }),
  }

  static args = [
    { name: 'service', required: true, description: 'name of service whose image should be updated' },
    { name: 'environment', required: false, description: 'service environment whose image should be updated (optional, if omitted the default environment is used)' },
  ]

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(UseImage)

    const jamsocket = Jamsocket.fromEnvironment()

    const environment = args.environment ?? 'default'
    await jamsocket.updateEnvironment(args.service, environment, flags.image)

    this.log(`Updated ${lightMagenta(`${args.service}/${environment}`)} to use image ${blue(flags.image)}`)
    this.log(`Run ${lightBlue(`jamsocket service info ${args.service}`)} for more information about your service and its environments.`)
  }
}
