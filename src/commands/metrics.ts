import { Command } from '@oclif/core'
import { Jamsocket } from '../jamsocket'


export default class Metrics extends Command {
  static description = 'Stream metrics from a running backend'
  static examples = [
    '<%= config.bin %> <%= command.id %> f7em2',
  ]

  static args = [
    { name: 'backend', description: 'The name of the backend, a random string of letters and numbers returned by the spawn command.', required: true },
  ]

  public async run(): Promise<void> {
    const jamsocket = Jamsocket.fromEnvironment()
    const { args } = await this.parse(Metrics)

    await jamsocket.streamMetrics(args.backend, line => {
      this.log(line)
    })
  }
}
