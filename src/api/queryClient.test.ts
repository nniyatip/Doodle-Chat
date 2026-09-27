import { MutationObserver, onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from './http.ts'
import { createQueryClient, shouldRetry } from './queryClient.ts'

describe('createQueryClient', () => {
  afterEach(() => {
    onlineManager.setOnline(true)
  })

  it('still sends requests while the browser reports being offline', async () => {
    onlineManager.setOnline(false)
    const client = createQueryClient()
    const queryFn = vi.fn(async () => [])
    const mutationFn = vi.fn(async () => 'sent')

    void client.query({ queryKey: ['messages'], queryFn })
    void new MutationObserver(client, { mutationFn }).mutate()

    await vi.waitFor(() => {
      expect(queryFn).toHaveBeenCalledOnce()
      expect(mutationFn).toHaveBeenCalledOnce()
    })
  })
})

describe('shouldRetry', () => {
  it('does not retry client errors', () => {
    for (const status of [400, 401, 404]) {
      expect(shouldRetry(0, new ApiError(status, 'Nope'))).toBe(false)
    }
  })

  it('retries network errors, timeouts and server errors', () => {
    for (const status of [0, 408, 500, 503]) {
      expect(shouldRetry(0, new ApiError(status, 'Try again'))).toBe(true)
    }
  })

  it('does not retry errors that are not ApiErrors (cancellations, bugs)', () => {
    expect(shouldRetry(0, new DOMException('Aborted', 'AbortError'))).toBe(false)
    expect(shouldRetry(0, new TypeError('x is undefined'))).toBe(false)
  })

  it('stops after two retries', () => {
    const error = new ApiError(500, 'Server error')

    expect(shouldRetry(1, error)).toBe(true)
    expect(shouldRetry(2, error)).toBe(false)
  })
})
