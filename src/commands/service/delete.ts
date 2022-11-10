import { Command, CliUx } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import * as inquirer from 'inquirer'
import { formatDistanceToNow } from 'date-fns'
import chalk from 'chalk'

export default class Create extends Command {
  static description = 'Deletes a service'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service',
  ]

  static args = [{ name: 'name', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Create)

    const jamsocket = Jamsocket.fromEnvironment()
    const serviceInfo = await jamsocket.serviceInfo(args.name)

    const spawnTokenCount = serviceInfo.spawn_tokens_count
    const lastImgUpload = serviceInfo.last_image_upload_time ? formatDistanceToNow(new Date(serviceInfo.last_image_upload_time)) : null
    const lastSpawn = serviceInfo.last_spawned_at ? formatDistanceToNow(new Date(serviceInfo.last_spawned_at)) : null

    const formattedInfo: string[] = [
      'The service',
      chalk.bold.cyan(serviceInfo.name),
      lastImgUpload === null ? ('has ' + chalk.bold.magentaBright`no container images` + ',') : ('had a ' + chalk.bold.magentaBright`container image pushed to it ${lastImgUpload} ago` + ','),
      spawnTokenCount === 0 ? ('has ' + chalk.bold.magentaBright`no spawn tokens` + ',') : ('has ' + chalk.bold.magentaBright`${spawnTokenCount} spawn tokens` + ','),
      lastSpawn === null ? ('and has ' + chalk.bold.magentaBright`never been spawned` + '.') : ('and was ' + chalk.bold.magentaBright`last spawned ${lastSpawn} ago` + '.'),
    ]

    this.log()
    this.log(formattedInfo.join(' '))
    this.log(`(For more information about this service, run \`jamsocket service info ${serviceInfo.name}\`.)\n`)

    const response = await inquirer.prompt([{
      name: 'confirmDelete',
      message: 'Are you sure you want to delete this service? This action cannot be undone!',
      type: 'list',
      choices: [{ name: 'no' }, { name: 'yes' }],
    }])

    if (response.confirmDelete !== 'yes') {
      this.log('Service deletion canceled.')
      return
    }

    this.log()
    const userInput = await CliUx.ux.prompt(`Type the service name (${serviceInfo.name}) to delete it. (Anything else will abort.)`, {
      required: false,
    })
    if (userInput.trim() !== serviceInfo.name) {
      this.log('Input does not match service name. Service deletion canceled.')
      return
    }

    await jamsocket.serviceDelete(args.name)

    this.log(`Deleted service: ${args.name}`)
  }
}
