import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { Command, Flags } from '@oclif/core'
import { createDevServer } from '../dev-server'
import { type BuildImageOptions, getDockerNetworks } from '../lib/docker'
import { JamsocketApi } from '../api'
import { JamsocketConfig } from '../jamsocket-config'

const PROJECT_CONFIG_PATH_JS = path.resolve(process.cwd(), 'jamsocket.config.js')
const PROJECT_CONFIG_PATH_JSON = path.resolve(process.cwd(), 'jamsocket.config.json')

type ProjectConfig = {
  dockerfile?: string
  watch?: string | string[]
  port?: number
  interactive?: boolean
  useStaticToken?: boolean
  styleLogOutput?: boolean
  dockerOptions?: {
    path?: string
    network?: string
  }
}

function isProjectConfig(obj: any): obj is ProjectConfig {
  if (typeof obj !== 'object' || obj === null) return false
  if (obj.dockerfile && typeof obj.dockerfile !== 'string') return false
  if (obj.watch && typeof obj.watch !== 'string' && !Array.isArray(obj.watch)) return false
  if (obj.port && typeof obj.port !== 'number') return false
  if (obj.interactive && typeof obj.interactive !== 'boolean') return false
  if (obj.useStaticToken && typeof obj.useStaticToken !== 'boolean') return false
  if (obj.styleLogOutput && typeof obj.styleLogOutput !== 'boolean') return false
  if (obj.dockerOptions) {
    if (typeof obj.dockerOptions !== 'object' || obj.dockerOptions === null) return false
    if (obj.dockerOptions.path && typeof obj.dockerOptions.path !== 'string') return false
    if (obj.dockerOptions.network && typeof obj.dockerOptions.network !== 'string') return false
  }
  return true
}

function getProjectConfig(): ProjectConfig | null {
  const hasJson = existsSync(PROJECT_CONFIG_PATH_JSON)
  const hasJs = existsSync(PROJECT_CONFIG_PATH_JS)
  if (hasJson && hasJs) {
    throw new Error(
      'Both jamsocket.config.js and jamsocket.config.json files exist. Please remove one of them.',
    )
  }

  if (hasJson) {
    const projectConfig = JSON.parse(readFileSync(PROJECT_CONFIG_PATH_JSON, 'utf8'))
    if (!isProjectConfig(projectConfig)) {
      throw new Error(
        'Invalid jamsocket.config.json file. Please see https://docs.jamsocket.com/platform/advanced/dev-cli for more information.',
      )
    }
    return projectConfig
  }

  // TODO: phase out JS support?
  if (hasJs) {
    // eslint-disable-next-line unicorn/prefer-module
    const projectConfig = require(PROJECT_CONFIG_PATH_JS)
    if (!isProjectConfig(projectConfig)) {
      throw new Error(
        'Invalid jamsocket.config.js file. Please see https://docs.jamsocket.com/platform/advanced/dev-cli for more information.',
      )
    }
    return projectConfig
  }
  return null
}

export default class Dev extends Command {
  static description =
    'Starts a local jamsocket dev server. You may configure the dev server with a jamsocket.config.json file in the current directory or by passing flags. (Flags take precedence over jamsocket.config.json)'
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --dockerfile session-backend/Dockerfile --watch src --watch package.json --port 8080',
  ]

  static flags = {
    // TODO: breaking change: remove this and only use -f instead of -d
    dockerfileold: Flags.string({
      char: 'd',
      description: "Path to the session backend's Dockerfile",
      hidden: true,
    }),
    dockerfile: Flags.string({
      char: 'f',
      description: "Path to the session backend's Dockerfile",
    }),
    context: Flags.string({
      char: 'c',
      description:
        'Path to the build context for the Dockerfile (defaults to current working directory)',
    }),
    'docker-network': Flags.string({
      char: 'n',
      hidden: true,
      description: 'The Docker network to use for the session backend (only for development)',
    }),
    watch: Flags.string({
      char: 'w',
      multiple: true,
      description: 'A file or directory to watch for changes',
    }),
    port: Flags.integer({
      char: 'p',
      description: 'The port to run the dev server on. (Defaults to 8080)',
    }),
    interactive: Flags.boolean({
      char: 'i',
      description: 'Enables/Disables TTY iteractivity. (Defaults to true)',
      allowNo: true,
    }),
    'use-static-token': Flags.boolean({
      char: 's',
      hidden: true,
      description:
        'Makes session backends use a static connection token instead of generating a new one with each spawn/connect request. (Defaults to false)',
      allowNo: false,
    }),
    'style-log-output': Flags.boolean({
      description:
        'Styles log output from session backends for better readability. (Defaults to true)',
      allowNo: true,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Dev)

    pingAuth()

    const projectConfig = getProjectConfig()
    const dockerfile = flags.dockerfile ?? flags.dockerfileold ?? projectConfig?.dockerfile ?? null
    if (!dockerfile) {
      throw new Error(
        'No Dockerfile provided. Please provide a Dockerfile with the --dockerfile flag or a jamsocket.config.js file in the current directory.',
      )
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

    const dockerNetwork =
      flags['docker-network'] ?? projectConfig?.dockerOptions?.network ?? undefined

    if (dockerNetwork) {
      const availableDockerNetworks = getDockerNetworks()
      if (!availableDockerNetworks.includes(dockerNetwork)) {
        throw new Error(
          `Docker network "${dockerNetwork}" not found. Available networks: ${availableDockerNetworks.join(', ')}`,
        )
      }
    }

    const useStaticToken = flags['use-static-token'] ?? projectConfig?.useStaticToken ?? undefined
    const styleLogOutput = flags['style-log-output'] ?? projectConfig?.styleLogOutput ?? undefined

    await createDevServer({
      dockerfile: path.resolve(process.cwd(), dockerfile),
      watch: watch?.map((w) => path.resolve(process.cwd(), w)),
      port,
      interactive,
      dockerOptions,
      useStaticToken,
      dockerNetwork,
      styleLogOutput,
    })
  }
}

async function pingAuth() {
  const api = JamsocketApi.fromEnvironment()
  const savedConfig = JamsocketConfig.fromSaved()

  if (savedConfig !== null) {
    try {
      await api.checkAuthConfig(savedConfig)
    } catch {}
  }
}
