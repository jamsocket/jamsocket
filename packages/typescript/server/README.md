# @jamsocket/server

[![GitHub Repo stars](https://img.shields.io/github/stars/jamsocket/jamsocket?style=social)](https://github.com/jamsocket/jamsocket)
[![Chat on Discord](https://img.shields.io/discord/939641163265232947)](https://discord.gg/N5sEpsuhh9)
[![npm](https://img.shields.io/npm/v/@jamsocket/server)](https://www.npmjs.com/package/@jamsocket/server)

JavaScript/TypeScript library for spawning session backends server-side.

Read the [docs here](https://docs.jamsocket.com)

## Installation
```bash copy
npm install @jamsocket/server
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

## @jamsocket/server

### `Jamsocket`

Create a Jamsocket instance with the `Jamsocket` class from `@jamsocket/server` folder.

In local development, you can simply set `dev` to `true`.

```ts
import { Jamsocket } from '@jamsocket/server'
const jamsocket = new Jamsocket({ dev: true })
```

In production, provide your `account`, `token`, and `service` information.

```ts
import { Jamsocket } from '@jamsocket/server'
const jamsocket = new Jamsocket({
  account: '[YOUR ACCOUNT]',
  token: '[YOUR TOKEN]',
  service: '[YOUR SERVICE]',
})
```

### `connect()`

The Jamsocket instance includes a `connect` function that you can use to get a connection URL for a session backend. If you provide a `key`, the connect function will either spawn a new backend or return the running backend that holds the provided key if one exists. When generating a connection URL for a backend, you can provide an optional `ConnectRequest` object. It returns a promise, which resolves with a `ConnectResponse`.

Learn more about the various options you can pass in a `ConnectRequest` in [our API docs](https://docs.jamsocket.com/platform/reference/v2#get-a-connection-url-for-a-backend).

<Callout>A Jamsocket class should only be instantiated on the server since it takes a Jamsocket Auth Token which must be kept secret.</Callout>

```ts {8-12}
import { Jamsocket } from '@jamsocket/server'
const jamsocket = new Jamsocket({
  account: '[YOUR ACCOUNT]',
  token: '[YOUR TOKEN]',
  service: '[YOUR SERVICE]',
})

const connectResponse = await jamsocket.connect() // no options are required

// or

const connectResponse = await jamsocket.connect({
  key: 'my-key',
  spawn: {
    lifetime_limit_seconds: 432_000, // 10 hours
    max_idle_seconds: 300, // 5 minutes
    executable: {
      env: {
        'MY_ENV_VAR': 'foo'
      }
    }
  },
  user: 'my-user-id', // optional user identifier to be included in request headers to session backend
  auth: { 'my_user_metadata': 'bar' } // optional values to be JSON-serialized and included in request headers to session backend
})
```

## Types

```ts
type JamsocketInitOptions =
  | {
      account: string
      token: string
      service: string
      apiUrl?: string
    }
  | {
      dev: true
      port?: number
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

type BackendStatus =
  | 'scheduled'
  | 'loading'
  | 'starting'
  | 'waiting'
  | 'ready'
  | 'terminating'
  | 'hard-terminating'
  | 'terminated'
```
