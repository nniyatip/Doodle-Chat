import type { Message } from '../api/messages.ts'

/** A JSON reply as the chat API sends it. */
export const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString()

/** A message from "Maddie" one minute ago, with a unique id; override any field. */
export const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  _id: crypto.randomUUID(),
  message: 'Hello',
  author: 'Maddie',
  createdAt: minutesAgo(1),
  ...overrides,
})
