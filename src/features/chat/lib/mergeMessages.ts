import type { Message } from '../../../api/messages.ts'

const byCreatedAt = (a: Message, b: Message) =>
  Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
  (a._id < b._id ? -1 : a._id > b._id ? 1 : 0)

/**
 * Merges incoming messages into the current (chronological) list: de-duplicated by `_id`
 * and sorted oldest first. The API can't edit messages, so a known `_id` is skipped.
 * Returns `current` itself when nothing is new, so React Query and memoised components
 * skip re-rendering. Never mutates its inputs.
 */
export function mergeMessages(
  current: Message[],
  incoming: readonly Message[],
): Message[] {
  const knownIds = new Set(current.map(({ _id }) => _id))
  const added = incoming.filter(({ _id }) => !knownIds.has(_id))
  if (added.length === 0) return current

  const byId = new Map([...current, ...added].map((message) => [message._id, message]))
  return [...byId.values()].sort(byCreatedAt)
}
