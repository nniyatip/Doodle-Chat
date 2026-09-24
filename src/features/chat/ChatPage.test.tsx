import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Message } from '../../api/messages.ts'
import { renderWithQueryClient } from '../../test/renderWithQueryClient.tsx'
import { ChatPage } from './ChatPage.tsx'
import { formatMessageDate } from './lib/formatMessageDate.ts'

const fetchMock = vi.fn<typeof fetch>()

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString()

const message = (overrides: Partial<Message> = {}): Message => ({
  _id: crypto.randomUUID(),
  message: 'Hello',
  author: 'Maddie',
  createdAt: minutesAgo(1),
  ...overrides,
})

const renderPage = (onChangeName = vi.fn()) => ({
  onChangeName,
  user: userEvent.setup(),
  ...renderWithQueryClient(<ChatPage userName="Nando" onChangeName={onChangeName} />),
})

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('ChatPage', () => {
  it('shows a loading state while messages are requested', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined))

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading messages…')
  })

  it('requests the latest page of messages', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))
    const requestedAfter = Date.now()

    renderPage()
    await screen.findByText('No messages yet')

    const [url] = fetchMock.mock.lastCall ?? []
    const { searchParams } = new URL(String(url))
    expect(searchParams.get('limit')).toBe('50')
    expect(searchParams.has('after')).toBe(false)
    // `before` is "now" plus a small margin for a slow client clock.
    const before = Date.parse(searchParams.get('before') ?? '')
    expect(before).toBeGreaterThan(requestedAfter)
    expect(before).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000)
  })

  it('renders messages oldest first with author, text and time', async () => {
    const older = message({
      author: 'Maddie',
      message: 'First!',
      createdAt: minutesAgo(10),
    })
    const newer = message({ author: 'Nina', message: 'Second', createdAt: minutesAgo(2) })
    fetchMock.mockResolvedValue(jsonResponse(200, [newer, older]))

    renderPage()

    const list = await screen.findByRole('log', { name: 'Messages' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)

    const [first, second] = items
    expect(first).toHaveTextContent('Maddie')
    expect(first).toHaveTextContent('First!')
    expect(second).toHaveTextContent('Nina')
    expect(second).toHaveTextContent('Second')

    const time = within(first as HTMLElement).getByText(
      formatMessageDate(older.createdAt),
    )
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('dateTime', older.createdAt)
  })

  it('shows an empty state when there are no messages', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))

    renderPage()

    expect(await screen.findByText('No messages yet')).toBeInTheDocument()
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
  })

  it('shows the error and recovers when the user retries', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { user } = renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Can't reach the chat server. Is the API running?")

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, [message({ message: 'Back online' })]),
    )
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Back online')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the API error message, e.g. for a wrong token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Unauthorized' }))

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Not authorised. Check VITE_API_TOKEN in your .env file.',
    )
  })

  it('shows the current user and lets them change their name', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))
    const { user, onChangeName } = renderPage()

    expect(screen.getByRole('heading', { name: 'Doodle Chat' })).toBeInTheDocument()
    expect(screen.getByText('Nando')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Change name' }))

    expect(onChangeName).toHaveBeenCalledOnce()
  })
})
