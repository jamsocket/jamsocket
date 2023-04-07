import { Command } from '@oclif/core'
import { Jamsocket } from '../jamsocket'

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
    const boldStart = '\u001B[1m'
    const boldEnd = '\u001B[0m'
    this.log(boldStart + 'cpu_util\tmem_used\tmem_avail' + boldEnd)

    await jamsocket.streamMetrics(args.backend, line => {
      const metrics: BackendMetrics = JSON.parse(line)
      const cpu_util = (metrics.cpu_used / metrics.sys_cpu) * 100
      const mem_used_mb = metrics.mem_used * (10 ** (-6))
      const mem_avail_mb = metrics.mem_available * (10 ** (-6))
      this.log(
        `${formatToHeader(cpu_util.toFixed(1) + '%', 'cpu_util')}\t` +
          `${formatToHeader(mem_used_mb.toFixed(2) + ' mb', 'mem_used')}\t` +
          `${formatToHeader(mem_avail_mb.toFixed(2) + ' mb', 'mem_avail')}`)
    })
  }
}
