import { homedir } from 'os'
import { resolve, dirname } from 'path'
import * as https from 'https'
import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'

export const REGISTRY = 'jamcr.io'
export const API = 'https://jamsocket.dev'
export const SPAWN_INIT_ENDPOINT = '/api/init'
export const JAMSOCKET_CONFIG = resolve(homedir(), '.jamsocket', 'config.json')

export type JamsocketConfig = {
  username: string;
  auth: string;
}

const NEWLINE = `
`

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
  writeFileSync(JAMSOCKET_CONFIG, `${JSON.stringify(config, null, 2)}${NEWLINE}`)
}

export function deleteJamsocketConfig(): void {
  if (!existsSync(JAMSOCKET_CONFIG)) return
  unlinkSync(JAMSOCKET_CONFIG)
}

export function request(url: string, body: Record<any, any>, options: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const wrappedURL = new URL(url)
    const jsonBody = JSON.stringify(body)
    let result = ''
    const req = https.request({
      ...options,
      hostname: wrappedURL.hostname,
      path: wrappedURL.pathname,
      headers: {
        ...options.headers,
        'Content-Length': jsonBody.length,
      },
    }, res => {
      res.on('data', chunk => {
        result += chunk
      })
      res.on('end', () => {
        resolve(result)
      })
    })
    req.on('error', err => {
      reject(err)
    })
    req.write(jsonBody)
    req.end()
  })
}
