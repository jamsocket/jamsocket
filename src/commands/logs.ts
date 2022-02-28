import { Command } from '@oclif/core'
import { readJamsocketConfig } from '../common'
import { JamsocketApi } from '../api'

export default class Logs extends Command {
    static description = 'Stream logs from a running backend.'

    static examples = [
      '<%= config.bin %> <%= command.id %> f7em2',
    ]

    static args = [
      { name: 'backend', description: 'The name of the backend, a random string of letters and numbers returned by the spawn command.', required: true },
    ]

    public async run(): Promise<void> {
      const config = readJamsocketConfig()
      if (config === null) {
        this.error('No user credentials found. Log in with jamsocket login')
      }

      const { args } = await this.parse(Logs)
      const { auth } = config
      const api = new JamsocketApi(auth)

      await api.streamLogs(args.backend, line => {
        this.log(line)
      })
    }
}
