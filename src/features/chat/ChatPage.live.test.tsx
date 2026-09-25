import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Message } from '../../api/messages.ts'
import { jsonResponse, makeMessage as message, minutesAgo } from '../../test/fixtures.ts'
import { renderWithQueryClient } from '../../test/renderWithQueryClient.tsx'
import { ChatPage } from './ChatPage.tsx'
import { POLL_INTERVAL_MS } from './hooks/usePollNewMessages.ts'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
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
    const main = screen.getByRole('region', { name: 'Message history' })
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

  it('polls again straight away after quickly hiding and showing the tab', async () => {
    await renderLive([message()], 'pending', [
      message({ message: 'Caught up', createdAt: minutesAgo(0) }),
    ])
    await pollOnce()
    const switchTo = (state: DocumentVisibilityState) => {
      visibility = state
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
    }

    switchTo('hidden')
    switchTo('visible')

    expect(await screen.findByText('Caught up')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
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
    // The button disappears, so focus moves to the history instead of being lost.
    expect(area.main).toHaveFocus()
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
