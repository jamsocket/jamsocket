import { homedir, EOL } from 'os'
import { resolve, dirname } from 'path'
import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'

export const JAMSOCKET_CONFIG_DIR = resolve(homedir(), '.jamsocket')
const JAMSOCKET_CONFIG = resolve(JAMSOCKET_CONFIG_DIR, 'config.json')

export type JamsocketConfig = {
  account: string;
  token: string;
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

  const isInvalidConfig = !config.account || !config.token

  if (isInvalidConfig) {
    deleteJamsocketConfig()
    return null
  }

  return {
    account: config.account,
    token: config.token,
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

// this version of the token is used for Basic Authorization, which is required for our Docker registry
export function getRegistryAuth(token: string): string {
  const [publicPortion, privatePortion] = token.split('.')
  const buff = Buffer.from(`${publicPortion}:${privatePortion}`, 'utf-8')
  return buff.toString('base64')
}

export function getTokenPublicPortion(token: string): string {
  return token.split('.')[0]
}
