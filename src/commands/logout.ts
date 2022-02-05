import { execSync } from 'child_process'
import { Command } from '@oclif/core'
import { deleteJamsocketConfig, REGISTRY } from '../common'

export default class Logout extends Command {
  static description = 'Logs out of jamcr.io container registry and removes locally-stored credentials.'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {}
  static args = []

  public async run(): Promise<void> {
    // TODO: wrap in try/catch to handle errors
    execSync(`docker logout ${REGISTRY}`)
    deleteJamsocketConfig()
    this.log('Removing login credentials')
  }
}
