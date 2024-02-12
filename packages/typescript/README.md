# @jamsocket/javascript

JavaScript/TypeScript, and React libraries for interacting with session backends and the Jamsocket platform.

```sh
npm install @jamsocket/javascript
```

### Spawning backends

```js
import { init } from '@jamsocket/javascript/server'

const spawnBackend = init({
  account: '[YOUR ACCOUNT]',
  token: '[YOUR TOKEN]',
  service: '[YOUR SERVICE]',
})

// this spawns a backend via the Jamsocket API and returns a URL you can
// use to connect to your backend - or pass the spawnResult to a SessionBackendProvider and SocketIOProvider
const spawnResult = await spawnBackend()

// you may also pass in any of the following spawn options
// learn more about spawn options at https://docs.jamsocket.com/platform/reference#spawn-a-service
const spawnResult = await spawnBackend({
  lock: 'my-lock',
  tag: 'my-tag',
  env: { MY_ENV_VAR: 'foo' },
  gracePeriodSeconds: 300,
  requireBearerToken: true,
})
```

When developing locally with the [Jamsocket Dev CLI](https://docs.jamsocket.com/platform/dev-cli), you may omit the `account`, `token`, and `service` fields from the `init()` options, and instead pass `dev: true`.

```ts
const spawnBackend = init({
  dev: true
})
```

### React Hooks

```jsx
import { SessionBackendProvider } from '@jamsocket/javascript/react'
import { SocketIOProvider } from '@jamsocket/javascript/socketio'

// wrap a component in a SessionBackendProvider so the child components can use Jamsocket hooks for interacting with the session backend
// wrap a component in a SocketIOProvider so the child components can use hooks for sending and receiving events with the session backend
<SessionBackendProvider spawnResult={spawnResult}>
  <SocketIOProvider url={spawnResult.url}>
    <MyComponent />
  </SocketIOProvider>
</SessionBackendProvider>
```

```js
import { useReady } from '@jamsocket/javascript/react'
import { useEventListener, useSend } from '@jamsocket/javascript/socketio'

function MyComponent() {
  // check when the session backend is ready using useReady
  const ready = useReady()
  const sendEvent = useSend()
  function onMouseMove() {
    // send an event message to your session backend over websockets
    sendEvent('some-event', someValue)
  }

  useEventListener('another-event', (args) => {
    // do something when receiving an event message from your session backend...
  })
}
```
