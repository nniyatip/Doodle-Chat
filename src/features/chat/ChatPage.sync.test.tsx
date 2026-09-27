import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Message } from '../../api/messages.ts'
import { createFakeChatApi } from '../../test/fakeChatApi.ts'
import {
  jsonResponse,
  makeMessage as message,
  minutesAgo,
  mockFetch,
  urlOf,
} from '../../test/fixtures.ts'
import { renderWithQueryClient } from '../../test/renderWithQueryClient.tsx'
import { ChatPage } from './ChatPage.tsx'
import { POLL_INTERVAL_MS } from './hooks/usePollNewMessages.ts'

const fetchMock = mockFetch()

/** Against a fake of the real API: nothing may be missed, whatever the timing. */
describe('ChatPage sync with the chat API', () => {
  const tick = () => act(() => vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS))
  const isoAt = (ms: number) => new Date(ms).toISOString()

  /** The `after` of every poll so far, oldest first. */
  const pollAfters = () =>
    fetchMock.mock.calls
      .map(([input]) => new URL(urlOf(input)).searchParams.get('after'))
      .filter((after) => after !== null)

  /** Message texts in the order shown. */
  const shown = () =>
    screen
      .getAllByRole('listitem')
      .map((item) => item.querySelector('article p + p')?.textContent)

  const renderChat = async (initial: Message[]) => {
    const api = createFakeChatApi(initial)
    fetchMock.mockImplementation(api.fetch)
    renderWithQueryClient(<ChatPage userName="Nandola" onChangeName={vi.fn()} />)
    await screen.findByRole('log', { name: 'Messages' })
    return api
  }

  const send = async (text: string) => {
    const input = screen.getByRole('textbox', { name: 'Message' })
    fireEvent.change(input, { target: { value: text } })
    fireEvent.submit(input)
    await screen.findByText(text)
  }

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a message someone else posted just before yours', async () => {
    const api = await renderChat([message({ message: 'Old', createdAt: minutesAgo(10) })])
    // Posted after the last poll; the next poll only runs after your message is sent.
    const nina = message({
      author: 'Nina',
      message: 'From Nina',
      createdAt: isoAt(Date.now() - 1000),
    })
    api.messages.push(nina)

    await send('Mine')
    for (let i = 0; i < 5; i++) await tick()

    // Shown once each: re-fetching your own message doesn't duplicate it.
    expect(shown()).toEqual(['Old', 'From Nina', 'Mine'])
    // The first poll after sending continued from before Nina's message, not from yours.
    const [firstPollAfter] = pollAfters()
    expect(Date.parse(firstPollAfter ?? '')).toBeLessThan(Date.parse(nina.createdAt))
  })

  it('still shows it when the chat remounts first, e.g. after "Change name"', async () => {
    const api = createFakeChatApi([
      message({ message: 'Old', createdAt: minutesAgo(10) }),
    ])
    fetchMock.mockImplementation(api.fetch)
    const chat = <ChatPage userName="Nandola" onChangeName={vi.fn()} />
    const { queryClient, unmount } = renderWithQueryClient(chat)
    await screen.findByRole('log', { name: 'Messages' })
    api.messages.push(
      message({
        author: 'Nina',
        message: 'From Nina',
        createdAt: isoAt(Date.now() - 1000),
      }),
    )
    await send('Mine')

    // The name form replaces the chat, then the chat comes back with the cached list.
    unmount()
    render(<QueryClientProvider client={queryClient}>{chat}</QueryClientProvider>)
    await screen.findByText('Mine')
    await tick()

    expect(shown()).toEqual(['Old', 'From Nina', 'Mine'])
    // Only the first page was requested with `before`: the remount didn't reload it.
    expect(
      fetchMock.mock.calls.filter(([input]) => urlOf(input).includes('before=')),
    ).toHaveLength(1)
  })

  it('picks up a message that was saved after newer ones were already shown', async () => {
    const api = await renderChat([message({ message: 'Old', createdAt: minutesAgo(10) })])
    const later = Date.now() - 1000
    api.messages.push(message({ message: 'Later', createdAt: isoAt(later) }))
    await tick()
    expect(shown()).toEqual(['Old', 'Later'])

    // The API stamps `createdAt` before saving, so a slow write can appear out of order.
    api.messages.push(message({ message: 'Earlier', createdAt: isoAt(later - 500) }))
    await tick()

    expect(shown()).toEqual(['Old', 'Earlier', 'Later'])
  })

  it('finds a late message behind more than a page of messages already shown', async () => {
    const start = Date.now() - 3000
    const burst = Array.from({ length: 60 }, (_, i) =>
      message({ message: `Burst ${i}`, createdAt: isoAt(start + i * 10) }),
    )
    const api = await renderChat(burst)
    await tick()
    expect(shown()).toHaveLength(60)

    // Saved late, just before the newest message: the re-read seconds hold 59 known
    // messages before it, more than a page.
    api.messages.push(message({ message: 'Late', createdAt: isoAt(start + 585) }))
    await tick()

    expect(shown().slice(-3)).toEqual(['Burst 58', 'Late', 'Burst 59'])
  })

  it('catches up at once when more than a page of messages arrived', async () => {
    const api = await renderChat([message({ message: 'Old', createdAt: minutesAgo(10) })])
    const start = Date.now() - 5 * 60_000
    for (let i = 0; i < 120; i++) {
      api.messages.push(
        message({ message: `Burst ${i}`, createdAt: isoAt(start + i * 1000) }),
      )
    }

    await tick()

    expect(shown()).toHaveLength(121)
    expect(shown().at(-1)).toBe('Burst 119')
  })

  it('moves on when more than a page of messages share the same few seconds', async () => {
    const start = Date.now() - 60_000
    const burst = Array.from({ length: 60 }, (_, i) =>
      message({ message: `Burst ${i}`, createdAt: isoAt(start + i * 10) }),
    )
    const api = await renderChat(burst)
    api.messages.push(
      message({ message: 'After the burst', createdAt: isoAt(start + 30_000) }),
    )

    await tick()

    expect(shown()).toHaveLength(61)
    expect(shown().at(-1)).toBe('After the burst')
  })

  it('stops asking when the server keeps sending the same full page', async () => {
    const start = Date.now() - 60_000
    const page = Array.from({ length: 50 }, (_, i) =>
      message({ createdAt: isoAt(start + i) }),
    )
    fetchMock.mockImplementation(async () => jsonResponse(200, page))
    renderWithQueryClient(<ChatPage userName="Nandola" onChangeName={vi.fn()} />)
    await screen.findByRole('log', { name: 'Messages' })

    await tick()

    // The first load, then one poll: it reads on once, sees no progress and stops.
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
