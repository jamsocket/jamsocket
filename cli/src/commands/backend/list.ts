import { Command, CliUx } from '@oclif/core'
import { formatDistanceToNow } from 'date-fns'
import { BackendWithStatus } from '../../api'
import { Jamsocket } from '../../jamsocket'

export default class List extends Command {
  static description = 'List running backends for the logged-in user'

  static examples = ['<%= config.bin %> <%= command.id %>']

  public async run(): Promise<void> {
    const jamsocket = Jamsocket.fromEnvironment()
    const responseBody = await jamsocket.listRunningBackends()

    if (responseBody.running_backends.length === 0) {
      this.log('No running backends found.\n')
      return
    }

    this.log()
    this.log('Found the following running backends:\n')
    CliUx.ux.table<BackendWithStatus>(
      responseBody.running_backends,
      {
        id: { header: 'ID' },
        created_at: {
          header: 'Created',
          get: (row) => `${formatDistanceToNow(new Date(row.created_at))} ago`,
        },
        account_name: { header: 'Account' },
        service_name: { header: 'Service' },
        status: {
          header: 'Status',
          get: (row) => {
            return row.status
              ? `${row.status.status} (${formatDistanceToNow(new Date(row.status.time))})`
              : '-'
          },
        },
        key: {
          header: 'Key (aka Lock)',
          get: (row) => {
            return row.key ? row.key : ''
          },
        },
      },
      {
        printLine: this.log.bind(this),
      },
    )
    this.log()
  }
}
