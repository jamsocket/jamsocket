import { Command, CliUx } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import * as inquirer from 'inquirer'
import { formatDistanceToNow } from 'date-fns'
import { lightBlue, lightMagenta } from '../../lib/formatting'
import { Flags } from '@oclif/core'

export default class Delete extends Command {
  static description = 'Deletes a service'

  static examples = ['<%= config.bin %> <%= command.id %> my-service']

  static args = [{ name: 'service', required: true }]

  static flags = {
    yes: Flags.boolean({
      char: 'y',
      description: 'Skip confirmation prompt',
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Delete)

    const jamsocket = Jamsocket.fromEnvironment()
    const serviceInfo = await jamsocket.serviceInfo(args.service)

    const lastImgUpload = serviceInfo.last_image_upload_time
      ? formatDistanceToNow(new Date(serviceInfo.last_image_upload_time))
      : null
    const lastSpawn = serviceInfo.last_spawned_at
      ? formatDistanceToNow(new Date(serviceInfo.last_spawned_at))
      : null

    const formattedInfo: string[] = [
      'The service',
      lightBlue(serviceInfo.name),
      lastImgUpload === null
        ? 'has ' + lightMagenta('no container images') + ','
        : 'had a ' + lightMagenta(`container image pushed to it ${lastImgUpload} ago`) + ',',
      lastSpawn === null
        ? 'and has ' + lightMagenta('never been spawned') + '.'
        : 'and was ' + lightMagenta(`last spawned ${lastSpawn} ago`) + '.',
    ].filter(Boolean)

    this.log()
    this.log(formattedInfo.join(' '))
    this.log(
      `(For more information about this service, run \`jamsocket service info ${serviceInfo.name}\`.)\n`,
    )

    if (!flags.yes) {
      const response = await inquirer.prompt([
        {
          name: 'confirmDelete',
          message: 'Are you sure you want to delete this service? This action cannot be undone!',
          type: 'list',
          choices: [{ name: 'no' }, { name: 'yes' }],
        },
      ])

      if (response.confirmDelete !== 'yes') {
        this.log('Service deletion canceled.')
        return
      }

      this.log()
      const userInput = await CliUx.ux.prompt(
        `Type the service name (${serviceInfo.name}) to delete it. (Anything else will abort.)`,
        {
          required: false,
        },
      )
      if (userInput.trim() !== serviceInfo.name) {
        this.log('Input does not match service name. Service deletion canceled.')
        return
      }
    }

    await jamsocket.serviceDelete(args.service)

    this.log(`Deleted service: ${args.service}`)
  }
}
