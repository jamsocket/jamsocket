import { Command } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import { lightMagenta } from '../../formatting'

export default class Terminate extends Command {
  static description = 'Terminates one or more backends given the backend name(s).'
  // we turn off strict mode so that we can accept multiple values for the same argument
  static strict = false
  static aliases = ['terminate']
  static examples = [
    '<%= config.bin %> <%= command.id %> abc123 def456 ...',
  ]

  static args = [{ name: 'backends', required: true }]

  public async run(): Promise<void> {
    // it's not possible to have a multiple values for the same argument, so this is the workaround
    const backends = [...this.argv]
    const jamsocket = Jamsocket.fromEnvironment()

    for (const backend of backends) {
      try {
        await jamsocket.terminate(backend)
      } catch {
        this.warn(`Failed to request termination for backend: ${lightMagenta(backend)}. Skipping...`)
        continue
      }
      this.log(`Termination requested for backend: ${lightMagenta(backend)}`)
    }
  }
}
