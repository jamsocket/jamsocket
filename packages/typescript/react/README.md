# @jamsocket/react

[![GitHub Repo stars](https://img.shields.io/github/stars/jamsocket/jamsocket?style=social)](https://github.com/jamsocket/jamsocket)
[![Chat on Discord](https://img.shields.io/discord/939641163265232947)](https://discord.gg/N5sEpsuhh9)
[![npm](https://img.shields.io/npm/v/@jamsocket/react)](https://www.npmjs.com/package/@jamsocket/react)

React hooks for interacting with session backends and the Jamsocket platform.

Read the [docs here](https://docs.jamsocket.com)

## Installation
```bash copy
npm install @jamsocket/react
```

## Example

Here's an example of how different parts of Jamsocket's client libraries work together.

```tsx filename="server.tsx"
import Jamsocket from '@jamsocket/server'

const jamsocket = Jamsocket.init({
   account: '[YOUR ACCOUNT]',
   token: '[YOUR TOKEN]',
   service: '[YOUR SERVICE]',
   // during develpment, you can simply pass { dev: true }
})

const spawnResult = await jamsocket.spawn()
```

```tsx filename="client.tsx"
import { SessionBackendProvider, useReady, type SpawnResult } from '@jamsocket/react'
import { SocketIOProvider, useEventListener, useSend } from '@jamsocket/socketio'

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
## @jamsocket/react

### `SessionBackendProvider`
Wrap the root of your project with the `SessionBackendProvider` so that the children components can utilize the React hooks.

<Callout>The `SessionBackendProvider` must be used in conjunction with `@jamsocket/javascript/server` in order to access the spawn result returned by the `spawn` function.</Callout>

```tsx
import { SessionBackendProvider, type SpawnResult } from '@jamsocket/react'

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
import { useReady } from '@jamsocket/react'

const isReady = useReady()
```
