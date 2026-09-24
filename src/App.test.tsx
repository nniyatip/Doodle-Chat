import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import App from './App.tsx'

beforeEach(() => {
  localStorage.clear()
})

describe('App', () => {
  it('asks for a name on the first visit', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Welcome to Doodle Chat' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Your name')).toBeInTheDocument()
  })

  it('remembers the name after it is submitted', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.type(screen.getByLabelText('Your name'), 'Nando{Enter}')

    expect(screen.getByText('Nando')).toBeInTheDocument()
    expect(localStorage.getItem('doodle-chat:user')).toBe('Nando')

    // Simulates a reload: a fresh render reads the saved name and skips the form.
    unmount()
    render(<App />)

    expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument()
    expect(screen.getByText('Nando')).toBeInTheDocument()
  })

  it('lets the user cancel or change the name', async () => {
    localStorage.setItem('doodle-chat:user', 'Nando')
    const user = userEvent.setup()
    render(<App />)

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
})
