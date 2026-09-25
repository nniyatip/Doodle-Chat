import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { jsonResponse, makeMessage } from '../../../test/fixtures.ts'
import { renderWithQueryClient } from '../../../test/renderWithQueryClient.tsx'
import { MessageComposer } from './MessageComposer.tsx'

const fetchMock = vi.fn<typeof fetch>()

const saved = (message: string) =>
  makeMessage({ message, author: 'Nando', createdAt: new Date().toISOString() })

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

  it('announces the limit only at a few points, not on every keystroke', async () => {
    const { user, input } = renderComposer()
    const announcement = document.querySelector('[aria-live="polite"]')
    expect(announcement).toHaveClass('visually-hidden')
    expect(announcement).toBeEmptyDOMElement()

    await user.click(input)
    await user.paste('a'.repeat(449))
    expect(announcement).toBeEmptyDOMElement()

    await user.paste('a')
    expect(announcement).toHaveTextContent('Approaching the 500 character limit')
    await user.paste('a'.repeat(30))
    expect(announcement).toHaveTextContent('Approaching the 500 character limit')

    await user.paste('a'.repeat(10))
    expect(announcement).toHaveTextContent('Nearly at the 500 character limit')

    await user.paste('a'.repeat(10))
    expect(announcement).toHaveTextContent('Character limit reached')
    // The visible counter is linked to the input instead of being a live region itself.
    expect(screen.getByText('0 characters left')).not.toHaveAttribute('aria-live')
    expect(input).toHaveAccessibleDescription('0 characters left')
  })

  it('focuses the input on mount only when asked to', () => {
    renderWithQueryClient(
      <MessageComposer author="Nando" onSent={vi.fn()} focusOnMount />,
    )

    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveFocus()
  })
})
