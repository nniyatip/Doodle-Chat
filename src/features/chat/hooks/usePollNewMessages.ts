import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { isTransientError } from '../../../api/http.ts'
import { getMessages, MESSAGES_PAGE_SIZE } from '../../../api/messages.ts'
import { addFetched, nextPageAfter, pollAfter } from '../lib/chatMessages.ts'
import { messagesQueryKey } from './useMessages.ts'

export const POLL_INTERVAL_MS = 3000
/** How far back each poll re-reads; see `pollAfter`. */
export const POLL_OVERLAP_MS = 5000
const FAILURES_BEFORE_WARNING = 2

interface Failure {
  count: number
  error: Error
}

/**
 * The API has no push, so this asks for messages newer than the newest one fetched, every
 * few seconds while the tab is visible, and merges them into the list. It uses the
 * server's `createdAt`, so a wrong client clock doesn't matter.
 *
 * Returns the error to show when polling keeps failing, or straight away when retrying
 * can't help (e.g. a wrong token).
 */
export function usePollNewMessages(enabled: boolean): { error: Error | undefined } {
  const queryClient = useQueryClient()
  const [failure, setFailure] = useState<Failure>()

  useEffect(() => {
    if (!enabled) return
    let controller: AbortController | null = null

    /**
     * Reads pages until one isn't full, so a long absence is caught up in one go, and a
     * busy few seconds re-read before the sync point can't hide a late message.
     */
    const catchUp = async (signal: AbortSignal) => {
      const chat = queryClient.getQueryData(messagesQueryKey)
      if (!chat) return
      let after: string | undefined = pollAfter(chat, POLL_OVERLAP_MS)
      while (after !== undefined) {
        const page = await getMessages({ after, limit: MESSAGES_PAGE_SIZE, signal })
        const updated = queryClient.setQueryData(
          messagesQueryKey,
          (latest) => latest && addFetched(latest, page),
        )
        if (!updated || page.length < MESSAGES_PAGE_SIZE) return
        after = nextPageAfter(page, after)
      }
    }

    const poll = async () => {
      if (controller || document.visibilityState === 'hidden') return

      const request = new AbortController()
      controller = request
      try {
        await catchUp(request.signal)
        setFailure(undefined)
      } catch (error) {
        if (request.signal.aborted) return
        const cause = error instanceof Error ? error : new Error(String(error))
        setFailure((previous) => ({ count: (previous?.count ?? 0) + 1, error: cause }))
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

  const showError =
    failure !== undefined &&
    (failure.count >= FAILURES_BEFORE_WARNING || !isTransientError(failure.error))
  return { error: showError ? failure.error : undefined }
}
