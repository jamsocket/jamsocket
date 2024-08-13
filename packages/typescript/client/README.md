# @jamsocket/client

[![GitHub Repo stars](https://img.shields.io/github/stars/jamsocket/jamsocket?style=social)](https://github.com/jamsocket/jamsocket)
[![Chat on Discord](https://img.shields.io/discord/939641163265232947)](https://discord.gg/N5sEpsuhh9)
[![npm](https://img.shields.io/npm/v/@jamsocket/client)](https://www.npmjs.com/package/@jamsocket/client)

JavaScript/TypeScript library for interacting with session backends and the Jamsocket platform.

Read the [docs here](https://docs.jamsocket.com)

## Installation
```bash copy
npm install @jamsocket/client
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

```tsx filename="client.ts"
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(connectResponse)

sessionBackend.isReady() // returns a boolean indicating if the session backend has started and is ready to receive connections
sessionBackend.onReady(() => {
    // do something here once the session backend has reached a Ready status
})
```

# Library Reference

## @jamsocket/client

### `SessionBackend`

```js
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(connectResponse)
```

#### `isReady()`
`isReady` returns a boolean value that is `true` if the backend is ready.

`isReady()`
```js {5}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(connectResponse)

const isReady = sessionBackend.isReady()
```

#### `onReadyPromise`
`onReadyPromise` is a Promise that resolves when the session backend is ready.

```js {5}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(connectResponse)

await sessionBackend.onReadyPromise
```

#### `onReady()`
`onReady` may be used as an alternative to the `onReadyPromise`. It may be called with a callback function that is called when the session backend is ready.

```js {5-7}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(connectResponse)

sessionBackend.onReady(() => {
    // your logic here
})
```

#### `isTerminated()`
`isTerminated` returns a boolean value that is `true` if the backend is no longer running.

`isTerminated()`
```js {5}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(connectResponse)

const isTerminated = sessionBackend.isTerminated()
```

#### `onTerminatedPromise`
`onTerminatedPromise` is a Promise that resolves when the session backend has stopped running.

```js {5}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(connectResponse)

await sessionBackend.onTerminatedPromise
```

#### `onTerminated()`
`onTerminated` may be used as an alternative to the `onTerminatedPromise`. It may be called with a callback function that is called when the session backend has stopped running.

```js {5-7}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(connectResponse)

sessionBackend.onTerminated(() => {
    // your logic here
})
```

#### `status()`
`status` returns a Promise that resolves with the backend's current `BackendState`.

```js {5}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(connectResponse)

const currentState = await sessionBackend.status()
```

#### `onStatus()`
`onStatus` takes a callback which is called when the backend's status changes. It returns an unsubscribe function that may be called to unsubscribes the callback from the status changes.

```js {5-7, 9-10}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(connectResponse)

const unsubcribe = sessionBackend.onStatus((state: BackendState) => {
    // your logic here
})

// later, you can unsubscribe by calling the returned function
unsubscribe()
```

#### `destroy()`
`destroy` terminates your client connection, but it does not terminate the session backend.

```js {5}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(connectResponse)

sessionBackend.destroy()
```

## Types

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
