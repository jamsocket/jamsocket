import path from 'path'
import http from 'http'
import chalk from 'chalk'
import stringLength from 'string-length'
import chokidar from 'chokidar'
import { formatDistanceToNow } from 'date-fns'
import { CliUx } from '@oclif/core'
import { Jamsocket } from '../jamsocket'
import { buildImage } from '../docker'
import { SpawnResult, SpawnRequestBody } from '../api'

type Color = 'cyan' | 'magenta' | 'yellow' | 'blue'

type Backend = {
  spawnResult: SpawnResult,
  imageId: string,
  spawnTime: number,
  lastStatus: string | null,
  lock: string | null,
  isStreaming: boolean,
  color: Color,
}

const BACKEND_LOG_COLORS: Color[] = ['cyan', 'magenta', 'yellow', 'blue']

type Options = {
  dockerfile: string,
  service: string,
  account: string,
  watch?: string[],
}

export default class DevServer {
  currentImageId: string | null = null
  devBackends: Map<string, Backend> = new Map()
  curFooterLength = 0
  totalBackendsSpawned = 0

  constructor(private jamsocket: Jamsocket, private opts: Options) {}

  // returns a promise that resolves when the dev server is stopped
  async start(): Promise<void> {
    const { watch } = this.opts
    this.currentImageId = await this.buildSessionBackend()

    const server = this.startSpawnProxy()

    const serverStopped = new Promise<void>(resolve => {
      // listen for keyboard input
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', async (key: string) => {
        // ctrl-c
        if (key === '\u0003') {
          server.close(async () => {
            this.clearFooter()
            console.log('Spawn proxy server stopped')

            const curBackends = [...this.devBackends.values()].map(backend => backend.spawnResult.name)
            if (curBackends.length > 0) {
              console.log('Terminating development backends...')
              await this.terminateBackends(curBackends)
              this.clearFooter()
            }
            resolve()
          })
        }
        if (key === 'b') {
          this.rebuild()
        }
        if (key === 't') {
          const backendNames = [...this.devBackends.values()].map(b => b.spawnResult.name)
          if (backendNames.length > 0) {
            this.updateFooterAndLog(['', 'Terminating development backends...'])
            await this.terminateBackends(backendNames)
          } else {
            this.updateFooterAndLog(['', 'No development backends to terminate'])
          }
        }
      })
    })

    if (watch) {
      this.updateFooterAndLog([`Watching ${watch.join(', ')} for changes...`, ''])
      const watchPaths = watch.map(w => path.resolve(process.cwd(), w))
      chokidar.watch(watchPaths).on('change', this.rebuild.bind(this))
    }

    await serverStopped
  }

  async buildSessionBackend(): Promise<string> {
    const { dockerfile, service } = this.opts
    this.clearFooter()
    const imageId = buildImage(dockerfile)
    await this.jamsocket.push(service, imageId)
    this.updateFooterAndLog(['', `Built and pushed image to ${service} service on the Jamsocket registry. ImageID: ${imageId}`])
    return imageId
  }

  async rebuild(): Promise<void> {
    this.currentImageId = await this.buildSessionBackend()

    const outdatedBackends = [...this.devBackends.values()].filter(backend => backend.imageId !== this.currentImageId).map(backend => backend.spawnResult.name)
    if (outdatedBackends.length > 0) {
      this.updateFooterAndLog(['', 'Terminating outdated backends...'])
      await this.terminateBackends(outdatedBackends)
    }
  }

  async terminateBackends(backends: string[]): Promise<void> {
    const terminationPromises = backends.map(name => this.jamsocket.terminate(name))
    this.updateFooterAndLog([`Terminating ${backends.length} backend(s): ${backends.map(name => name).join(', ')}`])
    await Promise.all(terminationPromises)
    for (const name of backends) {
      this.devBackends.delete(name)
    }
  }

  getFooter(): string[] {
    let footer = ['']
    if (this.devBackends.size > 0) {
      CliUx.ux.table<Backend>([...this.devBackends.values()], {
        name: {
          header: 'Name',
          get: backend => chalk[backend.color](backend.spawnResult.name),
        },
        status: {
          header: 'Status',
          get: backend => chalk[backend.color](backend.lastStatus ?? '-'),
        },
        spawned: {
          header: 'Spawn time',
          get: backend => chalk[backend.color](`${formatDistanceToNow(new Date(backend.spawnTime))} ago`),
        },
        image: {
          header: 'Image ID',
          get: backend => chalk[backend.color](backend.imageId.slice(0, 7)),
        },
        lock: {
          header: 'Lock',
          get: backend => chalk[backend.color](backend.lock ?? '-'),
        },
      }, {
        printLine: line => footer.push(line),
      })
    } else {
      footer.push(chalk.bold` No running backends`)
    }
    footer.push(
      '',
      chalk.bold.italic` ${chalk.underline`[b]`} Build ${chalk.underline`[t]`} Terminate backends ${chalk.underline`[ctrl-c]`} Stop`,
      '',
    )

    // draw a box around the footer

    const padding = 2
    // eslint-disable-next-line unicorn/no-array-reduce
    const boxWidth = footer.reduce((max, line) => Math.max(max, stringLength(line)), 0) + (padding * 2) + 2
    footer = footer.map(line => {
      line = `\u2016${' '.repeat(padding)}${line}`
      const endPadding = boxWidth - stringLength(line) - 1
      return `${line}${' '.repeat(endPadding)}\u2016`
    })

    footer.unshift(chalk.bold(`\u2554${'='.repeat(boxWidth - 2)}\u2557`))
    footer.push(chalk.bold(`\u255A${'='.repeat(boxWidth - 2)}\u255D`))

    return footer
  }

  clearFooter(): void {
    for (let i = 0; i < this.curFooterLength; i++) {
      process.stdout.write('\r\u001B[1A') // move cursor up by one line and to beginning of line
      process.stdout.write('\u001B[2K') // clear line
    }
    this.curFooterLength = 0
  }

  updateFooterAndLog(logLines: string[] = []): void {
    this.clearFooter()

    for (const logLine of logLines) {
      console.log(logLine)
    }

    const footer = this.getFooter()
    this.curFooterLength = footer.length
    for (const line of footer) {
      console.log(line)
    }
  }

  async streamStatusAndLogs(backendName: string): Promise<void> {
    const backend = this.devBackends.get(backendName)
    if (!backend) throw new Error(`Backend ${backendName} not found in devBackends when attempting to stream status and logs`)

    backend.isStreaming = true

    // TODO: come up with a way to cancel these streams
    const statusStream = this.jamsocket.streamStatus(backendName, status => {
      const curStatus = status.state
      backend.lastStatus = curStatus
      this.updateFooterAndLog([chalk[backend.color](`[${backendName}] status: ${curStatus}`)])
      if (!['Loading', 'Starting', 'Ready'].includes(curStatus)) {
        this.devBackends.delete(backendName)
      }
    })
    const logsStream = this.jamsocket.streamLogs(backendName, log => {
      this.updateFooterAndLog([chalk[backend.color](`[${backendName}] ${log}`)])
    })

    await Promise.all([statusStream, logsStream])

    this.updateFooterAndLog([chalk[backend.color](`[${backendName}] streams ended`)])
    backend.isStreaming = false
  }

  startSpawnProxy(): http.Server {
    const { service, account } = this.opts
    const server = http.createServer(async (req, res) => {
      // The only route this server implements is POST /user/{ACCOUNT}/service/{SERVICE}/spawn
      const match = /^\/user\/([^/]+)\/service\/([^/]+)\/spawn/.exec(req.url ?? '')
      if (req.method !== 'POST' || match === null) {
        res.writeHead(404)
        res.end()
        return
      }

      const reqAccount = match[1]
      const reqService = match[2]

      if (service !== reqService) {
        // TODO: make this a warning
        this.updateFooterAndLog([`Request for service ${reqService} does not match service in config (${service}). Blocking spawn.`])
        res.writeHead(401)
        res.end()
        return
      }

      if (account !== reqAccount) {
        // TODO: make this a warning
        this.updateFooterAndLog(['Request for account does not match logged-in account. Blocking spawn.'])
        res.writeHead(401)
        res.end()
        return
      }

      /*
        * TODO: The service really should be a development service, not a production one,
        *       otherwise these pushes could break the production service.
        *       Maybe use a special "development" tag for these?
        */

      const text = await readBody(req)
      let body: Record<string, any> = {}
      try {
        body = JSON.parse(text)
      } catch {}

      const result = await this.spawnBackend(body)
      if (result instanceof Error) {
        res.writeHead(400)
        res.end(result.toString())
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    })

    server.listen(8080, () => {
      this.updateFooterAndLog(['', 'Spawn proxy server running on http://localhost:8080', ''])
    })

    return server
  }

  async spawnBackend(body: SpawnRequestBody): Promise<SpawnResult | Error> {
    const { service } = this.opts
    const imageId = this.currentImageId

    if (!imageId) {
      throw new Error('spawnBackend called before currentImageId was set. This is a bug.')
    }

    const result = await this.jamsocket.spawn(
      service,
      body.env,
      body.grace_period_seconds,
      body.port,
      body.tag,
      body.require_bearer_token,
      body.lock,
    )

    if (this.devBackends.has(result.name)) {
      if (result.spawned) {
        throw new Error(`Spawned backend ${result.name} already exists in devBackends but "spawned=true" in spawn response. Some bug has occurred.`)
      }
      const backend = this.devBackends.get(result.name)!
      if (backend.imageId !== imageId) {
        // TODO: make this a warning
        this.updateFooterAndLog(['Spawn with lock returned a running backend with an outdated version of the session backend code. Blocking spawn.'])
        return new Error('dev-server spawn proxy: Spawn with lock returned a running backend with an outdated version of the session backend code. Blocking spawn.')
      }
    } else if (result.spawned) {
      const color = BACKEND_LOG_COLORS[this.totalBackendsSpawned % BACKEND_LOG_COLORS.length]
      this.totalBackendsSpawned += 1
      this.devBackends.set(result.name, {
        spawnResult: result,
        imageId: imageId,
        spawnTime: Date.now(),
        lastStatus: null,
        lock: body.lock ?? null,
        isStreaming: false,
        color,
      })
      this.updateFooterAndLog(['', `Spawned backend: ${result.name}`])
    } else {
      // TODO: make this a warning
      this.updateFooterAndLog(['Spawn with lock returned a running backend that was not originally spawned by this dev server. This may be dangerous. Blocking spawn.'])
      return new Error('dev-server spawn proxy: Spawn with lock returned a running backend that was not originally spawned by this dev server. This may be dangerous. Blocking spawn.')
    }

    const backend = this.devBackends.get(result.name)!
    if (!backend.isStreaming) {
      this.updateFooterAndLog([`Streaming status and logs for ${result.name}...`, ''])
      this.streamStatusAndLogs(result.name)
    }

    if (result.spawned) {
      this.updateFooterAndLog()
    }

    return result
  }
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: string) => {
      body += chunk
    })
    req.on('end', () => {
      resolve(body)
    })
    req.on('error', err => {
      reject(err)
    })
  })
}
