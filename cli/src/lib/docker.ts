import {
  SpawnSyncOptionsWithStringEncoding,
  SpawnSyncReturns,
  StdioOptions,
  spawn,
  spawnSync,
} from 'child_process'
import crypto from 'crypto'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { JAMSOCKET_CONFIG_DIR } from '../jamsocket-config'

export function getImagePlatform(imageName: string): { os: string; arch: string } {
  const getPlatform = spawnDockerSync([
    'image',
    'inspect',
    '--format',
    '{{.Os}} {{.Architecture}}',
    imageName,
  ])
  if (getPlatform.stdout === null)
    throw new Error('Docker exited without errors but unable to detect image platform.')
  const stdout = getPlatform.stdout.toString().trim()
  const [os, arch] = stdout.split(' ').map((s) => s.trim())
  return { os, arch }
}

export type BuildImageOptions = {
  path?: string
  labels?: Record<string, string>
  buildContexts?: string[]
}

function getImageId(tag: string): string {
  const result = spawnDockerSync(['images', '--no-trunc', '--format', '{{.ID}}', tag])
  return result.stdout.trim()
}

type StdioWriteFn = (val: string) => void
export function buildImage(
  dockerfilePath: string,
  options?: BuildImageOptions,
  stdoutWrite?: StdioWriteFn,
  stderrWrite?: StdioWriteFn,
): Promise<string> {
  // Using a temporary tag is the best way to reliably get the image id.
  const tempTag = `temp-${crypto.randomUUID()}`

  const outWrite = stdoutWrite ?? process.stdout.write.bind(process.stdout)
  const errWrite = stderrWrite ?? process.stderr.write.bind(process.stderr)
  const optionsWithDefaults: Required<BuildImageOptions> = {
    path: '.',
    labels: {},
    buildContexts: [],
    ...options,
  }

  const args = ['build', '--platform', 'linux/amd64', '--tag', tempTag, '-f', dockerfilePath]
  const labels = Object.entries(optionsWithDefaults.labels)
  for (const [key, value] of labels) {
    args.push('--label')
    args.push(`${key}=${value}`)
  }
  for (const buildContext of optionsWithDefaults.buildContexts) {
    args.push('--build-context')
    args.push(buildContext)
  }
  args.push(optionsWithDefaults.path)

  return new Promise<string>((resolve, reject) => {
    const buildProcess = spawn('docker', args, { stdio: ['inherit', 'pipe', 'pipe'] })

    buildProcess.stdout.on('data', (data) => {
      outWrite(data.toString())
    })

    buildProcess.stderr.on('data', (data) => {
      errWrite(data.toString())
    })

    buildProcess.on('error', (err) => {
      const errMsg = getDockerErrorMsg(err.message) ?? err.message
      reject(new Error(errMsg))
    })

    buildProcess.on('close', (code) => {
      if (code === 0) {
        let imageId = getImageId(tempTag)
        resolve(imageId)
      } else {
        reject(new Error('Error building image'))
      }
    })
  })
}

export async function push(imageName: string, auth: string): Promise<void> {
  const dockerConfigDir = join(JAMSOCKET_CONFIG_DIR, 'docker-config')
  mkdirSync(dockerConfigDir, { recursive: true })

  const registry = imageName.split('/')[0]
  const config = {
    auths: {
      [registry]: { auth },
    },
  }

  const configPath = join(dockerConfigDir, 'config.json')
  writeFileSync(configPath, JSON.stringify(config))

  await new Promise<void>((resolve, reject) => {
    const pushProcess = spawn('docker', ['--config', dockerConfigDir, 'push', imageName], {
      stdio: ['inherit', 'inherit', 'pipe'],
    })
    pushProcess.stderr.on('data', (data) => {
      console.error(data.toString())
      const errMsg = getDockerErrorMsg(data.toString()) ?? data.toString()
      reject(new Error(errMsg))
    })

    pushProcess.on('error', (err) => {
      const errMsg = getDockerErrorMsg(err.message) ?? err.message
      reject(new Error(errMsg))
    })

    pushProcess.on('close', (code) => {
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

export function getDockerNetworks(): string[] {
  const result = spawnDockerSync(['network', 'ls', '--format', '{{.Name}}'])
  return result.stdout.split('\n').filter(Boolean)
}

export function spawnDockerSync(
  args: string[],
  options?: { stdio?: StdioOptions },
): SpawnSyncReturns<string> {
  const opts: SpawnSyncOptionsWithStringEncoding = { encoding: 'utf-8', ...options }
  const result = spawnSync('docker', args, opts)
  const exitCode = result.status
  if ((exitCode !== null && exitCode !== 0) || result.error !== undefined) {
    const errorLine = result.stderr ?? result.error?.message
    const errorMsg =
      getDockerErrorMsg(errorLine) ??
      `Process "docker ${args.join(' ')}" exited with a non-zero code: ${exitCode} ${result.error} ${result.stderr}`

    throw new Error(errorMsg)
  }
  return result
}

function getDockerErrorMsg(errorLine?: string): string | null {
  if (!errorLine) return null
  if (errorLine.includes('No such image')) {
    return "Docker failed to find image. Make sure you have built the image and it's listed in the `docker images` command output before running this command."
  }
  if (errorLine.includes('Cannot connect to the Docker daemon')) {
    return 'Docker failed to connect to the Docker daemon. Make sure Docker is running and you have permission to access it. If Docker is running, then you may need to check "Allow the default Docker socket to be used" in Docker\'s settings.'
  }
  if (errorLine.includes('ENOENT')) {
    return 'Docker command not found. Make sure Docker is installed and in your PATH.'
  }
  return null
}
