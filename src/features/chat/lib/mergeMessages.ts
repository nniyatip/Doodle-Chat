import type { Message } from '../../../api/messages.ts'

const isSameMessage = (a: Message, b: Message) =>
  a.message === b.message && a.author === b.author && a.createdAt === b.createdAt

const byCreatedAt = (a: Message, b: Message) =>
  Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
  (a._id < b._id ? -1 : a._id > b._id ? 1 : 0)

/**
 * Merges incoming messages into the current (chronological) list: de-duplicated by `_id`
 * (incoming wins) and sorted oldest first. Returns `current` itself when nothing changed,
 * so React Query and memoised components skip re-rendering. Never mutates its inputs.
 */
export function mergeMessages(
  current: Message[],
  incoming: readonly Message[],
): Message[] {
  const byId = new Map(current.map((message) => [message._id, message]))
  const changed = incoming.filter((message) => {
    const existing = byId.get(message._id)
    return !existing || !isSameMessage(existing, message)
  })
  if (changed.length === 0) return current

  for (const message of changed) byId.set(message._id, message)
  return [...byId.values()].sort(byCreatedAt)
}
