import { QueryClientProvider } from '@tanstack/react-query'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  jsonResponse,
  makeMessage as message,
  minutesAgo,
  mockFetch,
  urlOf,
} from '../../test/fixtures.ts'
import { renderWithQueryClient } from '../../test/renderWithQueryClient.tsx'
import { ChatPage } from './ChatPage.tsx'
import { formatMessageDate } from './lib/formatMessageDate.ts'

const fetchMock = mockFetch()

const renderPage = () => ({
  user: userEvent.setup(),
  ...renderWithQueryClient(<ChatPage userName="Nandola" onChangeName={vi.fn()} />),
})

describe('ChatPage', () => {
  it('shows a loading state while messages are requested', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined))

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading messages…')
  })

  it('requests the latest page of messages, even when the device clock is wrong', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))
    const realNow = Date.now()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2001-01-01T00:00:00.000Z'))

    renderPage()
    await screen.findByText('No messages yet')
    vi.useRealTimers()

    const { searchParams } = new URL(urlOf(fetchMock.mock.lastCall?.[0]))
    expect(searchParams.get('limit')).toBe('50')
    expect(searchParams.has('after')).toBe(false)
    expect(Date.parse(searchParams.get('before') ?? '')).toBeGreaterThan(realNow)
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

  it("marks the current user's messages as own, following name changes", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, [
        message({ author: 'Nandola', message: 'Mine', createdAt: minutesAgo(5) }),
        message({ author: 'Maddie', message: 'Theirs', createdAt: minutesAgo(3) }),
      ]),
    )
    const { rerender, queryClient } = renderPage()

    const list = await screen.findByRole('log', { name: 'Messages' })
    const items = within(list).getAllByRole('listitem')
    const mine = within(items[0] as HTMLElement)
    const theirs = within(items[1] as HTMLElement)
    expect(mine.getByText('You')).toBeInTheDocument()
    expect(mine.queryByText('Nandola')).not.toBeInTheDocument()
    expect(theirs.getByText('Maddie')).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={queryClient}>
        <ChatPage userName="Maddie" onChangeName={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(mine.getByText('Nandola')).toBeInTheDocument()
    expect(theirs.getByText('You')).toBeInTheDocument()
    expect(theirs.queryByText('Maddie')).not.toBeInTheDocument()
  })

  it('adds a sent message to the end of the list as your own', async () => {
    const sent = message({
      author: 'Nandola',
      message: 'My reply',
      createdAt: minutesAgo(0),
    })
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, [message({ message: 'Anyone here?' })]))
      .mockResolvedValueOnce(jsonResponse(201, sent))
    const { user } = renderPage()

    const list = await screen.findByRole('log', { name: 'Messages' })
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'My reply{Enter}')

    await within(list).findByText('My reply')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    const last = within(items[1] as HTMLElement)
    expect(last.getByText('My reply')).toBeInTheDocument()
    expect(last.getByText('You')).toBeInTheDocument()
    // Only the initial GET and the POST: the reply is added without refetching.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['was still loading', () => new Promise<Response>(() => undefined)],
    ['had failed', () => Promise.reject(new TypeError('Failed to fetch'))],
  ])('shows a message sent while the first page %s', async (_state, firstLoad) => {
    const sent = message({ author: 'Nandola', message: 'Early bird' })
    fetchMock
      .mockImplementationOnce(firstLoad)
      .mockResolvedValueOnce(jsonResponse(201, sent))
      .mockResolvedValueOnce(jsonResponse(200, [sent]))
    const { user } = renderPage()

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Early bird{Enter}')

    const list = await screen.findByRole('log', { name: 'Messages' })
    expect(within(list).getByText('Early bird')).toBeInTheDocument()
  })

  it('replaces the empty state with the first sent message', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(
        jsonResponse(201, message({ author: 'Nandola', message: 'Hi!' })),
      )
    const { user } = renderPage()

    await screen.findByText('No messages yet')
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Hi!{Enter}')

    const list = await screen.findByRole('log', { name: 'Messages' })
    expect(within(list).getByText('Hi!')).toBeInTheDocument()
    expect(screen.queryByText('No messages yet')).not.toBeInTheDocument()
  })

  it('keeps the composer in the main content and the history keyboard-scrollable', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [message({ message: 'Hi' })]))
    renderPage()

    const log = await screen.findByRole('log', { name: 'Messages' })
    expect(within(log).getByRole('list')).toBeInTheDocument()
    expect(within(log).getAllByRole('listitem')).toHaveLength(1)

    const main = screen.getByRole('main')
    expect(within(main).getByRole('textbox', { name: 'Message' })).toBeInTheDocument()
    expect(within(main).getByRole('region', { name: 'Message history' })).toHaveAttribute(
      'tabindex',
      '0',
    )
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no messages', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))

    renderPage()

    // Shown inside the log, which stays mounted so the first message is announced.
    const log = await screen.findByRole('log', { name: 'Messages' })
    expect(within(log).getByText('No messages yet')).toBeInTheDocument()
    expect(within(log).queryByRole('list')).not.toBeInTheDocument()
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
})
