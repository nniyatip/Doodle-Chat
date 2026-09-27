import { QueryClient } from '@tanstack/react-query'

import { isTransientError } from './http.ts'

const MAX_RETRIES = 2

/**
 * Retries only failures that can succeed on a second try: network errors, timeouts and
 * server errors. Client errors (401 wrong token, 400 bad request) are shown immediately.
 * `request()` turns every API failure into an ApiError, so anything else is a cancelled
 * request or a bug, and retrying it would only delay the error.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && isTransientError(error)
}

export function createQueryClient(): QueryClient {
  // By default TanStack Query holds requests back while the browser reports being offline,
  // which left the chat loading (or "Sending…") forever. Trying anyway shows a real error.
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
}
