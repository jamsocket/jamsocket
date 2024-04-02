import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { Command, Flags } from '@oclif/core'
import { createDevServer } from '../dev-server'
import type { BuildImageOptions } from '../docker'

const PROJECT_CONFIG_PATH_JS = path.resolve(process.cwd(), 'jamsocket.config.js')
const PROJECT_CONFIG_PATH_JSON = path.resolve(process.cwd(), 'jamsocket.config.json')

type ProjectConfig = {
  dockerfile?: string,
  watch?: string | string[],
  port?: number
  interactive?: boolean,
  dockerOptions?: {
    path?: string
  }
}

function isProjectConfig(obj: any): obj is ProjectConfig {
  if (typeof obj !== 'object' || obj === null) return false
  if (obj.dockerfile && typeof obj.dockerfile !== 'string') return false
  if (obj.watch && typeof obj.watch !== 'string' && !Array.isArray(obj.watch)) return false
  if (obj.port && typeof obj.port !== 'number') return false
  if (obj.interactive && typeof obj.interactive !== 'boolean') return false
  if (obj.dockerOptions) {
    if (typeof obj.dockerOptions !== 'object' || obj.dockerOptions === null) return false
    if (obj.dockerOptions.path && typeof obj.dockerOptions.path !== 'string') return false
  }
  return true
}

function getProjectConfig(): ProjectConfig | null {
  const hasJson = existsSync(PROJECT_CONFIG_PATH_JSON)
  const hasJs = existsSync(PROJECT_CONFIG_PATH_JS)
  if (hasJson && hasJs) {
    throw new Error('Both jamsocket.config.js and jamsocket.config.json files exist. Please remove one of them.')
  }

  if (hasJson) {
    const projectConfig = JSON.parse(readFileSync(PROJECT_CONFIG_PATH_JSON, 'utf8'))
    if (!isProjectConfig(projectConfig)) {
      throw new Error('Invalid jamsocket.config.json file. Please see https://docs.jamsocket.com/platform/dev-cli for more information.')
    }
    return projectConfig
  }

  // TODO: phase out JS support?
  if (hasJs) {
    const projectConfig = require(PROJECT_CONFIG_PATH_JS)
    if (!isProjectConfig(projectConfig)) {
      throw new Error('Invalid jamsocket.config.js file. Please see https://docs.jamsocket.com/platform/dev-cli for more information.')
    }
    return projectConfig
  }
  return null
}

export default class Dev extends Command {
  static description = 'Starts a local jamsocket dev server. You may configure the dev server with a jamsocket.config.js file in the current directory or by passing flags. (Flags take precedence over jamsocket.config.js)'
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --dockerfile session-backend/Dockerfile --watch src --watch package.json --port 8080',
  ]

  static flags = {
    // TODO: breaking change: remove this and only use -f instead of -d
    dockerfileold: Flags.string({ char: 'd', description: 'Path to the session backend\'s Dockerfile', hidden: true }),
    dockerfile: Flags.string({ char: 'f', description: 'Path to the session backend\'s Dockerfile' }),
    context: Flags.string({ char: 'c', description: 'Path to the build context for the Dockerfile (defaults to current working directory)' }),
    watch: Flags.string({ char: 'w', multiple: true, description: 'A file or directory to watch for changes' }),
    port: Flags.integer({ char: 'p', description: 'The port to run the dev server on. (Defaults to 8080)' }),
    interactive: Flags.boolean({ char: 'i', description: 'Enables/Disables TTY iteractivity. (Defaults to true)', allowNo: true }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Dev)

    const projectConfig = getProjectConfig()
    const dockerfile = flags.dockerfile ?? flags.dockerfileold ?? projectConfig?.dockerfile ?? null
    if (!dockerfile) {
      throw new Error('No Dockerfile provided. Please provide a Dockerfile with the --dockerfile flag or a jamsocket.config.js file in the current directory.')
    }

    let watch = flags.watch ?? projectConfig?.watch ?? undefined
    if (typeof watch === 'string') {
      watch = [watch]
    }

    const port = flags.port ?? projectConfig?.port ?? undefined

    const interactive = flags.interactive ?? projectConfig?.interactive ?? undefined

    const dockerContext = flags.context ?? projectConfig?.dockerOptions?.path ?? undefined
    const dockerOptions: BuildImageOptions = {}
    if (dockerContext) {
      dockerOptions.path = path.resolve(process.cwd(), dockerContext)
    }

    await createDevServer({
      dockerfile: path.resolve(process.cwd(), dockerfile),
      watch: watch?.map(w => path.resolve(process.cwd(), w)),
      port,
      interactive,
      dockerOptions,
    })
  }
}
