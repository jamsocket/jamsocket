import { spawn, spawnSync } from 'child_process'
import { writeFileSync } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import path = require('path');

export class ContainerManager {
    constructor(public command: string = "docker") { }

    async push(imageName: string, auth: string) {
        const tempdir = await mkdtemp("jamsocket-");
        try {
            const registry = imageName.split('/')[0];

            const config = {
                "auths": {
                    [registry]: {
                        "auth": auth
                    }
                }
            }
    
            const configPath = path.join(tempdir, "config.json");
            writeFileSync(configPath, JSON.stringify(config));
    
            await new Promise<void>((resolve, reject) => {
                const pushProcess = spawn('docker', ['--config', tempdir, 'push', imageName], { stdio: 'inherit' });
                pushProcess.on('close', code => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error('Error pushing image'));
                    }
                })
            });    
        } catch (e) {
            throw e;
        } finally {
            // Clean up temp directory.
            await rm(tempdir, { recursive: true, force: true })
        }
    }

    tag(existingImageName: string, newImageName: string) {
        const tagOutput = spawnSync(this.command, ['tag', existingImageName, newImageName], { encoding: 'utf-8' })
        process.stderr.write(tagOutput.stderr)
        if (tagOutput.status !== 0) {
            throw new Error(tagOutput.error?.message ?? 'Error tagging image');
        }
    }
}