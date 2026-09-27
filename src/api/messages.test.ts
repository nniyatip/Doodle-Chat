import { describe, expect, it } from 'vitest'

import {
  jsonResponse,
  makeMessage as message,
  mockFetch,
  urlOf,
} from '../test/fixtures.ts'
import { ApiError } from './http.ts'
import { createMessage, getMessages } from './messages.ts'

const API_URL = 'http://api.test/api/v1'

const fetchMock = mockFetch()

const now = () => new Date().toISOString()

const lastCall = () => {
  const call = fetchMock.mock.lastCall
  if (!call) throw new Error('fetch was not called')
  const [url, init = {}] = call
  return { url: urlOf(url), init }
}

describe('getMessages', () => {
  it('requests /messages without filters and returns the parsed messages', async () => {
    const messages = [message(), message({ author: 'Nina' })]
    fetchMock.mockResolvedValue(jsonResponse(200, messages))

    await expect(getMessages()).resolves.toEqual(messages)

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

  it('rejects malformed payloads with an ApiError', async () => {
    const { author: _author, ...withoutAuthor } = message()

    const badDate = message({ createdAt: 'yesterday' })

    for (const payload of [{ messages: [] }, [withoutAuthor], [badDate]]) {
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
          const signal = init?.signal
          signal?.addEventListener('abort', () => {
            reject(signal.reason as Error)
          })
        }),
    )
    const controller = new AbortController()

    const promise = getMessages({ signal: controller.signal })
    controller.abort()

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('createMessage', () => {
  it('posts the message and author and returns the created message', async () => {
    const created = message({ message: 'Hi all', author: 'Nandola' })
    fetchMock.mockResolvedValue(jsonResponse(201, created))

    await expect(
      createMessage({ message: 'Hi all', author: 'Nandola' }),
    ).resolves.toEqual(created)

    const { url, init } = lastCall()
    expect(url).toBe(`${API_URL}/messages`)
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"message":"Hi all","author":"Nandola"}')
  })

  it('rejects a malformed created message before it enters the cache', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { message: 'Hi', author: 'Nandola' }))

    await expect(
      createMessage({ message: 'Hi', author: 'Nandola' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 201,
      message: 'The server sent an unexpected response.',
    })
  })
})
