# @jamsocket/session-backend

[![GitHub Repo stars](https://img.shields.io/github/stars/jamsocket/jamsocket?style=social)](https://github.com/jamsocket/jamsocket)
[![Chat on Discord](https://img.shields.io/discord/939641163265232947)](https://discord.gg/N5sEpsuhh9)
[![npm](https://img.shields.io/npm/v/@jamsocket/server)](https://www.npmjs.com/package/@jamsocket/session-backend)

JavaScript/TypeScript library to be used inside a session backend.

Read the [docs here](https://docs.jamsocket.com)

## Installation
```bash copy
npm install @jamsocket/session-backend
```

## Example usage

```ts
import { JamsocketBackend } from '@jamsocket/session-backend'

const jamsocketBackend = new JamsocketBackend() // auto-configures itself from environment variables

// listenForRequests is assumed to start your application server on the given port. We can either do this
// before or after awaiting the key assignment, but we MUST be ready for requests on jamsocketBackend.port before
// we call assignment.ready().
listenForRequests(jamsocketBackend.port)

const assignment = await jamsocketBackend.assignment()

console.log('key', assignment.key)
console.log('backendId', assignment.backendId)

// Optionally, do some initialization work here based on the key or other fields of assignment.

assignment.ready()
```
