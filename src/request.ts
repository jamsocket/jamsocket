import * as https from 'https'
import * as http from 'http'
import { HTTPError } from './api'
import * as os from 'os'
import WSL from 'is-wsl'

type Header = string | string[] | undefined
export type Headers = Record<string, Header>

type RequestReturn = {
  body: string
  statusCode: number | undefined
  statusMessage: string | undefined
  headers: Headers
}

export type EventStreamReturn = {
  close: () => void
  closed: Promise<void>
}

const version = require('../package.json').version
const platform = WSL ? 'wsl' : os.platform()
const arch = os.arch() === 'ia32' ? 'x86' : os.arch()
const userAgent = `jamsocket-cli/${version} ${platform}-${arch} node-${process.version}`

// wrapping in try/catch as os.userInfo() will throw if no username or homedir is found
let userHost: string | null = null
try {
  userHost = `${os.userInfo().username}@${os.hostname()}`
} catch {}

const PACKAGE_META_URL = 'https://registry.npmjs.org/jamsocket'

export async function checkVersion(): Promise<void> {
  try {
    const response = await request(PACKAGE_META_URL, null, {})
    const latestVersion = JSON.parse(response.body)['dist-tags'].latest
    const isVersionOld = isVersionLessThan(version, latestVersion)
    if (isVersionOld) {
      console.error(
        `    Your Jamsocket CLI version (${version}) is out of date. You can update to the latest version (${latestVersion}) with:`,
      )
      console.error('        npm install jamsocket@latest --global')
      console.error()
    }
  } catch {}
}

function isVersionLessThan(version1: string, version2: string): boolean {
  const version1Components = version1.split('.')
  const version2Components = version2.split('.')
  if (version1Components.length !== 3 || version2Components.length !== 3) {
    throw new Error(
      `version comparison failed due to invalid versions. Received versions: ${version1} and ${version2}`,
    )
  }
  const [major1, minor1, patch1] = version1Components.map((val) => Number.parseInt(val, 10))
  const [major2, minor2, patch2] = version2Components.map((val) => Number.parseInt(val, 10))
  if (major1 > major2) return false
  if (major1 < major2) return true
  if (minor1 > minor2) return false
  if (minor1 < minor2) return true
  if (patch1 > patch2) return false
  if (patch1 < patch2) return true
  return false
}

export function request(
  url: string,
  body: Record<string, unknown> | null,
  options: https.RequestOptions,
): Promise<RequestReturn> {
  return new Promise((resolve, reject) => {
    const wrappedURL = new URL(url)
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      ...options.headers,
    }
    const jsonBody = body && JSON.stringify(body)
    if (jsonBody !== null) {
      headers['Content-Length'] = `${jsonBody.length}`
      headers['Content-Type'] = 'application/json'
    }

    if (userHost !== null) {
      headers['X-User-Host'] = userHost
    }

    let protocol = https
    if (wrappedURL.protocol === 'http:') {
      protocol = http as any
    }

    let result = ''
    const req = protocol.request(
      {
        ...options,
        hostname: wrappedURL.hostname,
        path: wrappedURL.pathname,
        port: wrappedURL.port,
        headers: headers,
      },
      (res) => {
        res.on('data', (chunk) => {
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
      },
    )
    req.on('error', (err) => {
      reject(err)
    })
    if (jsonBody !== null) req.write(jsonBody)
    req.end()
  })
}

export function eventStream(
  url: string,
  options: https.RequestOptions,
  callback: (line: string) => void,
): EventStreamReturn {
  let request: http.ClientRequest | null = null
  let response: http.IncomingMessage | null = null

  function close() {
    if (request) request.destroy()
    if (response) response.destroy()
  }

  const closed = new Promise<void>((resolve, reject) => {
    const wrappedURL = new URL(url)
    const headers = {
      'User-Agent': userAgent,
      ...options.headers,
      Accept: 'text/event-stream',
    }

    request = https.request(
      {
        ...options,
        hostname: wrappedURL.hostname,
        path: wrappedURL.pathname,
        headers: headers,
      },
      (res) => {
        response = res
        if (res.statusCode !== 200) {
          responseIntoError(res).catch(reject)
          return
        }

        res.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().trim().split(/\n\n/)
          for (const line of lines) {
            const match = line.match(/data: ?(.*)/)
            if (match) {
              callback(match[1])
            } else {
              try {
                const parsed = JSON.parse(line)
                reject(new Error(parsed.error.message))
              } catch {
                reject(new Error(`Expected line to start with data:, got ${line}`))
              }
            }
          }
        })
        res.on('close', () => {
          resolve()
        })
      },
    )
    request.on('error', (err) => {
      reject(err)
    })
    request.end()
  })

  return { close, closed }
}

function responseIntoError(res: http.IncomingMessage): Promise<void> {
  return new Promise((_, reject) => {
    let body = ''
    res.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })
    res.on('end', () => {
      let msg = body
      try {
        const parsed = JSON.parse(body)
        msg = parsed.error.message ?? msg
      } catch {}
      reject(new HTTPError(res.statusCode!, msg))
    })
  })
}
