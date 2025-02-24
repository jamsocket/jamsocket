import { Command, Flags, CliUx } from '@oclif/core'
import { Jamsocket } from '../../jamsocket'
import { lightBlue, lightMagenta } from '../../lib/formatting'

export default class TerminateBackends extends Command {
  static description =
    'Terminates all backends for the given service that were spawned before the given timestamp.'
  static aliases = ['terminate-all-backends']
  static examples = ['<%= config.bin %> <%= command.id %> my-service --before 2025-01-01T00:00:00Z']
  static hidden = true

  static args = [{ name: 'service', required: true }]
  static flags = {
    before: Flags.string({
      char: 'b',
      description:
        'all the service\'s backends that were spawned before this timestamp will be terminated (e.g. "2025-01-01T00:00:00Z")',
      required: true,
    }),
    'dry-run': Flags.boolean({
      char: 'd',
      description: 'whether to perform a dry run (defaults to false)',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'whether to force the backends to hard terminate (defaults to false)',
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(TerminateBackends)
    const jamsocket = Jamsocket.fromEnvironment()

    const service = args.service
    const before = new Date(flags.before).toISOString()
    const dryRun = flags['dry-run'] ?? false
    const force = flags.force ?? false

    const beforeFormatted = `${lightBlue(new Date(before).toString())}`

    const dryRunResult = await jamsocket.terminateAllBackends(service, {
      before,
      hard: false,
      dry_run: true,
    })
    if (dryRunResult.backend_count === 0) {
      this.log(`There are no running backends spawned before ${beforeFormatted}.`)
      return
    }
    const isPlural = dryRunResult.backend_count > 1
    this.log(
      `There ${isPlural ? 'are' : 'is'} ${lightBlue(`${dryRunResult.backend_count}`)} running backend${isPlural ? 's' : ''} spawned before ${beforeFormatted} that will be terminated.`,
    )
    if (dryRun) return

    this.log()
    this.log(lightMagenta('This command should only be run in emergencies. Terminating lots of backends at once may result in a large number of new backends being spawned which may hit rate limits.'))
    this.log()
    this.log('This command may take several seconds to complete. And may need to be run multiple times with the same input in order to terminate all backends before the given timestamp.')
    this.log()

    const confirmation = await CliUx.ux.prompt(
      `Are you sure you want to terminate ${lightBlue(`${dryRunResult.backend_count}`)} backends? (Type "yes" to continue)`,
    )
    if (confirmation.trim().toLowerCase() !== 'yes') {
      this.log('Termination canceled.')
      return
    }

    const result = await jamsocket.terminateAllBackends(service, {
      before,
      hard: force,
      dry_run: dryRun,
    })
    this.log(
      `Successfully sent termination requests for ${lightBlue(`${result.terminated_count}`)} of ${lightBlue(`${dryRunResult.backend_count}`)} backends.`,
    )
    if (!result.is_complete) {
      this.log(
        'Termination is not complete. Run the command again with the same input to terminate the remaining backends.',
      )
    }
  }
}
