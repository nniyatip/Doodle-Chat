import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, REQUEST_TIMEOUT_MS, request } from './http.ts'

const API_URL = 'http://api.test/api/v1'

const fetchMock = vi.fn<typeof fetch>()

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

/** Simulates a request that never answers until its signal is aborted. */
const hangUntilAborted: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
  })

const lastCall = () => {
  const call = fetchMock.mock.lastCall
  if (!call) throw new Error('fetch was not called')
  const [url, init = {}] = call
  return { url: String(url), init, headers: init.headers as Record<string, string> }
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('request', () => {
  it('sends an authenticated GET with query parameters, skipping undefined values', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))

    await request('/messages', {
      query: { before: '2026-01-01T00:00:00.000Z', after: undefined, limit: 50 },
    })

    const { url, init, headers } = lastCall()
    expect(url).toBe(`${API_URL}/messages?before=2026-01-01T00%3A00%3A00.000Z&limit=50`)
    expect(init.method).toBe('GET')
    expect(headers).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer test-token',
    })
    expect(init.body).toBeUndefined()
  })

  it('sends a JSON body with a Content-Type header on POST', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { _id: '1' }))

    await request('/messages', {
      method: 'POST',
      body: { message: 'Hi', author: 'Nando' },
    })

    const { init, headers } = lastCall()
    expect(init.method).toBe('POST')
    expect(headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"message":"Hi","author":"Nando"}')
  })

  it('returns the parsed JSON body, or undefined for an empty response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, [{ _id: '1' }]))
    await expect(request('/messages')).resolves.toEqual([{ _id: '1' }])

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(request('/messages')).resolves.toBeUndefined()
  })

  it('maps 401 to an ApiError that points at the token', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        message: 'Invalid token',
        statusCode: 401,
        error: 'Unauthorized',
      }),
    )

    await expect(request('/messages')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Not authorised. Check VITE_API_TOKEN in your .env file.',
    })
  })

  it('maps 400 validation errors to field errors and uses the first one as message', async () => {
    const fieldErrors = [
      { field: 'message', message: 'Message cannot exceed 500 characters' },
      { field: 'author', message: 'Author cannot exceed 50 characters' },
    ]
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: { message: fieldErrors, timestamp: '2026-01-01T00:00:00Z' },
      }),
    )

    const error = await request('/messages').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      message: 'Message cannot exceed 500 characters',
      fieldErrors,
    })
  })

  it('uses a generic message for server errors with a non-JSON body', async () => {
    fetchMock.mockResolvedValue(new Response('<h1>Bad Gateway</h1>', { status: 502 }))

    await expect(request('/messages')).rejects.toMatchObject({
      status: 502,
      message: 'Something went wrong on the server. Please try again.',
    })
  })

  it('maps network failures to status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(request('/messages')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: "Can't reach the chat server. Is the API running?",
    })
  })

  it('times out after REQUEST_TIMEOUT_MS with a 408 ApiError', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(hangUntilAborted)

    const assertion = expect(request('/messages')).rejects.toMatchObject({
      name: 'ApiError',
      status: 408,
    })
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)

    await assertion
  })

  it('rethrows caller cancellation as AbortError instead of an ApiError', async () => {
    fetchMock.mockImplementation(hangUntilAborted)
    const controller = new AbortController()

    const promise = request('/messages', { signal: controller.signal })
    controller.abort()
    const error = await promise.catch((e: unknown) => e)

    expect(error).not.toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ name: 'AbortError' })
  })

  it('reports an invalid JSON success body as an ApiError', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }))

    await expect(request('/messages')).rejects.toMatchObject({
      status: 200,
      message: 'The server sent an unexpected response.',
    })
  })
})
