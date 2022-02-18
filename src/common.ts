import { homedir } from 'os'
import { resolve, dirname } from 'path'
import * as https from 'https'
import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'

export const REGISTRY = 'jamcr.io'
export const API = 'https://jamsocket.dev'
export const SERVICE_CREATE_ENDPOINT = '/reg/service'
export const getServiceListEndpoint = (username: string): string => `/reg/${username}/services`
export const getSpawnEndpoint = (username: string, serviceName: string, tag: string | null): string => {
  let endpoint = `/reg/${username}/service/${serviceName}`
  if (tag) endpoint += `/tag/${tag}`
  return endpoint
}

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

type Header = string | string[] | undefined
type RequestReturn = {
  body: string;
  statusCode: number | undefined;
  statusMessage: string | undefined;
  headers: Record<string, Header>;
}
export function request(
  url: string,
  body: Record<string, unknown> | null,
  options: Record<string, any>,
): Promise<RequestReturn> {
  return new Promise((resolve, reject) => {
    const wrappedURL = new URL(url)
    const headers = { ...options.headers }
    const jsonBody = body && JSON.stringify(body)
    if (jsonBody !== null) {
      headers['Content-Length'] = jsonBody.length
      headers['Content-Type'] = 'application/json'
    }

    let result = ''
    const req = https.request({
      ...options,
      hostname: wrappedURL.hostname,
      path: wrappedURL.pathname,
      headers: headers,
    }, res => {
      res.on('data', chunk => {
        result += chunk
      })
      res.on('end', () => {
        resolve({
          body: result,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
        })
      })
    })
    req.on('error', err => {
      reject(err)
    })
    if (jsonBody !== null) req.write(jsonBody)
    req.end()
  })
}
