import * as https from 'https'
import * as http from 'http'
import * as os from 'os'
import WSL from 'is-wsl'

type Header = string | string[] | undefined
export type Headers = Record<string, Header>

type RequestReturn = {
  body: string;
  statusCode: number | undefined;
  statusMessage: string | undefined;
  headers: Headers;
}

const version = require('../package.json').version
const platform = WSL ? 'wsl' : os.platform()
const arch = os.arch() === 'ia32' ? 'x86' : os.arch()
const userAgent = `jamsocket-cli/${version} ${platform}-${arch} node-${process.version}`

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

    let protocol = https
    if (wrappedURL.protocol === 'http:') {
      protocol = http as any
    }

    let result = ''
    const req = protocol.request({
      ...options,
      hostname: wrappedURL.hostname,
      path: wrappedURL.pathname,
      port: wrappedURL.port,
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

export function eventStream(
  url: string,
  options: https.RequestOptions,
  callback: (line: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const wrappedURL = new URL(url)
    const headers = {
      'User-Agent': userAgent,
      ...options.headers,
      Accept: 'text/event-stream',
    }

    const req = https.request({
      ...options,
      hostname: wrappedURL.hostname,
      path: wrappedURL.pathname,
      headers: headers,
    }, res => {
      if (res.statusCode !== 200) {
        reject(new Error('Non-200 status code from API on event stream.'))
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
      res.on('end', () => {
        resolve()
      })
    })
    req.on('error', err => {
      reject(err)
    })
    req.end()
  })
}
