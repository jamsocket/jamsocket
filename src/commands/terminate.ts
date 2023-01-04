import { Command, Flags } from '@oclif/core'
import { Jamsocket } from '../jamsocket'

const MAX_PORT = (2 ** 16) - 1

export default class Terminate extends Command {
  static description = 'Terminates a backend based on its backend name.'

  static examples = [
    '<%= config.bin %> <%= command.id %> a8m32q',
  ]

  static args = [{ name: 'backend', required: true }]

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Terminate)

    const jamsocket = Jamsocket.fromEnvironment()
    const responseBody = await jamsocket.terminate(args.backend)

    this.log(JSON.stringify(responseBody, null, 2))
  }
}
