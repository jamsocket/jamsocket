# @jamsocket/socketio

[![GitHub Repo stars](https://img.shields.io/github/stars/jamsocket/jamsocket?style=social)](https://github.com/jamsocket/jamsocket)
[![Chat on Discord](https://img.shields.io/discord/939641163265232947)](https://discord.gg/N5sEpsuhh9)
[![npm](https://img.shields.io/npm/v/@jamsocket/socketio)](https://www.npmjs.com/package/@jamsocket/socketio)

React hooks for interacting with socket.io servers in Jamsocket session backends.

Read the [docs here](https://docs.jamsocket.com)

## Installation
```bash copy
npm install @jamsocket/socketio
```

## Example

Here's an example of how different parts of Jamsocket's client libraries work together.

```ts filename="server.ts"
import { Jamsocket } from '@jamsocket/node'

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

## @jamsocket/socketio

### `SocketIOProvider`

The `SocketIOProvider` uses the url returned from the `connect` function to connect to a SocketIO server running in your session backend.

Using the `SocketIOProvider` lets you use the React hooks in `@jamsocket/socketio`. It must be used in conjunction with `@jamsocket/node` and `@jamsocket/react` in order to properly access the session backend.

<Callout>The `SocketIOProvider` must be a child of the `SessionBackendProvider` because it depends on the SessionBackendProvider's context.</Callout>

```tsx
import { SessionBackendProvider, type SpawnResult } from '@jamsocket/react'
import { SocketIOProvider } from '@jamsocket/socketio'

export default function HomeContainer({ connectResponse }: { connectResponse: ConnectResponse }) {
  return (
    <SessionBackendProvider connectResponse={connectResponse}>
      <SocketIOProvider url={connectResponse.url}>
          <Home />
      </SocketIOProvider>
    </SessionBackendProvider>
  )
}
```

#### `useSend`
`useSend` lets you send events to the SocketIO server.
```tsx
import { sendEvent } from '@jamsocket/socketio'

const sendEvent = useSend()

sendEvent('new-event', eventMessage)
```

#### `useEventListener`
`useEventListener` lets you listen to events coming from the SocketIO server.
```tsx
import { useEventListener } from '@jamsocket/socketio'

useEventListener<T>('event', (data: T) => {
    // do something when a new event appears
})
```

### Other exports

The `@jamsocket/socketio` package also re-exports all of the `@jamsocket/client`, `@jamsocket/react`, and `@jamsocket/types` packages' exports, including their React providers, hooks, classes, and types.
