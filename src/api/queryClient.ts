import { QueryClient } from '@tanstack/react-query'

import { ApiError } from './http.ts'

const MAX_RETRIES = 2

/**
 * Retries only failures that can succeed on a second try: network errors, timeouts and
 * server errors. Client errors (401 wrong token, 400 bad request) are shown immediately.
 * `request()` turns every API failure into an ApiError, so anything else is a cancelled
 * request or a bug, and retrying it would only delay the error.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false
  if (!(error instanceof ApiError)) return false
  return error.status === 0 || error.status === 408 || error.status >= 500
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // Not needed: polling fetches new messages as soon as the tab is visible again.
        refetchOnWindowFocus: false,
      },
    },
  })
}
