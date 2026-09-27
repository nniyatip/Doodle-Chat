import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UserNameForm } from './UserNameForm.tsx'

const setup = () => {
  const onSubmit = vi.fn()
  render(<UserNameForm onSubmit={onSubmit} />)
  return {
    user: userEvent.setup(),
    onSubmit,
    input: screen.getByLabelText('Your name'),
  }
}

describe('UserNameForm', () => {
  it('focuses and describes the field, and rejects an empty name accessibly', async () => {
    const { user, onSubmit, input } = setup()

    expect(input).toHaveFocus()
    expect(input).toHaveAccessibleDescription('Choose a name to start chatting.')
    await user.click(screen.getByRole('button', { name: 'Start chatting' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your name.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(
      'Choose a name to start chatting. Please enter your name.',
    )
    expect(input).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects characters the API does not allow', async () => {
    const { user, onSubmit, input } = setup()

    await user.type(input, 'Nandola!{Enter}')

    expect(screen.getByRole('alert')).toHaveTextContent(/letters .* numbers/)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the trimmed name', async () => {
    const { user, onSubmit, input } = setup()

    await user.type(input, '  Nandola  {Enter}')

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Nandola')
  })

  it('clears the error as soon as the user edits the field', async () => {
    const { user, input } = setup()

    await user.type(input, '{Enter}')
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.type(input, 'N')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })
})
