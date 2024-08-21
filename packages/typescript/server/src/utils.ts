import { HTTPError } from '@jamsocket/types'

export function validatePort(port: any): number {
  if (!Number.isInteger(port)) {
    throw new Error(`Jamsocket dev port must be an integer, got ${typeof port}`)
  }
  return port
}

export type SuccessfulResponse = Response & {
  ok: true
  body: NonNullable<ReadableStream<Uint8Array>>
}

export function checkResponse(description: string, response: Response): SuccessfulResponse {
  if (!response.ok) {
    if (response.status === 429) {
      console.warn(
        "You've hit a rate limit with the Jamsocket API. If you are on the free tier, you may have hit our free tier limits. Learn more at https://docs.jamsocket.com/pricing/free-tier-limits",
      )
    }
    throw new HTTPError(
      response.status,
      `Jamsocket: An error occured while calling ${description}: ${response.status} ${response.statusText}`,
    )
  }

  if (!response.body) {
    throw new Error(
      `Jamsocket: An error occured while calling ${description}: response did not include body`,
    )
  }

  return response as SuccessfulResponse
}

export function parseAs<T>(isFn: (msg: any) => msg is T, text: string): T {
  let msg = null
  try {
    msg = JSON.parse(text)
  } catch {}
  if (!isFn(msg)) {
    throw new Error(`Jamsocket: Error parsing message format: ${text}`)
  }
  return msg
}
