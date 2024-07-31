import { Command, Flags } from '@oclif/core'
import { spawnSync } from 'child_process'
import { resolve } from 'path'
import chalk from 'chalk'
import * as inquirer from 'inquirer'
import { Jamsocket } from '../jamsocket'
import { getImagePlatform, buildImage, BuildImageOptions } from '../lib/docker'
import { lightMagenta, blue } from '../lib/formatting'

export default class Push extends Command {
  static description =
    "Builds and pushes an image to Jamsocket's container registry using the provided Dockerfile."

  static examples = [
    '<%= config.bin %> <%= command.id %> my-service -f path/to/Dockerfile',
    '<%= config.bin %> <%= command.id %> my-service -f path/to/Dockerfile -c .',
    '<%= config.bin %> <%= command.id %> my-service my-image -t my-tag',
  ]

  static flags = {
    dockerfile: Flags.string({
      char: 'f',
      description: 'path to the Dockerfile to build the image from',
    }),
    context: Flags.string({
      char: 'c',
      description:
        'path to the build context for the Dockerfile (defaults to current working directory)',
    }),
    tag: Flags.string({
      char: 't',
      description: 'optional tag to apply to the image in the jamsocket registry',
    }),
    ['include-git-commit']: Flags.boolean({
      char: 'g',
      description:
        'optionally include git commit metadata as labels in the image (uses the git repo of the docker context)',
    }),
  }

  static args = [
    { name: 'service', description: 'Jamsocket service to push the image to', required: true },
    {
      name: 'image',
      description: 'Optionally, provide an image to push instead of a Dockerfile',
      required: false,
    },
  ]

  public async run(): Promise<void> {
    const jamsocket = Jamsocket.fromEnvironment()
    const { args, flags } = await this.parse(Push)

    // make sure either Dockerfile or an image is provided (not both or neither)
    if (Boolean(args.image) === Boolean(flags.dockerfile)) {
      this.error(
        'Either an image or a Dockerfile must be provided. Rerun with --help for more information.',
      )
    }

    let image: string | null = null

    if (args.image) {
      if (flags.context !== undefined) {
        throw new Error('--context flag should only be used with the --dockerfile flag')
      }
      if (flags['include-git-commit']) {
        throw new Error(
          'The --include-git-commit flag can only be used when building a fresh image. Please provide a Dockerfile with the --dockerfile flag.',
        )
      }
      const { os, arch } = getImagePlatform(args.image)
      if (os !== 'linux' || arch !== 'amd64') {
        this.log()
        this.warn(
          chalk.bold
            .red`The image ${args.image} may not be compatible with Jamsocket because its image os/arch is ${os}/${arch}.`,
        )
        this.log(
          'If you encounter errors while spawning with this image, you may need to rebuild the image with the platform flag (--platform=linux/amd64) and push again.',
        )
        this.log()

        const response = await inquirer.prompt([
          {
            name: 'goAhead',
            message: lightMagenta('Go ahead and push image?'),
            type: 'list',
            choices: [{ name: 'no' }, { name: 'yes' }],
          },
        ])

        if (response.goAhead !== 'yes') {
          this.log('Image push canceled.')
          return
        }
      }
      image = args.image
    }

    if (flags.dockerfile) {
      let labels: Record<string, string> = {}
      if (flags['include-git-commit']) {
        // check for unstaged changes
        const cwd = flags.context ? resolve(process.cwd(), flags.context) : process.cwd()
        const encoding = 'utf-8'
        const result = spawnSync('git', ['diff-index', '--quiet', 'HEAD', '--'], { encoding, cwd })
        if (result.status !== 0) {
          this.error(
            'There unstaged changes in the git repository. The --include-git-commit flag can only be used if there are no unstaged changes. Please commit or stash these changes before continuing.',
          )
        }

        try {
          const hash = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding })
            .output.join('\n')
            .trim()
          const message = spawnSync('git', ['log', '-1', '--pretty=%B'], { cwd, encoding })
            .output.join('\n')
            .trim()
          const branch = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding })
            .output.join('\n')
            .trim()
          const originUrl = spawnSync('git', ['remote', 'get-url', 'origin'], {
            cwd,
            encoding,
          })
            .output.join('\n')
            .trim()

          let repository: string | null = originUrl.split('github.com')[1] ?? null
          repository = originUrl.split('github.com')[1] ?? null
          repository = repository?.slice(1) ?? null
          if (repository.split('/').length !== 2) repository = null
          if (repository?.endsWith('.git')) {
            repository = repository.slice(0, -4)
          }

          labels = { hash, message, branch }
          if (repository) {
            labels.repository = repository
          }
        } catch (error) {
          this.error('Error retrieving git information:', error as any)
        }
      }

      const options: BuildImageOptions = { labels }
      if (flags.context) {
        options.path = resolve(process.cwd(), flags.context)
      }
      this.log(blue(`Building image from Dockerfile: ${flags.dockerfile}`))
      image = await buildImage(flags.dockerfile, options)
    }

    if (!image) {
      // we should never encounter this error because of the check at the beginning of the function
      this.error('Error building/finding image.')
    }

    this.log()
    this.log(blue('Pushing image to Jamsocket...'))
    await jamsocket.push(args.service, image, flags.tag)
  }
}
