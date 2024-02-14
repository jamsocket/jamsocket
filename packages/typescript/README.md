# @jamsocket/javascript

`@jamsocket/javascript` provides Javascript/Typescript and React libraries for interacting with session backends and the Jamsocket Platform.

The `@jamsocket/javascript` library is composed of
- `/server` provides functions for spawning session backends securely
- `/client` is a Javascript/Typescript library for a interacting with session backends
- `/react` uses the `client` library to give you the same functionality in simple React hooks
- `/socketio` lets you connect to a socketio server in your session backend with React hooks

[View the open source library on Github.](https://github.com/drifting-in-space/jamsocket-javascript)

## Installation

```bash copy
npm install @jamsocket/javascript
```

## Example

Here's an example of how different parts of the `@jamsocket/javscript` library work together.

```tsx filename="server.tsx"
import { init } from '@jamsocket/javascript/server'

const spawnBackend = init({
   account: '[YOUR ACCOUNT]',
   token: '[YOUR TOKEN]',
   service: '[YOUR SERVICE]',
   // during develpment, you can simply pass { dev: true }
})

const spawnResult = await spawnBackend()
```

```tsx filename="client.tsx"
import { SessionBackendProvider, useReady } from '@jamsocket/javascript/react'
import { SocketIOProvider, useEventListener, useSend } from '@jamsocket/javascript/socketio'
import type { SpawnResult } from '@jamsocket/javascript/types'

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
  //...
}
```

# Library Reference

## @jamsocket/javascript/server

### `init()`

Spawn backends using the `init` function from `@jamsocket/javascript/server` folder. `init` will return a `spawn` function that you can use to spawn a session backend.

<Callout>Backends should only be spawned server-side, since the Jamsocket Auth Token must be kept secret.</Callout>

#### Usage

In local development, you can simply set `dev` to `true`.

```ts
import { init } from '@jamsocket/javascript/server'

const spawnBackend = init({ dev: true })

const spawnResult = await spawnBackend()
```

In production, provide your `account`, `token`, and `service` information.

```js
import { init } from '@jamsocket/javascript/server'

const spawnBackend = init({
  account: '[YOUR ACCOUNT]',
  token: '[YOUR TOKEN]',
  service: '[YOUR SERVICE]',
})

const spawnResult = await spawnBackend({
  lock: 'my-lock',
  env: { MY_ENV_VAR: 'foo' },
  gracePeriodSeconds: 300,
})
```

```js
const spawnResult = await spawnBackend()
```

#### Typescript

```ts
export type JamsocketDevInitOptions = {
  dev: true
  port?: number
}

export type JamsocketInitOptions =
  | {
      account: string
      token: string
      service: string
    }
  | JamsocketDevInitOptions

export type JamsocketSpawnOptions = {
  lock?: string
  env?: Record<string, string>
  gracePeriodSeconds?: number
}
```

## @jamsocket/javascript/client

### `SessionBackend`

```js
import { SessionBackend } from '@jamsocket/javascript/client'

const sessionBackend = new SessionBackend(spawnResultUrl, statusUrl)
```

#### `isReady()`
`isReady` returns a boolean value that is `true` if the backend is ready.

`isReady()`
```js {5}
import { SessionBackend } from '@jamsocket/javascript/client'

const sessionBackend = new SessionBackend(spawnResultUrl, statusUrl)

const isReady = sessionBackend.isReady()
```

#### `onReady()`
`onReady` takes a callback function that is called when the session backend is ready.

```js {5-7}
import { SessionBackend } from '@jamsocket/javascript/client'

const sessionBackend = new SessionBackend(spawnResultUrl, statusUrl)

sessionBackend.onReady(() => {
    // your logic here
})
```

#### `destroy()`
`destroy` terminates your client connection, but it does not terminate the session backend.

```js {5}
import { SessionBackend } from '@jamsocket/javascript/client'

const sessionBackend = new SessionBackend(spawnResultUrl, statusUrl)

sessionBackend.destroy()
```

## @jamsocket/javascript/react

### `SessionBackendProvider`
Wrap the root of your project with the `SessionBackendProvider` so that the children components can utilize the React hooks.

<Callout>The `SessionBackendProvider` must be used in conjunction with `@jamsocket/javascript/server` in order to access the spawn result returned by the `init` function.</Callout>

```tsx
import { SessionBackendProvider } from '@jamsocket/javascript/react'
import type { SpawnResult } from '@jamsocket/javascript/types'

export default function HomeContainer({ spawnResult }: { spawnResult: SpawnResult }) {
  return (
    <SessionBackendProvider spawnResult={spawnResult}>
        <Home />
    </SessionBackendProvider>
  )
}
```

#### `useReady`
Is a React hook that returns a boolean that is true if the session backend is ready.
```tsx
import { useReady } from '@jamsocket/javascript/react'

const isReady = useReady()
```

## @jamsocket/javascript/socketio

### `SocketIOProvider`

The `SocketIOProvider` uses the url returned by spawning a backend to connect to a SocketIO server running in your session backend.

Using the `SocketIOProvider` lets you use the React hooks in `@jamsocket/javascript/socketio`. It must be used in conjunction with `@jamsocket/javascript/server` and `@jamsocket/javascript/react` in order to properly access the session backend.

<Callout>The `SocketIOProvider` must be a child of the `SessionBackendProvider` because it depends on the SessionBackendProvider's context.</Callout>

```tsx
import { SessionBackendProvider } from '@jamsocket/javascript/react'
import { SocketIOProvider } from '@jamsocket/javascript/socketio'
import type { SpawnResult } from '@jamsocket/javascript/types'

export default function HomeContainer({ spawnResult }: { spawnResult: SpawnResult }) {
  return (
    <SessionBackendProvider spawnResult={spawnResult}>
      <SocketIOProvider url={spawnResult.url}>
          <Home />
      </SocketIOProvider>
    </SessionBackendProvider>
  )
}
```

#### `useSend`
`useSend` lets you send events to the SocketIO server.
```tsx
import { sendEvent } from '@jamsocket/javascript/socketio'

const sendEvent = useSend()

sendEvent('new-event', eventMessage)
```

#### `useEventListener`
`useEventListener` lets you listen to events coming from the SocketIO server.
```tsx
import { useEventListener } from '@jamsocket/javascript/socketio'

useEventListener<T>('event', (data: T) => {
    // do something when a new event appears
})
```
