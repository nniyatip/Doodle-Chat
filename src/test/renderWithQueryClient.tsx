import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'

import { createQueryClient } from '../api/queryClient.ts'

/**
 * Renders inside a fresh copy of the app's QueryClient, so tests never share cached data
 * and run with the real settings. Retries are off, so failures show at once; the retry
 * rules have their own tests.
 */
export function renderWithQueryClient(ui: ReactElement) {
  const queryClient = createQueryClient()
  const defaults = queryClient.getDefaultOptions()
  queryClient.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  })
  const result = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
  return { ...result, queryClient }
}
