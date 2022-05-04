import { spawn, spawnSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { JAMSOCKET_CONFIG_DIR } from './jamsocket-config'

export interface ContainerManager {
  push(imageName: string, auth: string): Promise<void>;

  tag(existingImageName: string, newImageName: string): void;
}

export function detectContainerManager(): ContainerManager {
  const dockerResult = spawnSync('docker', ['-v'], { stdio: 'inherit' })
  if (dockerResult.status === 0) {
    console.log('Using docker')
    return new DockerContainerManager('docker')
  }

  const podmanResult = spawnSync('podman', ['-v'], { stdio: 'inherit' })
  if (podmanResult.status === 0) {
    console.log('Using podman')
    return new PodmanContainerManager('podman')
  }

  throw new Error('No container manager found on path (tried docker and podman.)')
}

export class DockerContainerManager implements ContainerManager {
  constructor(private command: string) {}

  async push(imageName: string, auth: string): Promise<void> {
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
      const pushProcess = spawn(this.command, ['--config', dockerConfigDir, 'push', imageName], { stdio: 'inherit' })
      pushProcess.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error('Error pushing image'))
        }
      })
    })
  }

  tag(existingImageName: string, newImageName: string): void {
    const tagOutput = spawnSync(this.command, ['tag', existingImageName, newImageName], { encoding: 'utf-8', stdio: 'inherit' })
    if (tagOutput.status !== 0) {
      throw new Error(tagOutput.error?.message ?? 'Error tagging image')
    }
  }
}

export class PodmanContainerManager implements ContainerManager {
  constructor(private command: string) {}

  async push(imageName: string, auth: string): Promise<void> {
    const creds = Buffer.from(auth, 'base64')

    await new Promise<void>((resolve, reject) => {
      const pushProcess = spawn(this.command, ['push', '--creds', creds.toString(), imageName], { stdio: 'inherit' })
      pushProcess.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error('Error pushing image'))
        }
      })
    })
  }

  tag(existingImageName: string, newImageName: string): void {
    const tagOutput = spawnSync(this.command, ['tag', existingImageName, newImageName], { encoding: 'utf-8', stdio: 'inherit' })
    if (tagOutput.status !== 0) {
      throw new Error(tagOutput.error?.message ?? 'Error tagging image')
    }
  }
}
