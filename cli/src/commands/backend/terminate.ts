import { Command, Flags } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import { lightMagenta } from '../../lib/formatting'

export default class Terminate extends Command {
  static description = 'Terminates one or more backends given the backend name(s).'
  // we turn off strict mode so that we can accept multiple values for the same argument
  static strict = false
  static aliases = ['terminate']
  static examples = ['<%= config.bin %> <%= command.id %> abc123 def456 ...']

  static args = [{ name: 'backends', required: true }]
  static flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'whether to force the backend to hard terminate (defaults to false)',
    }),
  }

  public async run(): Promise<void> {
    // it's not possible to have a multiple values for the same argument, so this is the workaround
    const backends = this.argv.filter((arg) => !arg.startsWith('-'))
    const { flags } = await this.parse(Terminate)
    const jamsocket = Jamsocket.fromEnvironment()

    for (const backend of backends) {
      try {
        await jamsocket.terminate(backend, flags.force)
      } catch {
        this.warn(
          `Failed to request termination for backend: ${lightMagenta(backend)}. Skipping...`,
        )
        continue
      }
      this.log(`Termination requested for backend: ${lightMagenta(backend)}`)
    }
  }
}
