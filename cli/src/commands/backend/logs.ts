import { Command } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import { blue } from '../../lib/formatting'

export default class Logs extends Command {
    static description = 'Stream logs from a running backend.'
    static aliases = ['logs']
    static examples = [
      '<%= config.bin %> <%= command.id %> f7em2',
    ]

    static args = [
      { name: 'backend', description: 'The name of the backend, a random string of letters and numbers returned by the spawn command.', required: true },
    ]

    public async run(): Promise<void> {
      const jamsocket = Jamsocket.fromEnvironment()
      const { args } = await this.parse(Logs)

      console.log(blue('Reminder: you can find help troubleshooting common issues at https://docs.jamsocket.com/platform/troubleshooting'))
      console.log()

      const logsStream = jamsocket.streamLogs(args.backend, line => {
        this.log(line)
      })

      await logsStream.closed
    }
}
