import type { Message } from '../../../api/messages.ts'
import { mergeMessages } from './mergeMessages.ts'

/**
 * Everything the chat has loaded, as kept in the query cache.
 *
 * Polling continues from `syncedUntil`: the newest `createdAt` the server's message list
 * has returned. Sent messages don't move it. Someone else's message can be older than
 * yours and not fetched yet, and polling from your message would skip it.
 */
export interface ChatMessages {
  /** Oldest first, without duplicates. */
  messages: Message[]
  /** Undefined until a message was fetched. */
  syncedUntil?: string
}

/** A new, empty chat. Always a fresh object, so the cache never shares one. */
export const emptyChat = (): ChatMessages => ({ messages: [] })

const later = (a: string | undefined, b: string) =>
  a !== undefined && Date.parse(a) >= Date.parse(b) ? a : b

/**
 * Adds messages from `GET /messages` (the first page or a poll) and moves the sync point
 * to the newest of them. Returns `chat` itself when nothing changed.
 */
export function addFetched(
  chat: ChatMessages,
  fetched: readonly Message[],
): ChatMessages {
  const messages = mergeMessages(chat.messages, fetched)
  const syncedUntil = fetched.reduce<string | undefined>(
    (until, { createdAt }) => later(until, createdAt),
    chat.syncedUntil,
  )
  if (messages === chat.messages && syncedUntil === chat.syncedUntil) return chat
  return { messages, syncedUntil }
}

/** Adds a message this client sent, leaving the sync point alone (see `ChatMessages`). */
export function addSent(chat: ChatMessages, sent: Message): ChatMessages {
  const messages = mergeMessages(chat.messages, [sent])
  return messages === chat.messages ? chat : { ...chat, messages }
}

/** `after` for an empty chat: every message is new. */
const BEGINNING_OF_TIME = new Date(0).toISOString()

/**
 * The `after` value for the next poll: `overlapMs` before the sync point. The API stamps
 * `createdAt` before saving, so a message can become visible after newer ones, and two
 * messages can share a millisecond. Re-reading a few seconds catches both; the messages
 * already shown are merged away.
 */
export function pollAfter(chat: ChatMessages, overlapMs: number): string {
  if (chat.syncedUntil === undefined) return BEGINNING_OF_TIME
  return new Date(Date.parse(chat.syncedUntil) - overlapMs).toISOString()
}

/**
 * The `after` for the page that follows a full `page` read with `after`: 1 ms before its
 * newest message, as others from that millisecond may not have fitted. Undefined when that
 * isn't past `after` (the server isn't filtering, or a whole page shares one millisecond),
 * so reading on can't loop.
 */
export function nextPageAfter(
  page: readonly Message[],
  after: string,
): string | undefined {
  const next = Math.max(...page.map(({ createdAt }) => Date.parse(createdAt))) - 1
  return next > Date.parse(after) ? new Date(next).toISOString() : undefined
}
