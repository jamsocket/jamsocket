import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { Jamsocket } from '../../jamsocket'
import * as customFlags from '../../flags'
import { blue, lightBlue, lightGreen } from '../../formatting'
import { JamsocketConnectRequestBody } from '../../api'

export default class Spawn extends Command {
  static aliases = ['connect']

  static description = 'Gets a URL that can be used to connect to a session backend. Will spawn a new session backend if no key (aka lock) is provided or if no session backend is currently holding the provided key.'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service',
    '<%= config.bin %> <%= command.id %> my-service -k my-key',
    '<%= config.bin %> <%= command.id %> my-service -t my-tag',
    '<%= config.bin %> <%= command.id %> my-service -e SOME_ENV_VAR=foo -e ANOTHER_ENV_VAR=bar',
    '<%= config.bin %> <%= command.id %> my-service -i 60',
    '<%= config.bin %> <%= command.id %> my-service -l 300',
    '<%= config.bin %> <%= command.id %> my-service --no-spawn',
    '<%= config.bin %> <%= command.id %> my-service -u my-user -a \'{"foo":"my-json-data"}\'',
  ]

  static flags = {
    // passing { multiple: true } here due to a bug: https://github.com/oclif/core/pull/414
    env: customFlags.env({ multiple: true }),
    tag: Flags.string({ char: 't', description: 'An optional image tag or image digest to use when spawning a backend.' }),
    'max-idle-seconds': Flags.integer({ char: 'i', description: 'The max time in seconds a session backend should wait after last connection is closed before shutting down container (default is 300)' }),
    'lifetime-limit-seconds': Flags.integer({ char: 'l', description: 'The max time in seconds the session backend should be allowed to run.' }),
    key: Flags.string({ char: 'k', description: 'If provided, fetches the session backend currently holding the given key (formerly known as a "lock"). If no session backend holds the key, or if a key is not provided, a new session backend will be spawned.' }),
    user: Flags.string({ char: 'u', description: 'Optional username to be associated with the URL/connection string returned by the connect command.' }),
    auth: Flags.string({ char: 'a', description: 'Optional serialized JSON to be passed to a session backend when connecting with the returned URL/connection string.' }),
    spawn: Flags.boolean({ default: true, allowNo: true, description: 'Whether to spawn a new session backend if no session backend is currently holding the provided key.' }),
  }

  static args = [
    { name: 'service', required: true, description: 'Name of service to spawn.' },
  ]

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Spawn)

    const env = flags.env ? Object.fromEntries(flags.env) : undefined

    const parts = args.service.split('/')
    if (parts.length > 2 || parts[0] === '' || parts[1] === '') {
      this.error(`Invalid service/environment name: ${args.service}`)
    }

    const service = parts[0]
    const environment = parts[1]

    let auth: Record<string, any> | undefined
    if (flags.auth) {
      try {
        auth = JSON.parse(flags.auth)
      } catch {
        this.error('Failed to parse JSON provided to --auth flag.')
      }
    }

    const connectReqBody: JamsocketConnectRequestBody = {
      key: flags.key,
      user: flags.user,
      auth,
    }

    if (flags.spawn === false) {
      if (connectReqBody.key === undefined) {
        this.error('The --no-spawn flag requires a key to be provided.')
      }
      if (flags.tag) {
        this.warn('Ignoring --tag flag because --no-spawn flag was provided.')
      }
      if (flags['max-idle-seconds']) {
        this.warn('Ignoring --max-idle-seconds flag because --no-spawn flag was provided.')
      }
      if (flags['lifetime-limit-seconds']) {
        this.warn('Ignoring --lifetime-limit-seconds flag because --no-spawn flag was provided.')
      }
      if (flags.env) {
        this.warn('Ignoring --env flag because --no-spawn flag was provided.')
      }
      connectReqBody.spawn = false
    } else {
      connectReqBody.spawn = {
        tag: flags.tag,
        executable: {
          env,
        },
        lifetime_limit_seconds: flags['lifetime-limit-seconds'],
        max_idle_seconds: flags['max-idle-seconds'],
      }
    }

    const jamsocket = Jamsocket.fromEnvironment()
    const responseBody = await jamsocket.connect(service, environment, connectReqBody)

    const appBaseUrl = jamsocket.api.getAppBaseUrl()

    this.log(lightBlue('Backend spawned!'))
    this.log(chalk.bold`backend id:     `, blue(responseBody.backend_id))
    this.log(chalk.bold`backend status: `, blue(responseBody.status ?? '-'))
    this.log(chalk.bold`backend url:    `, blue(responseBody.url))
    this.log(chalk.bold`status url:     `, blue(responseBody.status_url))
    this.log(chalk.bold`ready url:      `, blue(responseBody.ready_url))
    if (flags.key) {
      this.log(chalk.bold`spawned:        `, blue(responseBody.spawned.toString()))
    }
    this.log(chalk.bold`dashboard:      `, lightGreen(`${appBaseUrl}/backend/${responseBody.backend_id}`))
  }
}
