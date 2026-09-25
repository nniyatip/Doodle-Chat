import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Message } from '../../api/messages.ts'
import { renderWithQueryClient } from '../../test/renderWithQueryClient.tsx'
import { ChatPage } from './ChatPage.tsx'
import { POLL_INTERVAL_MS } from './hooks/usePollNewMessages.ts'
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

  it("marks the current user's messages as own, following name changes", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, [
        message({ author: 'Nando', message: 'Mine', createdAt: minutesAgo(5) }),
        message({ author: 'Maddie', message: 'Theirs', createdAt: minutesAgo(3) }),
      ]),
    )
    const { rerender, queryClient } = renderPage()

    const list = await screen.findByRole('log', { name: 'Messages' })
    const items = within(list).getAllByRole('listitem')
    const mine = within(items[0] as HTMLElement)
    const theirs = within(items[1] as HTMLElement)
    expect(mine.getByText('You')).toBeInTheDocument()
    expect(mine.queryByText('Nando')).not.toBeInTheDocument()
    expect(theirs.getByText('Maddie')).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={queryClient}>
        <ChatPage userName="Maddie" onChangeName={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(mine.getByText('Nando')).toBeInTheDocument()
    expect(theirs.getByText('You')).toBeInTheDocument()
    expect(theirs.queryByText('Maddie')).not.toBeInTheDocument()
  })

  it('adds a sent message to the end of the list as your own', async () => {
    const sent = message({
      author: 'Nando',
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

  it('replaces the empty state with the first sent message', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(
        jsonResponse(201, message({ author: 'Nando', message: 'Hi!' })),
      )
    const { user } = renderPage()

    await screen.findByText('No messages yet')
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Hi!{Enter}')

    const list = await screen.findByRole('log', { name: 'Messages' })
    expect(within(list).getByText('Hi!')).toBeInTheDocument()
    expect(screen.queryByText('No messages yet')).not.toBeInTheDocument()
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

describe('ChatPage live updates', () => {
  let visibility: DocumentVisibilityState = 'visible'

  const pollOnce = () => act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS))
  const requestUrl = (call: number) =>
    new URL(String(fetchMock.mock.calls[call]?.[0])).searchParams

  /** First load returns `initial`; each later request gets the next reply, then `[]`. */
  const replyWith = (initial: Message[], ...polls: (Message[] | Error | 'pending')[]) => {
    fetchMock.mockImplementationOnce(async () => jsonResponse(200, initial))
    for (const reply of polls) {
      fetchMock.mockImplementationOnce(async () => {
        if (reply === 'pending') return new Promise<never>(() => undefined)
        if (reply instanceof Error) throw reply
        return jsonResponse(200, reply)
      })
    }
    fetchMock.mockImplementation(async () => jsonResponse(200, []))
  }

  const renderLive = async (
    initial: Message[],
    ...polls: (Message[] | Error | 'pending')[]
  ) => {
    replyWith(initial, ...polls)
    const result = renderWithQueryClient(
      <ChatPage userName="Nando" onChangeName={vi.fn()} />,
    )
    await (initial.length
      ? screen.findByRole('log', { name: 'Messages' })
      : screen.findByText('No messages yet'))
    return result
  }

  /** jsdom has no layout: give the message area a size and a writable scroll position. */
  const stubScrollArea = ({ scrollHeight = 2000, clientHeight = 500 } = {}) => {
    const main = screen.getByRole('main')
    let scrollTop = scrollHeight - clientHeight
    Object.defineProperties(main, {
      scrollHeight: { configurable: true, get: () => scrollHeight },
      clientHeight: { configurable: true, get: () => clientHeight },
      scrollTop: {
        configurable: true,
        get: () => scrollTop,
        set: (value: number) => {
          scrollTop = value
        },
      },
    })
    return {
      main,
      scrollTo: (value: number) => {
        scrollTop = value
        fireEvent.scroll(main)
      },
      growBy: (pixels: number) => {
        scrollHeight += pixels
      },
      get scrollTop() {
        return scrollTop
      },
      get bottom() {
        return scrollHeight
      },
    }
  }

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    visibility = 'visible'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(document, 'visibilityState')
  })

  it('polls for messages newer than the newest one shown and appends them', async () => {
    const older = message({ message: 'First', createdAt: minutesAgo(10) })
    const newest = message({ message: 'Second', createdAt: minutesAgo(2) })
    const incoming = message({
      author: 'Nina',
      message: 'Fresh',
      createdAt: minutesAgo(0),
    })
    await renderLive([older, newest], [incoming])

    await pollOnce()

    const params = requestUrl(1)
    expect(params.get('after')).toBe(newest.createdAt)
    expect(params.get('limit')).toBe('50')
    expect(params.has('before')).toBe(false)
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[2]).toHaveTextContent('Fresh')
  })

  it('does not duplicate messages that are already shown', async () => {
    const known = message({ message: 'Only once' })
    await renderLive([known], [{ ...known }], [])

    await pollOnce()
    await pollOnce()

    expect(screen.getAllByText('Only once')).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('pauses while the tab is hidden and catches up as soon as it is visible', async () => {
    await renderLive(
      [message()],
      [message({ message: 'While away', createdAt: minutesAgo(0) })],
    )
    visibility = 'hidden'

    await pollOnce()
    await pollOnce()
    expect(fetchMock).toHaveBeenCalledOnce()

    visibility = 'visible'
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(await screen.findByText('While away')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('never runs two polls at the same time', async () => {
    await renderLive([message()], 'pending')

    await pollOnce()
    await pollOnce()
    await pollOnce()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('warns after repeated failures, keeps the list and recovers', async () => {
    const failure = new TypeError('Failed to fetch')
    await renderLive([message({ message: 'Still here' })], failure, failure, [])

    await pollOnce()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await pollOnce()

    expect(await screen.findByRole('status')).toHaveTextContent('Connection problem')
    expect(screen.getByText('Still here')).toBeInTheDocument()

    await pollOnce()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('cancels the running poll and stops polling when unmounted', async () => {
    const { unmount } = await renderLive([message()], 'pending')
    await pollOnce()
    const signal = fetchMock.mock.calls[1]?.[1]?.signal

    unmount()
    await pollOnce()

    expect(signal?.aborted).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('polls an empty chat from the beginning', async () => {
    await renderLive([], [message({ message: 'First ever' })])

    await pollOnce()

    expect(requestUrl(1).get('after')).toBe('1970-01-01T00:00:00.000Z')
    expect(await screen.findByText('First ever')).toBeInTheDocument()
    expect(screen.queryByText('No messages yet')).not.toBeInTheDocument()
  })

  it('stays at the bottom when new messages arrive while reading the latest', async () => {
    await renderLive([message()], [message({ message: 'New', createdAt: minutesAgo(0) })])
    const area = stubScrollArea()
    area.scrollTo(area.bottom - 500)
    area.growBy(120)

    await pollOnce()
    await screen.findByText('New')

    expect(area.scrollTop).toBe(area.bottom)
    expect(screen.queryByRole('button', { name: /new message/ })).not.toBeInTheDocument()
  })

  it('leaves the view alone when scrolled up and offers a button to jump down', async () => {
    const reply = (text: string) => [message({ message: text, createdAt: minutesAgo(0) })]
    await renderLive([message()], reply('One'), reply('Two'))
    const area = stubScrollArea()
    area.scrollTo(100)

    await pollOnce()
    expect(
      await screen.findByRole('button', { name: '1 new message' }),
    ).toBeInTheDocument()
    await pollOnce()
    const button = await screen.findByRole('button', { name: '2 new messages' })
    expect(area.scrollTop).toBe(100)

    fireEvent.click(button)

    expect(area.scrollTop).toBe(area.bottom)
    expect(screen.queryByRole('button', { name: /new message/ })).not.toBeInTheDocument()
  })

  it('hides the button when the user scrolls back to the bottom', async () => {
    await renderLive([message()], [message({ message: 'One', createdAt: minutesAgo(0) })])
    const area = stubScrollArea()
    area.scrollTo(100)
    await pollOnce()
    await screen.findByRole('button', { name: '1 new message' })

    area.scrollTo(area.bottom - 500)

    expect(screen.queryByRole('button', { name: /new message/ })).not.toBeInTheDocument()
  })

  it('jumps to the bottom for your own new message, without a button', async () => {
    await renderLive(
      [message()],
      [
        message({
          author: 'Nando',
          message: 'From my other tab',
          createdAt: minutesAgo(0),
        }),
      ],
    )
    const area = stubScrollArea()
    area.scrollTo(100)

    await pollOnce()
    await screen.findByText('From my other tab')

    expect(area.scrollTop).toBe(area.bottom)
    expect(screen.queryByRole('button', { name: /new message/ })).not.toBeInTheDocument()
  })
})
