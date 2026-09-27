import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App.tsx'
import { jsonResponse, mockFetch } from './test/fixtures.ts'
import { renderWithQueryClient } from './test/renderWithQueryClient.tsx'

const fetchMock = mockFetch()

beforeEach(() => {
  localStorage.clear()
  fetchMock.mockImplementation(async () => jsonResponse(200, []))
})

describe('App', () => {
  it('opens the chat and remembers the name after it is submitted', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithQueryClient(<App />)

    // First visit: nothing to cancel back to.
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Your name'), 'Nandola{Enter}')

    expect(screen.getByRole('heading', { name: 'Doodle Chat' })).toBeInTheDocument()
    expect(screen.getByText('Nandola')).toBeInTheDocument()
    expect(localStorage.getItem('doodle-chat:user')).toBe('Nandola')
    expect(await screen.findByText('No messages yet')).toBeInTheDocument()

    // Simulates a reload: a fresh render reads the saved name and skips the form.
    unmount()
    renderWithQueryClient(<App />)

    expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument()
    expect(screen.getByText('Nandola')).toBeInTheDocument()
  })

  it('lets the user cancel or change the name', async () => {
    localStorage.setItem('doodle-chat:user', 'Nandola')
    const user = userEvent.setup()
    renderWithQueryClient(<App />)

    await user.click(screen.getByRole('button', { name: 'Change name' }))
    expect(screen.getByLabelText('Your name')).toHaveValue('Nandola')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Nandola')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Change name' }))
    const input = screen.getByLabelText('Your name')
    await user.clear(input)
    await user.type(input, 'Maddie{Enter}')

    expect(screen.getByText('Maddie')).toBeInTheDocument()
    expect(localStorage.getItem('doodle-chat:user')).toBe('Maddie')
  })

  it('follows a name change made in another tab', () => {
    localStorage.setItem('doodle-chat:user', 'Nandola')
    renderWithQueryClient(<App />)

    localStorage.setItem('doodle-chat:user', 'Maddie')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'doodle-chat:user' }))
    })

    expect(screen.getByText('Maddie')).toBeInTheDocument()
    expect(screen.queryByText('Nandola')).not.toBeInTheDocument()
  })

  it('keeps keyboard focus in a sensible place when switching screens', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithQueryClient(<App />)

    // First visit: straight into the name field, then into the message field.
    expect(screen.getByLabelText('Your name')).toHaveFocus()
    await user.type(screen.getByLabelText('Your name'), 'Nandola{Enter}')
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
