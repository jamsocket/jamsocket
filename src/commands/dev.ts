import { existsSync } from 'fs'
import path from 'path'
import { Command } from '@oclif/core'
import { Jamsocket } from '../jamsocket'
import DevServer from '../dev-server'

export default class Dev extends Command {
  static description = 'Starts a jamsocket dev server'
  static examples = ['<%= config.bin %> <%= command.id %>']

  public async run(): Promise<void> {
    const jamsocket = Jamsocket.fromEnvironment()
    const { dockerfile, service, watch } = loadProjectConfig()
    const account = jamsocket.config?.getAccount()

    if (!account) {
      throw new Error('Must be logged in to use this command. Log in with jamsocket login')
    }

    const devServer = new DevServer(jamsocket, { dockerfile, service, watch, account })
    await devServer.start()
  }
}

const PROJECT_CONFIG_PATH = path.resolve(process.cwd(), 'jamsocket.config.js')

function loadProjectConfig(): { dockerfile: string, service: string, watch?: string[] } {
  if (!existsSync(PROJECT_CONFIG_PATH)) throw new Error('No jamsocket.config.js found in current directory')
  const { dockerfile, service, watch } = require(PROJECT_CONFIG_PATH)
  return {
    dockerfile: path.resolve(process.cwd(), dockerfile),
    service,
    watch: typeof watch === 'string' ? [watch] : watch,
  }
}
