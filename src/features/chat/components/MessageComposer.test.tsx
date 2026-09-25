import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Message } from '../../../api/messages.ts'
import { renderWithQueryClient } from '../../../test/renderWithQueryClient.tsx'
import { MessageComposer } from './MessageComposer.tsx'

const fetchMock = vi.fn<typeof fetch>()

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const saved = (message: string): Message => ({
  _id: crypto.randomUUID(),
  message,
  author: 'Nando',
  createdAt: new Date().toISOString(),
})

const renderComposer = () => {
  const onSent = vi.fn()
  renderWithQueryClient(<MessageComposer author="Nando" onSent={onSent} />)
  return {
    onSent,
    user: userEvent.setup(),
    input: screen.getByRole('textbox', { name: 'Message' }),
  }
}

const postedBody = (call = 0) => {
  const [, init] = fetchMock.mock.calls[call] ?? []
  return JSON.parse(String(init?.body)) as unknown
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('MessageComposer', () => {
  it('sends the trimmed message with Enter, then clears and keeps focus', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, saved('Hi all')))
    const { user, input, onSent } = renderComposer()

    await user.type(input, '  Hi all  {Enter}')

    await vi.waitFor(() => expect(onSent).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toMatch(/\/messages$/)
    expect(init?.method).toBe('POST')
    expect(postedBody()).toEqual({ message: 'Hi all', author: 'Nando' })
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('sends with the Send button and moves focus back to the input', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, saved('Hello')))
    const { user, input, onSent } = renderComposer()

    await user.type(input, 'Hello')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await vi.waitFor(() => expect(onSent).toHaveBeenCalledOnce())
    expect(postedBody()).toEqual({ message: 'Hello', author: 'Nando' })
    expect(input).toHaveFocus()
  })

  it('does not send an empty or whitespace-only message', async () => {
    const { user, input } = renderComposer()

    await user.type(input, '   {Enter}')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the sending state and ignores more submits until the server replies', async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined))
    const { user, input } = renderComposer()

    await user.type(input, 'Once{Enter}')

    const button = await screen.findByRole('button', { name: 'Sending…' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(input).toHaveAttribute('readonly')

    await user.type(input, '{Enter}')
    await user.click(button)

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('shows the server error, keeps the text and clears the error when typing', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: {
          message: [{ field: 'message', message: 'Message is too long' }],
          timestamp: new Date().toISOString(),
        },
      }),
    )
    const { user, input, onSent } = renderComposer()

    await user.type(input, 'Too long{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Message is too long')
    expect(input).toHaveValue('Too long')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onSent).not.toHaveBeenCalled()

    await user.type(input, '!')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('explains when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { user, input } = renderComposer()

    await user.type(input, 'Anyone?{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Can't reach the chat server. Is the API running?",
    )
    expect(input).toHaveValue('Anyone?')
  })

  it('limits the length and shows a counter near the limit', async () => {
    const { user, input } = renderComposer()

    expect(input).toHaveAttribute('maxLength', '500')
    await user.type(input, 'Short')
    expect(screen.queryByText(/characters left/)).not.toBeInTheDocument()

    await user.clear(input)
    await user.click(input)
    await user.paste('a'.repeat(490))

    expect(screen.getByText('10 characters left')).toBeInTheDocument()
  })
})
