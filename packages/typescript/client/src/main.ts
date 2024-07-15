export type Status = string
export type StatusStreamEvent = { state: Status; time: string }
export type SpawnResult = {
  url: string
  name: string
  readyUrl: string
  statusUrl: string
  spawned: boolean
  bearerToken?: string
}

const ALIVE_STATUSES = ['Loading', 'Starting', 'Ready']

export class SessionBackend {
  private streamReader: ReadableStreamDefaultReader | null = null
  private statusesSeen: Set<Status> = new Set()

  private fetchingStatusStream: boolean = false

  private _isReady: boolean = false
  private _onReady: (() => void)[] = []
  public onReadyPromise: Promise<void>
  private _onReadyResolve!: () => void

  private _isTerminated: boolean = false
  public onTerminatedPromise: Promise<void>
  private _onTerminatedResolve!: () => void

  private _onStatus: ((msg: StatusStreamEvent) => void)[] = []

  constructor(
    readonly url: string,
    readonly statusUrl: string,
  ) {
    this.onReadyPromise = new Promise((resolve) => {
      this._onReadyResolve = resolve
    })
    this.onTerminatedPromise = new Promise((resolve) => {
      this._onTerminatedResolve = resolve
    })
    this.subscribeToStatusStream()
  }

  // Private method to set the session as ready and execute callbacks
  private _setReady() {
    this._isReady = true
    this._onReady.forEach((cb) => cb())
    this._onReady = []
    this._onReadyResolve()
  }

  private _setTerminated() {
    this._isReady = false
    this._isTerminated = true
    this._onTerminatedResolve()
  }

  private subscribeToStatusStream = async () => {
    const msg = await this.status()

    if (!ALIVE_STATUSES.includes(msg.state)) {
      console.warn(`Jamsocket status is a Terminal state: ${msg.state}`)
      this._setTerminated()
      this._onStatus.forEach((cb) => cb(msg))
      return
    }

    this.fetchStatusStream()
  }

  private fetchStatusStream = async () => {
    if (this.isTerminated() || this.fetchingStatusStream) return
    this.fetchingStatusStream = true
    const response = await fetch(`${this.statusUrl}/stream`, { cache: 'no-store' })
    if (!response.body) {
      this.fetchingStatusStream = false
      throw new Error('response to Jamsocket backend status stream did not include body')
    }
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
        .map((line) => {
          if (!line) return null
          if (!line.trim().startsWith('data:')) {
            console.warn(`Skipping message from SSE endpoint: ${line}`)
            return null
          }
          const text = line.slice(5).trim()
          try {
            return JSON.parse(text) as StatusStreamEvent
          } catch (e) {
            console.error(`Error parsing status stream message as JSON: "${text}"`, e)
            return null
          }
        })
        .filter((msg) => msg !== null)

      for (const msg of messages) {
        // keep track of the statuses we've seen since we might have just resubscribed
        // to the status stream and are seeing some of the statuses we've already seen again
        if (this.statusesSeen.has(msg.state)) continue
        this.statusesSeen.add(msg.state)

        console.log(`Jamsocket session backend status is ${msg.state}`)
        if (msg.state === 'Ready') this._setReady()
        if (!ALIVE_STATUSES.includes(msg.state)) this._setTerminated()
        this._onStatus.forEach((cb) => cb(msg))
      }
      if (this.isTerminated()) this.destroyStatusStream()
    }

    if (!this.isTerminated()) {
      console.error('Jamsocket status stream ended unexpectedly')
      this.destroyStatusStream() // make sure we don't have a dangling stream
      this.subscribeToStatusStream()
    }
  }

  public async status(): Promise<StatusStreamEvent> {
    let res = await fetch(this.statusUrl, { mode: 'cors', cache: 'no-store' })
    // if the first request fails, retry once
    if (!res.ok) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      res = await fetch(this.statusUrl, { mode: 'cors', cache: 'no-store' })
    }
    if (!res.ok) {
      throw new Error(
        `An error occured while fetching jamsocket backend status: ${await res.text()}`,
      )
    }
    const text = await res.text()
    const msg = JSON.parse(text) as StatusStreamEvent
    return msg
  }

  public onStatus(cb: (msg: StatusStreamEvent) => void): () => void {
    this._onStatus.push(cb)
    return () => {
      this._onStatus = this._onStatus.filter((c) => c !== cb)
    }
  }

  private destroyStatusStream = () => {
    if (this.streamReader) {
      this.streamReader.cancel()
      this.streamReader = null
    }
    this.fetchingStatusStream = false
  }

  public destroy() {
    this.destroyStatusStream()
  }

  public isReady() {
    return this._isReady
  }

  public isTerminated() {
    return this._isTerminated
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
