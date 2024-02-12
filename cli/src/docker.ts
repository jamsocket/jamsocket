import { SpawnSyncOptionsWithStringEncoding, SpawnSyncReturns, StdioOptions, spawn, spawnSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { JAMSOCKET_CONFIG_DIR } from './jamsocket-config'

export function getImagePlatform(imageName: string): { os: string, arch: string } {
  const getPlatform = spawnDockerSync(['image', 'inspect', '--format', '{{.Os}} {{.Architecture}}', imageName])
  if (getPlatform.stdout === null) throw new Error('Docker exited without errors but unable to detect image platform.')
  const stdout = getPlatform.stdout.toString().trim()
  const [os, arch] = stdout.split(' ').map(s => s.trim())
  return { os, arch }
}

export type BuildImageOptions = {
  path?: string;
}

export function buildImage(dockerfilePath: string, options?: BuildImageOptions): string {
  const optionsWithDefaults: Required<BuildImageOptions> = {
    path: '.',
    ...options,
  }

  const buildProcess = spawnDockerSync(['build', '--quiet', '--platform', 'linux/amd64', '-f', dockerfilePath, optionsWithDefaults.path])
  // eslint-disable-next-line unicorn/better-regex
  const match = /sha256:([a-f0-9]+)/.exec(buildProcess.stdout)
  const imageId = match?.[1] || null
  if (imageId === null) {
    throw new Error("Docker exited without errors but couldn't extract image id from output.")
  }
  return imageId
}

export async function push(imageName: string, auth: string): Promise<void> {
  const dockerConfigDir = join(JAMSOCKET_CONFIG_DIR, 'docker-config')
  mkdirSync(dockerConfigDir, { recursive: true })

  const registry = imageName.split('/')[0]
  const config = {
    'auths': {
      [registry]: { auth },
    },
  }

  const configPath = join(dockerConfigDir, 'config.json')
  writeFileSync(configPath, JSON.stringify(config))

  await new Promise<void>((resolve, reject) => {
    const pushProcess = spawn('docker', ['--config', dockerConfigDir, 'push', imageName], { stdio: 'inherit' })
    pushProcess.on('error', err => {
      if (err.message.includes('ENOENT')) {
        reject(new Error('Docker command not found. Make sure Docker is installed and in your PATH.'))
      } else {
        reject(err)
      }
    })

    pushProcess.on('close', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error('Error pushing image'))
      }
    })
  })
}

export function tag(existingImageName: string, newImageName: string): void {
  spawnDockerSync(['tag', existingImageName, newImageName], { stdio: 'inherit' })
}

function spawnDockerSync(args: string[], options?: { stdio?: StdioOptions }): SpawnSyncReturns<string> {
  const opts: SpawnSyncOptionsWithStringEncoding = { encoding: 'utf-8', ...options }
  const result = spawnSync('docker', args, opts)
  const exitCode = result.status
  if (
    (exitCode !== null && exitCode !== 0) ||
    result.error !== undefined
  ) {
    if (result.stderr?.includes('No such image')) {
      throw new Error('Docker failed to find image. Make sure you have built the image and it\'s listed in the `docker images` command output before running this command.')
    }
    if (result.stderr?.includes('Cannot connect to the Docker daemon')) {
      throw new Error('Docker failed to connect to the Docker daemon. Make sure Docker is running and you have permission to access it.')
    }
    if (result.error?.message.includes('ENOENT')) {
      throw new Error('Docker command not found. Make sure Docker is installed and in your PATH.')
    }

    throw new Error(`Process "docker ${args.join(' ')}" exited with a non-zero code: ${exitCode} ${result.error} ${result.stderr}`)
  }
  return result
}
