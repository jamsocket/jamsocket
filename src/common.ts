import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

export const REGISTRY = 'jamcr.io'
export const API = 'https://jamsocket.dev'
export const SPAWN_INIT_ENDPOINT = '/spawn/init'
export const JAMSOCKET_CONFIG = path.resolve(os.homedir(), '.jamsocket', 'config.json')

export type JamsocketConfig = {
  username: string;
  auth: string;
}

export function readJamsocketConfig(): JamsocketConfig | null {
  if (!fs.existsSync(JAMSOCKET_CONFIG)) return null
  const contents = fs.readFileSync(JAMSOCKET_CONFIG, 'utf-8')
  // TODO: wrap this in try/catch and throw error and instructions if invalid JSON
  const config = JSON.parse(contents)
  // TODO: complain if config username/auth are not valid
  return {
    username: config.username ?? '',
    auth: config.auth ?? '',
  }
}

export function writeJamsocketConfig(config: JamsocketConfig): void {
  const dir = path.dirname(JAMSOCKET_CONFIG)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(JAMSOCKET_CONFIG, JSON.stringify(config, null, 2))
}

export function deleteJamsocketConfig(): void {
  fs.unlinkSync(JAMSOCKET_CONFIG)
}
