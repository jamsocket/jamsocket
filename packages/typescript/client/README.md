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
import Jamsocket from '@jamsocket/server'

const jamsocket = Jamsocket.init({
   account: '[YOUR ACCOUNT]',
   token: '[YOUR TOKEN]',
   service: '[YOUR SERVICE]',
   // during development, you can simply pass { dev: true }
})

const spawnResult = await jamsocket.spawn() // returns an instance of SpawnResult
```

```tsx filename="client.ts"
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(spawnResult.url, spawnResult.statusUrl)

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

const sessionBackend = new SessionBackend(spawnResultUrl, statusUrl)
```

#### `isReady()`
`isReady` returns a boolean value that is `true` if the backend is ready.

`isReady()`
```js {5}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(spawnResultUrl, statusUrl)

const isReady = sessionBackend.isReady()
```

#### `onReady()`
`onReady` takes a callback function that is called when the session backend is ready.

```js {5-7}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(spawnResultUrl, statusUrl)

sessionBackend.onReady(() => {
    // your logic here
})
```

#### `destroy()`
`destroy` terminates your client connection, but it does not terminate the session backend.

```js {5}
import { SessionBackend } from '@jamsocket/client'

const sessionBackend = new SessionBackend(spawnResultUrl, statusUrl)

sessionBackend.destroy()
```

## Types

```ts
type SpawnResult = {
  url: string
  name: string
  readyUrl: string
  statusUrl: string
  spawned: boolean
}
```
