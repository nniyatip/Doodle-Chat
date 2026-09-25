import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App.tsx'
import { renderWithQueryClient } from './test/renderWithQueryClient.tsx'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async () => new Response('[]', { status: 200 })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('asks for a name on the first visit', () => {
    renderWithQueryClient(<App />)

    expect(
      screen.getByRole('heading', { name: 'Welcome to Doodle Chat' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Your name')).toBeInTheDocument()
  })

  it('opens the chat and remembers the name after it is submitted', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithQueryClient(<App />)

    await user.type(screen.getByLabelText('Your name'), 'Nando{Enter}')

    expect(screen.getByRole('heading', { name: 'Doodle Chat' })).toBeInTheDocument()
    expect(screen.getByText('Nando')).toBeInTheDocument()
    expect(localStorage.getItem('doodle-chat:user')).toBe('Nando')
    expect(await screen.findByText('No messages yet')).toBeInTheDocument()

    // Simulates a reload: a fresh render reads the saved name and skips the form.
    unmount()
    renderWithQueryClient(<App />)

    expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument()
    expect(screen.getByText('Nando')).toBeInTheDocument()
  })

  it('lets the user cancel or change the name', async () => {
    localStorage.setItem('doodle-chat:user', 'Nando')
    const user = userEvent.setup()
    renderWithQueryClient(<App />)

    await user.click(screen.getByRole('button', { name: 'Change name' }))
    expect(screen.getByLabelText('Your name')).toHaveValue('Nando')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Nando')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Change name' }))
    const input = screen.getByLabelText('Your name')
    await user.clear(input)
    await user.type(input, 'Maddie{Enter}')

    expect(screen.getByText('Maddie')).toBeInTheDocument()
    expect(localStorage.getItem('doodle-chat:user')).toBe('Maddie')
  })

  it('keeps keyboard focus in a sensible place when switching screens', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithQueryClient(<App />)

    // First visit: straight into the name field, then into the message field.
    expect(screen.getByLabelText('Your name')).toHaveFocus()
    await user.type(screen.getByLabelText('Your name'), 'Nando{Enter}')
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveFocus()

    // Change name opens the form focused; Cancel returns to the button that opened it.
    await user.click(screen.getByRole('button', { name: 'Change name' }))
    expect(screen.getByLabelText('Your name')).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Change name' })).toHaveFocus()

    // A reload with a saved name doesn't move focus anywhere.
    unmount()
    renderWithQueryClient(<App />)
    expect(document.body).toHaveFocus()
  })
})
