import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { Jamsocket } from '../jamsocket'
import * as customFlags from '../flags'
import { blue, lightBlue } from '../formatting'

const MAX_PORT = (2 ** 16) - 1

export default class Spawn extends Command {
  static description = 'Spawns a session backend with the provided service\'s docker image.'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service',
    '<%= config.bin %> <%= command.id %> my-service prod',
    '<%= config.bin %> <%= command.id %> my-service -e SOME_ENV_VAR=foo -e ANOTHER_ENV_VAR=bar',
    '<%= config.bin %> <%= command.id %> my-service -g 60',
    '<%= config.bin %> <%= command.id %> my-service -t latest',
  ]

  static flags = {
    // passing { multiple: true } here due to a bug: https://github.com/oclif/core/pull/414
    env: customFlags.env({ multiple: true }),
    grace: Flags.integer({ char: 'g', description: 'optional grace period (in seconds) to wait after last connection is closed before shutting down container' }),
    port: Flags.integer({ char: 'p', description: 'optional port for jamsocket to proxy requests to (default is 8080)', hidden: true }),
    tag: Flags.string({ char: 't', description: 'optional tag for the service to spawn (default is latest)' }),
    'require-bearer-token': Flags.boolean({ char: 'r', description: 'require a bearer token to access the service. A random bearer token will be generated and returned in the result.' }),
    lock: Flags.string({ char: 'l', description: 'optional lock to spawn the service with' }),
  }

  static args = [
    { name: 'service', required: true, description: 'name of service to spawn' },
    { name: 'environment', required: false, description: 'service environment to spawn the service with (optional if service only has one environment, otherwise required)' },
  ]

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Spawn)

    const env = flags.env ? Object.fromEntries(flags.env) : undefined

    if (flags.port !== undefined && (flags.port < 1 || flags.port > MAX_PORT)) {
      this.error(`Error parsing port. Must be an integer >= 1 and <= ${MAX_PORT}. Received for --port: ${flags.port}`)
    }

    const jamsocket = Jamsocket.fromEnvironment()
    const responseBody = await jamsocket.spawn(args.service, args.environment, env, flags.grace, flags.port, flags.tag, flags['require-bearer-token'], flags.lock)

    this.log(lightBlue('Backend spawned!'))
    this.log(chalk.bold`backend name:   `, blue(responseBody.name))
    this.log(chalk.bold`backend status: `, blue(responseBody.status ?? '-'))
    this.log(chalk.bold`backend url:    `, blue(responseBody.url))
    this.log(chalk.bold`status url:     `, blue(responseBody.status_url))
    this.log(chalk.bold`ready url:      `, blue(responseBody.ready_url))
    if (responseBody.bearer_token) {
      this.log(chalk.bold`bearer token:   `, blue(responseBody.bearer_token))
    }
    if (flags.lock) {
      this.log(chalk.bold`spawned:        `, blue(responseBody.spawned.toString()))
    }
  }
}
