import { Command } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import chalk from 'chalk'

function prettifyBytes(bytes: number) {
  const suffixes = ['B', 'KiB', 'MiB', 'GiB']
  let i = 0
  for (i; bytes > 1 << 10; i++) {
    bytes /= 1 << 10
  }
  return bytes.toFixed(2) + ' ' + suffixes[i]
}

type BackendMetrics = {
  cluster: string,
  backend_id: string,
  mem_used: number,
  mem_available: number,
  cpu_used: number,
  sys_cpu: number
}

const formatToHeader = (a: string, header: string) => a.padEnd(header.length, ' ')
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
    this.log(chalk.bold('cpu_util\tmem_used\tmem_avail'))

    await jamsocket.streamMetrics(args.backend, line => {
      const metrics: BackendMetrics = JSON.parse(line)
      const cpu_util = (metrics.cpu_used / metrics.sys_cpu) * 100
      process.stdout.write(
        `\r${formatToHeader(cpu_util.toFixed(1) + '%', 'cpu_util')}\t` +
          `${formatToHeader(prettifyBytes(metrics.mem_used), 'mem_used')}\t` +
          `${formatToHeader(prettifyBytes(metrics.mem_available), 'mem_avail')}`)
    })
  }
}
