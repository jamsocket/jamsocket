import 'server-only';
import HomeContainer from '../components/Home'
import { init } from '@jamsocket/server'

const WHITEBOARD_NAME = 'multiplayer-editor-demo/default'

const spawnBackend = init({ dev: true })

// In production, you'll want to do the following instead:
// const spawnBackend = init({
//   account: '[YOUR ACCOUNT HERE]',
//   service: 'whiteboard-demo',
//   // NOTE: we want to keep the Jamsocket token secret, so we can only do this in a server component
//   token: '[YOUR TOKEN HERE]',
// })

export default async function Page() {
  const spawnResult = await spawnBackend({ lock: WHITEBOARD_NAME })
  return <HomeContainer spawnResult={spawnResult} />
}
