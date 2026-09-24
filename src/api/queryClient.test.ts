import { describe, expect, it } from 'vitest'

import { ApiError } from './http.ts'
import { shouldRetry } from './queryClient.ts'

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
