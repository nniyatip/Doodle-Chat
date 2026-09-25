import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { getMessages, MESSAGES_PAGE_SIZE, type Message } from '../../../api/messages.ts'
import { mergeMessages } from '../lib/mergeMessages.ts'
import { messagesQueryKey } from './useMessages.ts'

export const POLL_INTERVAL_MS = 3000
const FAILURES_BEFORE_WARNING = 2
/** `after` for an empty chat: every message is new. */
const BEGINNING_OF_TIME = new Date(0).toISOString()

/**
 * The API has no push, so this asks for messages newer than the newest one shown, every few
 * seconds while the tab is visible, and merges them into the list. It uses the server's
 * `createdAt`, so a wrong client clock doesn't matter.
 */
export function usePollNewMessages(enabled: boolean): { isFailing: boolean } {
  const queryClient = useQueryClient()
  const [failures, setFailures] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let controller: AbortController | null = null

    const poll = async () => {
      const current = queryClient.getQueryData<Message[]>(messagesQueryKey)
      if (controller || document.visibilityState === 'hidden' || !current) return

      const request = new AbortController()
      controller = request
      try {
        const incoming = await getMessages({
          after: current.at(-1)?.createdAt ?? BEGINNING_OF_TIME,
          limit: MESSAGES_PAGE_SIZE,
          signal: request.signal,
        })
        queryClient.setQueryData<Message[]>(
          messagesQueryKey,
          (latest) => latest && mergeMessages(latest, incoming),
        )
        setFailures(0)
      } catch {
        if (!request.signal.aborted) setFailures((count) => count + 1)
      } finally {
        if (controller === request) controller = null
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Clear it now, not when the aborted request settles, so coming back straight
        // away can poll immediately.
        const request = controller
        controller = null
        request?.abort()
      } else {
        void poll()
      }
    }

    const intervalId = setInterval(() => void poll(), POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      controller?.abort()
    }
  }, [enabled, queryClient])

  return { isFailing: failures >= FAILURES_BEFORE_WARNING }
}
