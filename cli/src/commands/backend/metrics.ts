import { Command } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import chalk from 'chalk'
import { blue, lightGreen } from '../../formatting'

function prettifyBytes(bytes: number) {
  const suffixes = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const i = Math.trunc(Math.log2(bytes) / 10)
  return (bytes / (1024 ** i)).toFixed(2) + ' ' + suffixes[i]
}

type BackendMetrics = {
  cluster: string,
  backend_id: string,
  mem_used: number,
  mem_available: number,
  cpu_used: number,
  sys_cpu: number
}

const resetLine = '\r\u001B[0K' // set cursor to start of line, then clear to end of line
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

    const appBaseUrl = jamsocket.api.getAppBaseUrl()
    this.log()
    this.log(blue(`Note: you can see more detailed metrics for this backend at ${lightGreen(`${appBaseUrl}/backend/${args.backend}`)}\n`))

    const headers = ['cpu util', 'mem used', 'mem avail']
    function formatRow(values: string[]) {
      const output = values.map((val, i) => val.padEnd(headers[i].length, ' '))
      return output.join('\t')
    }

    this.log(chalk.bold(headers.join('\t')))

    const metricsStream = jamsocket.streamMetrics(args.backend, line => {
      const metrics: BackendMetrics = JSON.parse(line)
      const cpu_util = (metrics.cpu_used / metrics.sys_cpu) * 100
      const values = [
        cpu_util.toFixed(1) + '%',
        prettifyBytes(metrics.mem_used),
        prettifyBytes(metrics.mem_available),
      ]
      process.stdout.write(resetLine + formatRow(values))
    })

    await metricsStream.closed
  }
}
