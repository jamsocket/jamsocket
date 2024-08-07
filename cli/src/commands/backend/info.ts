import { Command } from '@oclif/core'
import chalk from 'chalk'
import { Jamsocket } from '../../jamsocket'
import { formatDistanceToNow } from 'date-fns'
import prettyBytes from '../../lib/pretty-bytes'
import { blue, lightBlue, lightMagenta, lightGreen } from '../../lib/formatting'
import { V2State } from '../../api'

export default class Info extends Command {
  static description = 'Retrieves information about a backend given a Backend ID.'
  static examples = ['<%= config.bin %> <%= command.id %> a8m32q']

  static args = [{ name: 'backend', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Info)

    const jamsocket = Jamsocket.fromEnvironment()
    const info = await jamsocket.backendInfo(args.backend)

    const appBaseUrl = jamsocket.api.getAppBaseUrl()

    this.log(chalk.bold`Info for backend: ${lightMagenta(info.id)}`)
    this.log(
      `created:      ${blue(info.created_at)} (${formatDistanceToNow(new Date(info.created_at))} ago)`,
    )
    this.log(`service:      ${blue(info.service_name)}`)
    this.log(`account:      ${blue(info.account_name)}`)
    this.log(`cluster:      ${blue(info.cluster_name)}`)
    this.log(`image digest: ${blue(info.image_digest)}`)
    if (info.key) this.log(`key:          ${blue(info.key)}`)
    if (info.environment_name && info.environment_name !== 'default')
      this.log(`environment:  ${blue(info.environment_name)}`)
    if (info.max_mem_bytes) this.log(`mem usage:    ${blue(prettyBytes(info.max_mem_bytes))}`)
    this.log(`dashboard:    ${lightGreen(`${appBaseUrl}/backend/${info.id}`)}`)
    this.log()
    this.log(chalk.bold`Statuses:`)
    if (info.statuses.length === 0) {
      this.log('backend has no statuses')
    } else {
      info.statuses.sort((a, b) => (a.time > b.time ? 1 : -1))
      for (const status of info.statuses) {
        this.log(`${status.time}  ${lightBlue(status.status)} ${formatStatusMeta(status)}`)
      }
    }
  }
}

function formatStatusMeta(value: V2State): string {
  const meta: string[] = []
  if (
    value.status === 'scheduled' ||
    value.status === 'loading' ||
    value.status === 'starting' ||
    value.status === 'waiting' ||
    value.status === 'ready'
  ) {
    return ''
  }

  meta.push(`reason: ${value.termination_reason}`)

  if (value.status === 'terminated') {
    meta.push(`kind: ${value.termination_kind}`, `exit code: ${value.exit_code ?? '-'}`)
  }

  return `(${meta.join(', ')})`
}
