import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UserNameForm } from './UserNameForm.tsx'

const setup = (props: Partial<Parameters<typeof UserNameForm>[0]> = {}) => {
  const onSubmit = vi.fn()
  render(<UserNameForm onSubmit={onSubmit} {...props} />)
  return {
    user: userEvent.setup(),
    onSubmit,
    input: screen.getByLabelText('Your name'),
  }
}

describe('UserNameForm', () => {
  it('shows an error and does not submit an empty name', async () => {
    const { user, onSubmit, input } = setup()

    await user.click(screen.getByRole('button', { name: 'Start chatting' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your name.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Please enter your name.')
    expect(input).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects characters the API does not allow', async () => {
    const { user, onSubmit, input } = setup()

    await user.type(input, 'Nando!{Enter}')

    expect(screen.getByRole('alert')).toHaveTextContent(/letters .* numbers/)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the trimmed name', async () => {
    const { user, onSubmit, input } = setup()

    await user.type(input, '  Nando  {Enter}')

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Nando')
  })

  it('clears the error as soon as the user edits the field', async () => {
    const { user, input } = setup()

    await user.type(input, '{Enter}')
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.type(input, 'N')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('pre-fills the field with the initial name', () => {
    const { input } = setup({ initialName: 'Maddie' })

    expect(input).toHaveValue('Maddie')
  })

  it('shows Cancel only in "change name" mode', () => {
    setup()

    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })

  it('calls onCancel from the Cancel button in "change name" mode', async () => {
    const onCancel = vi.fn()
    const { user, onSubmit } = setup({ initialName: 'Maddie', onCancel })
    expect(screen.getByRole('heading', { name: 'Change your name' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
