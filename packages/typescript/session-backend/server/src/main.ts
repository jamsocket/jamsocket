import * as net from 'net'
import * as fs from 'fs'
import * as readline from 'readline'

const JAMSOCKET_SDK_SOCKET = '/jamsocket-control/jamsocket-sdk.sock'

/** Represents an assignment of the backend to a specific key.
 * This happens exactly once in a backend's lifecycle.
 */
export class BackendAssignment {
  /** The ID of the backend. */
  backendId: string

  /** The key that the backend is assigned to. */
  key: string

  /** A "fencing token" that the backend can use as a fencing token. (You probably don't need this; see
   * https://docs.jamsocket.com/platform/reference/rest-api#backend-containers for more info.) */
  fencingToken?: number | null

  staticToken?: string | null

  env: Record<string, string | undefined>

  isReady: boolean = false

  constructor(assignmentMsg: BackendAssignmentSocketMsg['message']['BackendAssignment'], private client: net.Socket | null) {
    this.backendId = assignmentMsg.backend_id
    this.key = assignmentMsg.key
    this.fencingToken = assignmentMsg.fencing_token
    this.staticToken = assignmentMsg.static_token
    this.env = assignmentMsg.env
  }

  /** Method to call once this backend is ready to receive requests.
   * This allows the backend to do some initialization work between receiving the key assignment
   * and being sent requests from proxies.
   */
  ready() {
    // if there is no client, then we are not running with warm pools, so we don't need to do anything
    if (this.client) {
      // send a request over unix socket that the backend is ready to receive HTTP requests
      this.client.write(JSON.stringify({ message: 'Ready' }) + '\n')
    }
    this.isReady = true
  }
}

export type BackendAssignmentSocketMsg = {
  message: {
    BackendAssignment: {
      backend_id: string
      key: string
      fencing_token?: number | null
      static_token?: string | null
      env: Record<string, string | undefined>
    }
  }
}

export function isBackendAssignmentSocketMsg(msg: any): msg is BackendAssignmentSocketMsg {
  return msg.message && msg.message.BackendAssignment
}

export class JamsocketBackend {
  /** Environment variables passed when the backend started. */
  public env = process.env as Record<string, string>

  /** The port that the backend is expected to listen on. */
  public port = parseInt(process.env.PORT || '8080', 10)

  private client: net.Socket | null = null

  public supportsWarmPools: boolean

  constructor() {
    this.supportsWarmPools = fs.existsSync(JAMSOCKET_SDK_SOCKET)
    if (!this.supportsWarmPools) {
      console.warn(`No socket found at "${JAMSOCKET_SDK_SOCKET}". Assuming not running with Warm Pool support.`)
    }
  }

  async assignment(): Promise<BackendAssignment> {
    if (!this.supportsWarmPools) {
      // filter out SESSION_BACKEND_ID, SESSION_BACKEND_KEY, SESSION_BACKEND_FENCING_TOKEN, and SESSION_BACKEND_STATIC_TOKEN
      const { SESSION_BACKEND_ID, SESSION_BACKEND_KEY, SESSION_BACKEND_FENCING_TOKEN, SESSION_BACKEND_STATIC_TOKEN, ...env } = process.env
      return new BackendAssignment({
        backend_id: SESSION_BACKEND_ID!,
        key: SESSION_BACKEND_KEY!,
        fencing_token: SESSION_BACKEND_FENCING_TOKEN ? parseInt(SESSION_BACKEND_FENCING_TOKEN, 10) : null,
        static_token: SESSION_BACKEND_STATIC_TOKEN || null,
        env,
      }, null)
    }

    this.client = await new Promise<net.Socket>((resolve) => {
      const c: net.Socket = net.createConnection(JAMSOCKET_SDK_SOCKET, () => resolve(c))
    })

    const rl = readline.createInterface({ input: this.client })

    const assignmentMsgPromise = new Promise<
      BackendAssignmentSocketMsg['message']['BackendAssignment']
    >((resolve, reject) => {
      rl.on('line', (line) => {
        const message = JSON.parse(line)
        if (!isBackendAssignmentSocketMsg(message)) {
          console.error('Received unexpected message:', message)
          return
        }
        resolve(message.message.BackendAssignment)
      })
    })

    this.client.on('error', (err) => {
      console.error('Error listening on Socket:', err.message)
    })

    // send a request over unix socket that the backend is warmed up
    this.client.write(JSON.stringify({ message: 'Warmed' }) + '\n')

    // wait for a request over the unix socket to "start" the backend
    const assignmentMsg = await assignmentMsgPromise
    const mergedEnv = { ...process.env, ...assignmentMsg.env }
    assignmentMsg.env = mergedEnv
    return new BackendAssignment(assignmentMsg, this.client)
  }
}
