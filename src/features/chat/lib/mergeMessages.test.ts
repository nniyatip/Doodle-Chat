import { describe, expect, it } from 'vitest'

import type { Message } from '../../../api/messages.ts'
import { mergeMessages } from './mergeMessages.ts'

const startedAt = Date.now()

/** ISO timestamp relative to when the test file started, e.g. at(-60_000) = one minute earlier. */
const at = (offsetMs: number) => new Date(startedAt + offsetMs).toISOString()

const message = (id: string, createdAt: string, text = `Message ${id}`): Message => ({
  _id: id,
  message: text,
  author: 'Maddie',
  createdAt,
})

const ids = (messages: Message[]) => messages.map(({ _id }) => _id)

describe('mergeMessages', () => {
  it('appends newer messages in chronological order', () => {
    const current = [message('a', at(-120_000)), message('b', at(-60_000))]

    const merged = mergeMessages(current, [message('c', at(0))])

    expect(ids(merged)).toEqual(['a', 'b', 'c'])
  })

  it('removes duplicates by _id, e.g. a sent message that also arrives by polling', () => {
    const sent = message('b', at(-60_000))
    const current = [message('a', at(-120_000)), sent]

    const merged = mergeMessages(current, [{ ...sent }, message('c', at(0))])

    expect(ids(merged)).toEqual(['a', 'b', 'c'])
  })

  it('sorts out-of-order input and orders equal timestamps by _id', () => {
    const same = at(-30_000)

    const merged = mergeMessages(
      [message('d', at(0))],
      [message('c', same), message('a', at(-90_000)), message('b', same)],
    )

    expect(ids(merged)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('returns the same array when nothing changed', () => {
    const current = [message('a', at(-60_000)), message('b', at(0))]

    expect(mergeMessages(current, [])).toBe(current)
    expect(
      mergeMessages(
        current,
        current.map((m) => ({ ...m })),
      ),
    ).toBe(current)
  })

  it('does not mutate its inputs', () => {
    const current = [message('b', at(0))]
    const incoming = [message('a', at(-60_000))]
    const currentCopy = structuredClone(current)
    const incomingCopy = structuredClone(incoming)

    mergeMessages(current, incoming)

    expect(current).toEqual(currentCopy)
    expect(incoming).toEqual(incomingCopy)
  })

  it('replaces a known message with the incoming version', () => {
    const current = [message('a', at(-60_000), 'Old text'), message('b', at(0))]

    const merged = mergeMessages(current, [message('a', at(-60_000), 'New text')])

    expect(merged).not.toBe(current)
    expect(merged.map(({ message: text }) => text)).toEqual(['New text', 'Message b'])
  })
})
