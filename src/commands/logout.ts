import {Command} from '@oclif/core'

export default class Logout extends Command {
  static description = 'Logs out of jamcr.io container registry and removes locally-stored credentials.'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {}
  static args = []

  public async run(): Promise<void> {
    this.log('not implemented')
    // docker logout jamcr.io
    // remove locally-stored credentials from $HOME/.jamsocket/config.json
  }
}
