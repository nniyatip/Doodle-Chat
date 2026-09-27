import { describe, expect, it } from 'vitest'

import type { Message } from '../../../api/messages.ts'
import {
  addFetched,
  addSent,
  emptyChat,
  nextPageAfter,
  pollAfter,
} from './chatMessages.ts'

const message = (id: string, createdAt: string): Message => ({
  _id: id,
  message: `Message ${id}`,
  author: 'Maddie',
  createdAt,
})

const T1 = '2026-09-25T10:00:00.000Z'
const T2 = '2026-09-25T10:00:05.000Z'
const T3 = '2026-09-25T10:00:10.000Z'

describe('addFetched', () => {
  it('adds the messages and moves the sync point to the newest one, in any order', () => {
    const chat = addFetched(emptyChat(), [message('b', T2), message('a', T1)])

    expect(chat.messages.map(({ _id }) => _id)).toEqual(['a', 'b'])
    expect(chat.syncedUntil).toBe(T2)
  })

  it('never moves the sync point back for late, older messages', () => {
    const chat = addFetched(emptyChat(), [message('c', T3)])

    const next = addFetched(chat, [message('a', T1)])

    expect(next.messages.map(({ _id }) => _id)).toEqual(['a', 'c'])
    expect(next.syncedUntil).toBe(T3)
  })

  it('returns the same object when nothing is new, so nothing re-renders', () => {
    const chat = addFetched(emptyChat(), [message('a', T1), message('b', T2)])

    expect(addFetched(chat, [])).toBe(chat)
    expect(addFetched(chat, [{ ...message('b', T2) }])).toBe(chat)
  })
})

describe('addSent', () => {
  it('adds the message without moving the sync point', () => {
    const chat = addFetched(emptyChat(), [message('a', T1)])

    const next = addSent(chat, message('mine', T3))

    expect(next.messages.map(({ _id }) => _id)).toEqual(['a', 'mine'])
    expect(next.syncedUntil).toBe(T1)
  })

  it('returns the same object for a message that is already shown', () => {
    const chat = addFetched(emptyChat(), [message('a', T1)])

    expect(addSent(chat, message('a', T1))).toBe(chat)
  })
})

describe('pollAfter', () => {
  it('starts from the beginning for an empty chat', () => {
    expect(pollAfter(emptyChat(), 5000)).toBe('1970-01-01T00:00:00.000Z')
  })

  it('reads from the given overlap before the sync point', () => {
    const chat = addFetched(emptyChat(), [message('a', T3)])

    expect(pollAfter(chat, 5000)).toBe(T2)
    expect(pollAfter(chat, 0)).toBe(T3)
  })
})

describe('nextPageAfter', () => {
  it('reads on from 1 ms before the newest message, so its millisecond is read again', () => {
    const page = [message('c', T3), message('b', T2)]

    expect(nextPageAfter(page, T1)).toBe('2026-09-25T10:00:09.999Z')
  })

  it('stops when that would not get past `after`, so reading on cannot loop', () => {
    const sameMillisecond = [message('a', T2), message('b', T2)]

    expect(nextPageAfter(sameMillisecond, '2026-09-25T10:00:04.999Z')).toBeUndefined()
    expect(nextPageAfter([message('a', T1)], T2)).toBeUndefined()
    expect(nextPageAfter([], T1)).toBeUndefined()
  })
})
