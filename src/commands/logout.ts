import { exec } from 'child_process'
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
    const { stderr } = exec(`docker logout ${REGISTRY}`, err => {
      if (err) throw err
      // TODO: check response status code
      // remove locally-stored credentials
      deleteJamsocketConfig()
    })
    stderr?.on('data', chunk => process.stderr.write(chunk))
  }
}
