import { afterEach, beforeEach, vi } from 'vitest'

import type { Message } from '../api/messages.ts'

/** Replaces `fetch` in every test of the calling file and returns the mock. */
export function mockFetch() {
  const fetchMock = vi.fn<typeof fetch>()
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })
  return fetchMock
}

/** The URL a `fetch` mock was called with ('' if it wasn't). */
export const urlOf = (input: RequestInfo | URL | undefined): string => {
  if (input === undefined || typeof input === 'string') return input ?? ''
  return input instanceof URL ? input.href : input.url
}

/** The parsed JSON body a `fetch` mock was called with. */
export const jsonBodyOf = (init: RequestInit | undefined): unknown =>
  typeof init?.body === 'string' ? JSON.parse(init.body) : undefined

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
