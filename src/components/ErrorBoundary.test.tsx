import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from './ErrorBoundary.tsx'

function Broken(): never {
  throw new Error('Boom')
}

beforeEach(() => {
  // React and the boundary both log the caught error; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a fallback with a reload action when a child throws', async () => {
    const onReload = vi.fn()
    render(
      <ErrorBoundary onReload={onReload}>
        <Broken />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reload' }))

    expect(onReload).toHaveBeenCalledOnce()
  })
})
