import { existsSync } from 'fs'
import path from 'path'
import { Command } from '@oclif/core'
import { Jamsocket } from '../jamsocket'
import { buildImage } from '../docker'

export default class Dev extends Command {
  static description = 'Starts a jamsocket dev server'
  static examples = ['<%= config.bin %> <%= command.id %>']

  public async run(): Promise<void> {
    const jamsocket = Jamsocket.fromEnvironment()
    const { dockerfile, service } = loadProjectConfig()

    const imageId = buildImage(dockerfile)
    await jamsocket.push(service, imageId)

    this.log('Built and pushed image to registry. ImageID:', imageId)
  }
}

const PROJECT_CONFIG_PATH = path.resolve(process.cwd(), 'jamsocket.config.js')

function loadProjectConfig(): { dockerfile: string, service: string } {
  if (!existsSync(PROJECT_CONFIG_PATH)) throw new Error('No jamsocket.config.js found in current directory')
  const { dockerfile, service } = require(PROJECT_CONFIG_PATH)
  return {
    dockerfile: path.resolve(process.cwd(), dockerfile),
    service,
  }
}
