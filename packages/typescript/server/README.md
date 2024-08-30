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

### `fromEnv(env)`

The `Jamsocket` class comes with a static method that returns an instance of `Jamsocket` configured by the provided environment. The `fromEnv()` method expects to find either `JAMSOCKET_TOKEN`, `JAMSOCKET_ACCOUNT`, and `JAMSOCKET_SERVICE` values _or_ a `JAMSOCKET_DEV: true` value. If running in dev mode, the function will also accept an optional `JAMSOCKET_DEV_PORT` which tells the `Jamsocket` instance where to find the dev server. (This is only needed if you're running `npx jamsocket dev` with a custom port.)

Example:

```ts
import { Jamsocket } from '@jamsocket/server'
const jamsocket = Jamsocket.fromEnv(process.env)
```

### `connect()`

The Jamsocket instance includes a `connect` function that you can use to get a connection URL for a session backend. If you provide a `key`, the connect function will either spawn a new backend or return the running backend that holds the provided key if one exists. When generating a connection URL for a backend, you can provide an optional `ConnectRequest` object. It returns a promise, which resolves with a `ConnectResponse`.

If the underlying connect request fails with a non-200 status code, the returned Promise will `reject` with an `HTTPError`.

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

### `status(backendId)`

The Jamsocket instance includes a `status` function that you can use to get the current status of a backend. It takes a backend ID and returns a `Promise<BackendState>`.

If the underlying status request fails with a non-200 code, the returned Promise will `reject` with an `HTTPError`. This includes if no backend is found with the given ID.

Learn more about the various statuses backends can have in [our API docs](https://docs.jamsocket.com/platform/reference/v2#get-a-backends-current-status).

```ts {8}
import { Jamsocket } from '@jamsocket/server'
const jamsocket = new Jamsocket({
  account: '[YOUR ACCOUNT]',
  token: '[YOUR TOKEN]',
  service: '[YOUR SERVICE]',
})

const backendState = await jamsocket.status(backendId)
```

### `statusStream(backendId, onStatusCallback)`

The Jamsocket instance includes a `statusStream` function that you can use to stream a backend's status updates. It takes a backend ID and an onStatusCallback (`(backendState: BackendState) => void`), which will be called on each status as it is received. The `statusStream()` function returns a `Promise<UnsubscribeFn>`. The underlying stream is closed when either the backend reaches a `terminated` state or the `UnsubscribeFn` is called. If the underlying stream closes but the backend has not terminated and the `UnsubscribeFn` has not been called, this function will automatically reconnect.

If the underlying status request fails with a non-200 code, the returned Promise will `reject` with an `HTTPError`. This includes if no backend is found with the given ID.

<Callout>The `onStatusCallback` function will be called exactly once for every status the backend has encountered, including statuses from before `statusStream()` was called.</Callout>

Learn more about the various statuses backends can have in [our API docs](https://docs.jamsocket.com/platform/reference/v2#get-a-backends-current-status).

```ts {8-12}
import { Jamsocket } from '@jamsocket/server'
const jamsocket = new Jamsocket({
  account: '[YOUR ACCOUNT]',
  token: '[YOUR TOKEN]',
  service: '[YOUR SERVICE]',
})

const unsubscribe = await jamsocket.statusStream(backendId, (backendState) => {
  console.log(backendState.status, backendState.time)
})

unsubscribe()
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
        cluster?: string
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

type TerminationKind = 'soft' | 'hard'
type TerminationReason =
  | 'swept'
  | 'external'
  | 'key_expired'
  | 'lost'
  | 'startup_timeout'
  | 'internal_error'

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
