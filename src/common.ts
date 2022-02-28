import { homedir, EOL } from 'os'
import { resolve, dirname } from 'path'
import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'

export const JAMSOCKET_CONFIG = resolve(homedir(), '.jamsocket', 'config.json')

export type JamsocketConfig = {
  username: string;
  auth: string;
}

export function readJamsocketConfig(): JamsocketConfig | null {
  if (!existsSync(JAMSOCKET_CONFIG)) return null
  const contents = readFileSync(JAMSOCKET_CONFIG, 'utf-8')

  let config
  try {
    config = JSON.parse(contents)
  } catch {
    deleteJamsocketConfig()
    return null
  }

  // TODO: complain if config username/auth are not valid
  return {
    username: config.username ?? '',
    auth: config.auth ?? '',
  }
}

export function writeJamsocketConfig(config: JamsocketConfig): void {
  const dir = dirname(JAMSOCKET_CONFIG)
  mkdirSync(dir, { recursive: true })
  writeFileSync(JAMSOCKET_CONFIG, `${JSON.stringify(config, null, 2)}${EOL}`)
}

export function deleteJamsocketConfig(): void {
  if (!existsSync(JAMSOCKET_CONFIG)) return
  unlinkSync(JAMSOCKET_CONFIG)
}
