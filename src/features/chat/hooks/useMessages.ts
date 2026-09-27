import { queryOptions, useQuery } from '@tanstack/react-query'

import { getMessages, MESSAGES_PAGE_SIZE } from '../../../api/messages.ts'
import { addFetched, emptyChat, type ChatMessages } from '../lib/chatMessages.ts'

// The API returns the oldest messages when no filter is given. Messages before a far-future
// date are the latest page, without trusting the device clock.
const FAR_FUTURE = '9999-12-31T23:59:59.999Z'

const messagesQuery = queryOptions({
  queryKey: ['messages'],
  queryFn: async ({ signal }) => {
    const page = await getMessages({
      before: FAR_FUTURE,
      limit: MESSAGES_PAGE_SIZE,
      signal,
    })
    return addFetched(emptyChat(), page)
  },
  // Polling and sending keep this list current. An automatic refetch (on reconnect or
  // remount) would replace it with a snapshot that can miss the newest messages.
  staleTime: Infinity,
})

/** Typed key: `getQueryData` and `setQueryData` return and take `ChatMessages`. */
export const messagesQueryKey = messagesQuery.queryKey

const selectMessages = (chat: ChatMessages) => chat.messages

/** Every message loaded so far, oldest first. */
export function useMessages() {
  return useQuery({ ...messagesQuery, select: selectMessages })
}
