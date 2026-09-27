import type { Message, NewMessage } from '../api/messages.ts'
import { jsonBodyOf, jsonResponse, makeMessage, urlOf } from './fixtures.ts'

/**
 * An in-memory chat API to use as `fetch`, with the real server's rules
 * (frontend-challenge-chat-api, messages.service.ts): `after` returns the oldest messages
 * newer than it, `before` the newest ones older than it, both oldest first and cut to
 * `limit`; POST stamps `createdAt` with the current time. Push to `messages` to simulate
 * other people posting.
 */
export function createFakeChatApi(initial: Message[] = []) {
  const messages = [...initial]
  const time = (message: Message) => Date.parse(message.createdAt)

  const fetch: typeof globalThis.fetch = async (input, init) => {
    if (init?.method === 'POST') {
      const { message, author } = jsonBodyOf(init) as NewMessage
      const created = makeMessage({
        message,
        author,
        createdAt: new Date().toISOString(),
      })
      messages.push(created)
      return jsonResponse(201, created)
    }

    const params = new URL(urlOf(input)).searchParams
    const after = params.get('after')
    const before = params.get('before')
    const matching = messages
      .filter(
        (message) =>
          (after === null || time(message) > Date.parse(after)) &&
          (before === null || time(message) < Date.parse(before)),
      )
      .sort((a, b) => (before === null ? time(a) - time(b) : time(b) - time(a)))
      .slice(0, Number(params.get('limit') ?? 50))
    return jsonResponse(200, before === null ? matching : matching.reverse())
  }

  return { fetch, messages }
}
