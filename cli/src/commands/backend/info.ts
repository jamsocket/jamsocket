import { Command } from '@oclif/core'
import chalk from 'chalk'
import { Jamsocket } from '../../jamsocket'
import { blue, lightBlue, lightMagenta, lightGreen } from '../../formatting'

export default class Info extends Command {
  static description = 'Retrieves information about a backend given its name.'
  static examples = [
    '<%= config.bin %> <%= command.id %> a8m32q',
  ]

  static args = [{ name: 'backend', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Info)

    const jamsocket = Jamsocket.fromEnvironment()
    const info = await jamsocket.backendInfo(args.backend)

    const appBaseUrl = jamsocket.api.getAppBaseUrl()

    this.log(chalk.bold`Info for backend: ${lightMagenta(info.name)}`)
    this.log(`created:      ${blue(info.created_at)}`)
    this.log(`service:      ${blue(info.service_name)}`)
    this.log(`account:      ${blue(info.account_name)}`)
    this.log(`cluster:      ${blue(info.cluster_name)}`)
    this.log(`image digest: ${blue(info.image_digest)}`)
    if (info.lock) this.log(`lock:         ${blue(info.lock)}`)
    if (info.environment_name) this.log(`environment:  ${blue(info.environment_name)}`)
    if (info.max_mem_bytes) this.log(`mem usage:    ${blue(`${info.max_mem_bytes} bytes`)}`)
    this.log(`dashboard:    ${lightGreen(`${appBaseUrl}/backend/${info.name}`)}`)
    this.log()
    this.log(chalk.bold`Statuses:`)
    if (info.statuses.length === 0) {
      this.log('backend has no statuses')
    } else {
      info.statuses.sort((a, b) => a.timestamp > b.timestamp ? 1 : -1)
      for (const status of info.statuses) {
        this.log(`${status.timestamp}  ${lightBlue(status.value)}`)
      }
    }
  }
}
