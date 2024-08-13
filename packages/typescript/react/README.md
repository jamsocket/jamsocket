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
import { type ConnectResponse, SessionBackendProvider, useReady } from '@jamsocket/react'

function Root() {
  return(
    <SessionBackendProvider connectResponse={connectResponse}>
      <MyComponent sessionBackendUrl={connectResponse.url} />
    </SessionBackendProvider>
  )
}

function MyComponent({ sessionBackendUrl }) {
  const ready = useReady()

  useEffect(() => {
    if (ready) {
      // make a request to your session backend
      fetch(sessionBackendUrl)
    }
  }, [ready])

  return ready ? <MyChildren /> : <Spinner />
}
```

# Library Reference
## @jamsocket/react

### `SessionBackendProvider`
Wrap the root of your project with the `SessionBackendProvider` so that the children components can utilize the React hooks.

The `SessionBackendProvider` must be used in conjunction with `@jamsocket/server` in order to access the connect response returned by the `connect` function.

```tsx
import { SessionBackendProvider, type ConnectResponse } from '@jamsocket/react'

export default function HomeContainer({ connectResponse }: { connectResponse: ConnectResponse }) {
  return (
    <SessionBackendProvider connectResponse={connectResponse}>
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

### Other exports

The `@jamsocket/react` package also re-exports all of the `@jamsocket/client` package's exports, including classes and types.
