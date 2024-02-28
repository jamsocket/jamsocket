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

## @jamsocket/server

### `init()`

Create a Jamsocket instance using the `init` function from `@jamsocket/server` folder. The returned Jamsocket instance has a `spawn` function that you can use to spawn a session backend.

<Callout>Backends should only be spawned server-side, since the Jamsocket Auth Token must be kept secret.</Callout>

#### Usage

In local development, you can simply set `dev` to `true`.

```ts
import Jamsocket from '@jamsocket/server'

const jamsocket = Jamsocket.init({ dev: true })

const spawnResult = await jamsocket.spawn()
```

In production, provide your `account`, `token`, and `service` information.

```js
import Jamsocket from '@jamsocket/server'

const jamsocket = Jamsocket.init({
  account: '[YOUR ACCOUNT]',
  token: '[YOUR TOKEN]',
  service: '[YOUR SERVICE]',
})

const spawnResult = await jamsocket.spawn({
  lock: 'my-lock',
  env: { MY_ENV_VAR: 'foo' },
  gracePeriodSeconds: 300,
})
```

```js
const spawnResult = await jamsocket.spawn()
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
