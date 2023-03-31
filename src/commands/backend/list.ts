import { Command, CliUx } from '@oclif/core'
import { BackendWithStatus } from '../../api'
import { Jamsocket } from '../../jamsocket'

function formatDate(date: string): string {
  const d = new Date(date)
  const tzOffset = d.getTimezoneOffset()
  const hours = Math.abs(Math.floor(tzOffset / 60)).toString().padStart(2, '0')
  const mins = (Math.abs(tzOffset) % 60).toString().padStart(2, '0')
  const sign = tzOffset < 0 ? '-' : '+'
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()} (GMT${sign}${hours}:${mins})`
}

export default class List extends Command {
  static description = 'List running backends for the logged-in user'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  public async run(): Promise<void> {
    const jamsocket = Jamsocket.fromEnvironment()
    const responseBody = await jamsocket.listRunningBackends()

    if (responseBody.running_backends.length === 0) {
      this.log('No running backends found.\n')
      return
    }

    this.log()
    this.log('Found the following running backends:\n')
    CliUx.ux.table<BackendWithStatus>(responseBody.running_backends, {
      name: { header: 'Name' },
      created_at: {
        header: 'Created',
        get: row => formatDate(row.created_at),
      },
      account_name: { header: 'Account' },
      service_name: { header: 'Service' },
      status: {
        header: 'Status',
        get: row => row.status ? `${row.status} (${formatDate(row.status_timestamp!)})` : '-',
      },
    }, {
      printLine: this.log.bind(this),
    })
    this.log()
  }
}
