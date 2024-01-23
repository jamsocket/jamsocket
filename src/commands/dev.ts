import { existsSync } from 'fs'
import path from 'path'
import { Command } from '@oclif/core'
import { createDevServer } from '../dev-server'

export default class Dev extends Command {
  static description = '(Experimental) Starts a jamsocket dev server.'
  static examples = ['<%= config.bin %> <%= command.id %>']

  public async run(): Promise<void> {
    const { dockerfile, watch, port } = loadProjectConfig()
    await createDevServer({ dockerfile, watch, port })
  }
}

const PROJECT_CONFIG_PATH = path.resolve(process.cwd(), 'jamsocket.config.js')

function loadProjectConfig(): { dockerfile: string, watch?: string[], port?: number } {
  if (!existsSync(PROJECT_CONFIG_PATH)) throw new Error('No jamsocket.config.js found in current directory')
  const { dockerfile, watch, port } = require(PROJECT_CONFIG_PATH)
  return {
    dockerfile: path.resolve(process.cwd(), dockerfile),
    watch: typeof watch === 'string' ? [watch] : watch,
    port,
  }
}
