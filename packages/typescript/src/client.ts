export type Status = string
export type StatusStreamEvent = { state: Status; time: string }

export class SessionBackend {
  private streamReader: ReadableStreamDefaultReader | null = null
  readonly statuses: Status[] = []
  private _isReady: boolean = false
  private _onReady: (() => void)[] = []

  constructor(
    readonly url: string,
    readonly statusUrl: string,
  ) {
    this.waitUntilReady(statusUrl)
  }

  // Private method to set the session as ready and execute callbacks
  private _setReady() {
    this._isReady = true
    this._onReady.forEach((cb) => cb())
    this._onReady = []
  }

  private waitUntilReady = async (statusUrl: string) => {
    const res = await fetch(statusUrl, { mode: 'cors', cache: 'no-store' })
    if (!res.ok) {
      throw new Error(
        `An error occured while fetching jamsocket backend status: ${await res.text()}`,
      )
    }
    const status = await res.text()

    if (status.includes('Ready')) {
      this._setReady()
      return
    }
    if (!status.includes('Loading') && !status.includes('Starting')) {
      throw new Error(`Jamsocket status is a Terminal state: ${status}`)
    }

    const response = await fetch(`${statusUrl}/stream`, { cache: 'no-store' })
    if (!response.body)
      throw new Error('response to Jamsocket backend status stream did not include body')
    this.streamReader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    while (this.streamReader !== null) {
      const result = await this.streamReader.read()
      const value = result.value as string
      if (result.done) {
        console.log('Jamsocket status stream closed by API')
        this.destroyStatusStream()
        break
      }

      const messages = value
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean)

      for (const msg of messages) {
        if (!msg?.startsWith('data:'))
          throw new Error(`Unexpected message from SSE endpoint: ${msg}`)
        const text = msg.slice(5).trim()
        let data: StatusStreamEvent | null = null
        try {
          data = JSON.parse(text) as StatusStreamEvent
        } catch (e) {
          console.error(`Error parsing status stream message as JSON: "${text}"`, e)
        }
        if (data?.state === 'Ready') {
          this._setReady()
          this.destroyStatusStream()
        }
      }
    }
  }

  private destroyStatusStream = () => {
    if (this.streamReader) {
      this.streamReader.cancel()
      this.streamReader = null
    }
  }

  public destroy() {
    this.destroyStatusStream()
  }

  public isReady() {
    return this._isReady
  }

  public onReady(cb: () => void): () => void {
    if (this.isReady()) {
      cb()
    } else {
      this._onReady.push(cb)
    }
    return () => {
      if (this.isReady()) return
      this._onReady = this._onReady.filter((c) => c !== cb)
    }
  }
}
