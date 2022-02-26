import { Command } from '@oclif/core'
import { deleteJamsocketConfig } from '../common'

export default class Logout extends Command {
  static description = 'Logs out of jamcr.io container registry and removes locally-stored credentials.'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {}
  static args = []

  public async run(): Promise<void> {
    deleteJamsocketConfig()
    this.log('Removed login credentials')
  }
}
