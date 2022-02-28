import { Command } from '@oclif/core'
import { JamsocketApi } from '../../api'
import { readJamsocketConfig } from '../../common'

export default class Create extends Command {
  static description = 'Creates a service'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service',
  ]

  static args = [{ name: 'name', required: true }]

  public async run(): Promise<void> {
    const { args } = await this.parse(Create)
    const config = readJamsocketConfig()
    if (config === null) {
      this.error('No user credentials found. Log in with jamsocket login')
    }

    const { username, auth } = config

    const api = new JamsocketApi(auth)
    await api.serviceCreate(username, args.name)

    this.log(`Created service: ${args.name}`)
  }
}
