import {Command} from '@oclif/core'

export default class Login extends Command {
  static description = 'Authenticates user with jamcr.io container registery'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {}

  static args = []

  public async run(): Promise<void> {
    this.log('not implemented')
    // prompt for username
    // prompt for password
    // use docker login and check response status code
    // if status code is good, save username, and username:password base64-encoded in $HOME/.jamsocket/config.json
    // if status code is not good, tell the user it failed and to try again
  }
}
