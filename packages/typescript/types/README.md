# @jamsocket/types

[![GitHub Repo stars](https://img.shields.io/github/stars/jamsocket/jamsocket?style=social)](https://github.com/jamsocket/jamsocket)
[![Chat on Discord](https://img.shields.io/discord/939641163265232947)](https://discord.gg/N5sEpsuhh9)
[![npm](https://img.shields.io/npm/v/@jamsocket/types)](https://www.npmjs.com/package/@jamsocket/types)

Types for the Jamsocket JavaScript/TypeScript client libraries. Normally this package doesn't need to be included as a dependency as these types are re-exported by `@jamsocket/server`, `@jamsocket/client`, `@jamsocket/react` and `@jamsocket/socketio`.

Read the [docs here](https://docs.jamsocket.com/platform)

## Installation
```bash copy
npm install @jamsocket/types
```

## Example

Here's an example of how different parts of Jamsocket's client libraries work together.

```tsx filename="server.tsx"
import { Jamsocket } from '@jamsocket/server'

const jamsocket = new Jamsocket({
   account: '[YOUR ACCOUNT]',
   token: '[YOUR TOKEN]',
   service: '[YOUR SERVICE]',
   // during development, you can simply pass { dev: true }
})

const connectResponse = await jamsocket.connect() // returns an instance of ConnectResponse
```

```tsx filename="client.tsx"
import {
  SessionBackendProvider, SocketIOProvider,
  useEventListener, useSend, useReady
} from '@jamsocket/socketio'

function Root() {
  return(
    <SessionBackendProvider connectResponse={connectResponse}>
      <SocketIOProvider url={connectResponse.url}>
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
        cluster?: string
        lifetime_limit_seconds?: number
        max_idle_seconds?: number
        executable?: {
          mount?: string | boolean
          env?: Record<string, string>
          resource_limits?: {
            // The CPU period (in microseconds), defaults to 100_000 (100ms)
            cpu_period?: number
            // Proportion of period the container is allowed to use (in percent, e.g. 100 = 100%)
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
type TerminationReason = 'swept' | 'external' | 'keyexpired' | 'lost' | 'startuptimeout' | 'internalerror'

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
