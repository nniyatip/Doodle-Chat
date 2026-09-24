import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from './http.ts'
import { createMessage, getMessages, type Message } from './messages.ts'

const API_URL = 'http://api.test/api/v1'

const fetchMock = vi.fn<typeof fetch>()

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const now = () => new Date().toISOString()

const message = (overrides: Partial<Message> = {}): Message => ({
  _id: '6f1c2b1e-0000-4000-8000-000000000001',
  message: 'Hello',
  author: 'Maddie',
  createdAt: now(),
  ...overrides,
})

const lastCall = () => {
  const call = fetchMock.mock.lastCall
  if (!call) throw new Error('fetch was not called')
  const [url, init = {}] = call
  return { url: String(url), init }
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('getMessages', () => {
  it('requests /messages without a query string by default', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))

    await getMessages()

    expect(lastCall().url).toBe(`${API_URL}/messages`)
    expect(lastCall().init.method).toBe('GET')
  })

  it('sends `before` and `limit` to load the latest page', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))

    const before = now()

    await getMessages({ before, limit: 50 })

    const { url } = lastCall()
    const { origin, pathname, searchParams } = new URL(url)
    expect(`${origin}${pathname}`).toBe(`${API_URL}/messages`)
    expect(searchParams.get('before')).toBe(before)
    expect(searchParams.get('limit')).toBe('50')
    expect(searchParams.has('after')).toBe(false)
    expect(url).not.toContain(before)
  })

  it('sends `after` to fetch newer messages', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))
    const after = now()

    await getMessages({ after })

    const { url } = lastCall()
    const { origin, pathname, searchParams } = new URL(url)
    expect(`${origin}${pathname}`).toBe(`${API_URL}/messages`)
    expect(searchParams.get('after')).toBe(after)
    expect(searchParams.has('before')).toBe(false)
    expect(searchParams.has('limit')).toBe(false)
    expect(url).not.toContain(after)
  })

  it('returns the messages from the response', async () => {
    const messages = [message(), message({ _id: '2', author: 'Nina' })]
    fetchMock.mockResolvedValue(jsonResponse(200, messages))

    await expect(getMessages()).resolves.toEqual(messages)
  })

  it('rejects malformed payloads with an ApiError', async () => {
    const { author: _author, ...withoutAuthor } = message()

    for (const payload of [{ messages: [] }, [withoutAuthor]]) {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, payload))

      const error = await getMessages().catch((e: unknown) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({ message: 'The server sent an unexpected response.' })
    }
  })

  it('passes the abort signal through to the request', async () => {
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        }),
    )
    const controller = new AbortController()

    const promise = getMessages({ signal: controller.signal })
    controller.abort()

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('does not allow combining `before` and `after`', () => {
    // The API answers 400 for this combination; the type prevents it at compile time.
    // @ts-expect-error `before` and `after` are mutually exclusive
    const params: Parameters<typeof getMessages>[0] = { before: 'a', after: 'b' }

    expect(params).toBeDefined()
  })
})

describe('createMessage', () => {
  it('posts the message and author and returns the created message', async () => {
    const created = message({ message: 'Hi all', author: 'Nando' })
    fetchMock.mockResolvedValue(jsonResponse(201, created))

    await expect(createMessage({ message: 'Hi all', author: 'Nando' })).resolves.toEqual(
      created,
    )

    const { url, init } = lastCall()
    expect(url).toBe(`${API_URL}/messages`)
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"message":"Hi all","author":"Nando"}')
  })

  it('surfaces validation errors from the API as field errors', async () => {
    const fieldErrors = [{ field: 'message', message: 'Message cannot be empty' }]
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: { message: fieldErrors, timestamp: now() },
      }),
    )

    await expect(createMessage({ message: ' ', author: 'Nando' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Message cannot be empty',
      fieldErrors,
    })
  })
})
