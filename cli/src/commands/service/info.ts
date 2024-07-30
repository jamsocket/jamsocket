import { Command } from '@oclif/core'
import chalk from 'chalk'
import { formatDistanceToNow } from 'date-fns'
import { Jamsocket } from '../../jamsocket'
import { blue, gray, lightBlue, lightMagenta, lightGreen } from '../../lib/formatting'

export default class Create extends Command {
  static description = 'Gets some information about a service'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service',
  ]

  static args = [{ name: 'name', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Create)

    const jamsocket = Jamsocket.fromEnvironment()
    const info = await jamsocket.serviceInfo(args.name)

    const appBaseUrl = jamsocket.api.getAppBaseUrl()

    const lastSpawn = info.last_spawned_at ? blue(`${formatDistanceToNow(new Date(info.last_spawned_at))} ago`) : '-'
    let lastPush = '-'
    if (info.last_image_upload_time) {
      lastPush = [
        blue(info.last_image_digest!),
        gray(`(${formatDistanceToNow(new Date(info.last_image_upload_time))} ago)`),
      ].join(' ')
    }

    this.log(chalk.bold`Service: ${lightMagenta(info.name)}`)
    this.log(`  account: ${blue(info.account_name)}`)
    this.log(`  created: ${blue(`${formatDistanceToNow(new Date(info.created_at))} ago`)}`)
    this.log(`  last spawn: ${lastSpawn}`)
    this.log(`  last image push: ${lastPush}`)
    this.log(`  dashboard: ${lightGreen(`${appBaseUrl}/service/${info.account_name}/${info.name}`)}`)

    if (info.environments.length > 1) {
      this.log()
      this.log(chalk.bold`Environments:`)
      info.environments.sort((a, b) => a.created_at.localeCompare(b.created_at))
      for (const e of info.environments) {
        this.log(`  ${lightMagenta(e.name)}`)
        this.log(`    cluster: ${lightBlue(e.cluster)}`)
        this.log(`    image tag/digest: ${lightBlue(e.image_tag)}`)
        this.log(`    last spawned: ${e.last_spawned_at ? blue(`${formatDistanceToNow(new Date(e.last_spawned_at))} ago`) : '-'}`)
      }
    } else {
      this.log(`  cluster: ${lightBlue(info.environments[0].cluster)}`)
      this.log(`  image tag/digest: ${lightBlue(info.environments[0].image_tag)}`)
    }

    this.log()
  }
}
