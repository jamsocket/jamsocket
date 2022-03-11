import { spawn, spawnSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { JAMSOCKET_CONFIG_DIR } from './common'

export class ContainerManager {
  command = 'docker'

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

  tag(existingImageName: string, newImageName: string): void {
    const tagOutput = spawnSync(this.command, ['tag', existingImageName, newImageName], { encoding: 'utf-8' })
    process.stderr.write(tagOutput.stderr)
    if (tagOutput.status !== 0) {
      throw new Error(tagOutput.error?.message ?? 'Error tagging image')
    }
  }
}
