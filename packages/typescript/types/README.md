# @jamsocket/types

[![GitHub Repo stars](https://img.shields.io/github/stars/jamsocket/jamsocket?style=social)](https://github.com/jamsocket/jamsocket)
[![Chat on Discord](https://img.shields.io/discord/939641163265232947)](https://discord.gg/N5sEpsuhh9)
[![npm](https://img.shields.io/npm/v/@jamsocket/server)](https://www.npmjs.com/package/@jamsocket/server)

JavaScript/TypeScript library for spawning session backends server-side.

Read the [docs here](https://docs.jamsocket.com)

## Installation
```bash copy
npm install @jamsocket/types
```

## Example

Here's an example of how different parts of Jamsocket's client libraries work together.

```tsx filename="server.tsx"
import Jamsocket from '@jamsocket/server'

const jamsocket = Jamsocket.init({
   account: '[YOUR ACCOUNT]',
   token: '[YOUR TOKEN]',
   service: '[YOUR SERVICE]',
   // during development, you can simply pass { dev: true }
})

const spawnResult = await jamsocket.spawn() // returns an instance of SpawnResult
```

```tsx filename="client.tsx"
import {
  SessionBackendProvider, SocketIOProvider,
  useEventListener, useSend, useReady
} from '@jamsocket/socketio'

function Root() {
  return(
    <SessionBackendProvider spawnResult={spawnResult}>
      <SocketIOProvider url={spawnResult.url}>
        <MyComponent />
      </SocketIOProvider>
    </SessionBackendProvider>
  )
}

function MyComponent() {
  const ready = useReady()
  const sendEvent = useSend()

  useEffect(() => {
    if (ready) {
      sendEvent('some-event', someValue)
    }
  }, [ready])

  useEventListener('another-event', (args) => {
    // do something when receiving an event message from your session backend...
  })
}
```

# Library Reference

## @jamsocket/types

```ts
type ConnectResponse = {
  backend_id: string
  spawned: boolean
  status: BackendStatus
  token: string
  url: string
  secret_token?: string | null
  status_url: string
  ready_url: string
}

type ConnectRequest = {
  key?: string
  spawn?:
    | boolean
    | {
        tag?: string
        lifetime_limit_seconds?: number
        max_idle_seconds?: number
        executable?: {
          mount?: string | boolean
          env?: Record<string, string>
          resource_limits?: {
            cpu_period?: number
            // Proportion of period used by container (in microseconds)
            cpu_period_percent?: number
            // Total cpu time allocated to container (in seconds)
            cpu_time_limit?: number
            memory_limit_bytes?: number
            disk_limit_bytes?: number
          }
        }
      }
  user?: string
  auth?: Record<string, any>
}

type BackendStatus =
  | 'scheduled'
  | 'loading'
  | 'starting'
  | 'waiting'
  | 'ready'
  | 'terminating'
  | 'hard-terminating'
  | 'terminated'

type TerminationKind = 'soft' | 'hard'
type TerminationReason = 'swept' | 'external' | 'key_expired' | 'lost' | 'startup_timeout'

type BackendState =
  | { status: 'scheduled'; time: string }
  | { status: 'loading'; time: string }
  | { status: 'starting'; time: string }
  | { status: 'waiting'; time: string }
  | { status: 'ready'; time: string }
  | { status: 'terminating'; time: string; termination_reason: TerminationReason }
  | { status: 'hard-terminating'; time: string; termination_reason: TerminationReason }
  | {
      status: 'terminated'
      time: string
      termination_reason?: TerminationReason | null
      termination_kind?: TerminationKind | null
      exit_error?: boolean | null
    }
```
