import { spawn, spawnSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { JAMSOCKET_CONFIG_DIR } from './jamsocket-config'

export function getImagePlatform(imageName: string): { os: string, arch: string } {
  const getPlatform = spawnSync('docker', ['image', 'inspect', '--format', '{{.Os}} {{.Architecture}}', imageName])
  const stdout = getPlatform.stdout.toString()
  const [os, arch] = stdout.split(' ').map(s => s.trim())
  return { os, arch }
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
  const tagOutput = spawnSync('docker', ['tag', existingImageName, newImageName], { encoding: 'utf-8', stdio: 'inherit' })
  if (tagOutput.status !== 0) {
    throw new Error(tagOutput.error?.message ?? 'Error tagging image')
  }
}
