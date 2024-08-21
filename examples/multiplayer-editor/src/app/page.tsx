import 'server-only';
import HomeContainer from '../components/Home'
import { Jamsocket } from '@jamsocket/node'

const WHITEBOARD_NAME = 'my-whiteboard-room'

const jamsocket = new Jamsocket({ dev: true })

// In production, you'll want to do the following instead:
// const jamsocket = new Jamsocket({
//   account: '[YOUR ACCOUNT HERE]',
//   service: 'whiteboard-demo',
//   // NOTE: we want to keep the Jamsocket token secret, so we can only do this in a server component
//   token: '[YOUR TOKEN HERE]',
// })

export default async function Page() {
  const connectResponse = await jamsocket.connect({ key: WHITEBOARD_NAME })
  return <HomeContainer connectResponse={connectResponse} />
}
