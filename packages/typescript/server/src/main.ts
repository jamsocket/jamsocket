import type { ConnectRequest, ConnectResponse, BackendState, BackendStatus } from '@jamsocket/types'
import { isConnectResponse, isBackendState } from '@jamsocket/types'
import { validatePort, checkResponse, parseAs } from './utils'
export { isConnectResponse, isBackendState, HTTPError } from '@jamsocket/types'
export type {
  BackendStatus,
  TerminationKind,
  TerminationReason,
  BackendState,
  ConnectResponse,
  ConnectRequest,
} from '@jamsocket/types'

export type JamsocketDevInitOptions = {
  dev: true
  port?: number
}

export type JamsocketInitOptions =
  | {
      account: string
      token: string
      service: string
      apiUrl?: string
    }
  | JamsocketDevInitOptions

export type OnStatusCallback = (backendState: BackendState) => void
export type UnsubscribeFn = () => void

const JAMSOCKET_DEV_PORT = 8080
const JAMSOCKET_API = 'https://api.jamsocket.com'

function isJamsocketDevInitOptions(opts: any): opts is JamsocketDevInitOptions {
  return opts.dev === true
}

export class Jamsocket {
  account: string
  service: string
  token: string
  apiUrl: string

  constructor(opts: JamsocketInitOptions) {
    if (isJamsocketDevInitOptions(opts)) {
      this.account = '-'
      this.token = '-'
      this.service = '-'
      const port = opts.port ? validatePort(opts.port) : JAMSOCKET_DEV_PORT
      this.apiUrl = `http://localhost:${port}`
    } else {
      this.account = opts.account
      this.token = opts.token
      this.service = opts.service
      this.apiUrl = opts.apiUrl || JAMSOCKET_API
    }
  }

  async connect(connectRequest?: ConnectRequest): Promise<ConnectResponse> {
    const response = checkResponse(
      'connect()',
      await fetch(`${this.apiUrl}/v2/service/${this.account}/${this.service}/connect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(connectRequest || {}),
        cache: 'no-store',
      }),
    )
    return parseAs<ConnectResponse>(isConnectResponse, await response.text())
  }

  async status(backendId: string): Promise<BackendState> {
    const url = `${this.apiUrl}/v2/backend/${backendId}/status`
    const response = checkResponse('status()', await fetch(url, { cache: 'no-store' }))
    return parseAs<BackendState>(isBackendState, await response.text())
  }

  async statusStream(backendId: string, onStatus: OnStatusCallback): Promise<UnsubscribeFn> {
    const url = `${this.apiUrl}/v2/backend/${backendId}/status/stream`

    // keep track of the statuses we've seen since we might have just resubscribed
    // to the status stream and are seeing some of the statuses we've already seen again
    const statusesSeen = new Set<BackendStatus>()
    let unsubscribed = false
    let retries = 0
    let streamReader: ReadableStreamDefaultReader<string> | null = null
    function unsubscribe() {
      unsubscribed = true
      streamReader?.cancel()
      streamReader = null
    }

    async function startStatusStream() {
      try {
        const response = checkResponse('statusStream()', await fetch(url, { cache: 'no-store' }))
        // make sure only one streamReader is running at a time
        if (streamReader !== null) streamReader.cancel()
        streamReader = response.body.pipeThrough(new TextDecoderStream()).getReader()
        while (streamReader !== null && unsubscribed === false) {
          const result = await streamReader.read()
          if (unsubscribed || !result.value || result.done) break

          result.value.split('\n').forEach((line) => {
            line = line?.trim()
            if (!line?.startsWith('data:')) return

            // remove the 'data: ' prefix
            const text = line.slice(5).trim()
            try {
              var backendState = parseAs<BackendState>(isBackendState, text)
            } catch (e) {
              console.error(e)
              return
            }

            if (statusesSeen.has(backendState.status)) return
            statusesSeen.add(backendState.status)
            onStatus(backendState)
          })

          if (statusesSeen.has('terminated')) {
            unsubscribe()
          }
        }

        // if the stream has terminated but we haven't unsubscribed and the backend has not terminated,
        // wait a little bit then resubscribe
        if (!unsubscribed && !statusesSeen.has('terminated')) {
          // the thrown error will be caught below and the stream will be restarted
          throw new Error('Jamsocket status stream ended unexpectedly')
        }
      } catch (e) {
        retries += 1
        if (retries > 3) {
          console.error(`Jamsocket: encountered error getting status stream. No more retries.`)
          return
        }
        console.error(`Jamsocket: encountered error getting status stream. Retry ${retries}`)
        setTimeout(startStatusStream, 2000)
      }
    }
    startStatusStream()
    return unsubscribe
  }
}
