import { useQuery } from '@tanstack/react-query'

import { getMessages, MESSAGES_PAGE_SIZE } from '../../../api/messages.ts'
import { mergeMessages } from '../lib/mergeMessages.ts'

export const messagesQueryKey = ['messages'] as const

// The API returns the oldest messages by default, so the latest page needs `before=now`.
// "Now" comes from the client clock; the margin keeps a slow clock from hiding the newest
// messages.
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000

/** The latest page of messages, oldest first. */
export function useMessages() {
  return useQuery({
    queryKey: messagesQueryKey,
    queryFn: async ({ signal }) => {
      const before = new Date(Date.now() + CLOCK_SKEW_TOLERANCE_MS).toISOString()
      const messages = await getMessages({ before, limit: MESSAGES_PAGE_SIZE, signal })
      return mergeMessages([], messages)
    },
  })
}
