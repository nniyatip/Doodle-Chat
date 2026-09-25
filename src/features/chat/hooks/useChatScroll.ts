import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'

import type { Message } from '../../../api/messages.ts'

/** Within this distance of the bottom, the user counts as "reading the latest". */
const NEAR_BOTTOM_PX = 80

/**
 * Chat scrolling rules: open at the newest message; follow new messages while the user is at
 * the bottom or when they are their own; otherwise leave the view alone and count the unseen
 * messages from others.
 */
export function useChatScroll(
  scrollRef: RefObject<HTMLElement | null>,
  messages: readonly Message[] | undefined,
  userName: string,
) {
  const [isAtBottom, setIsAtBottom] = useState(true)
  /** The newest message at the moment the user scrolled away from the bottom. */
  const [seenId, setSeenId] = useState<string>()
  const renderedLastId = useRef<string>(undefined)
  const last = messages?.at(-1)

  useLayoutEffect(() => {
    const container = scrollRef.current
    const previousLastId = renderedLastId.current
    renderedLastId.current = last?._id
    if (!container || !last || last._id === previousLastId) return
    if (previousLastId === undefined || isAtBottom || last.author === userName) {
      container.scrollTop = container.scrollHeight
    }
  }, [scrollRef, last, isAtBottom, userName])

  const onScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      NEAR_BOTTOM_PX
    if (!atBottom && isAtBottom) setSeenId(last?._id)
    setIsAtBottom(atBottom)
  }, [scrollRef, isAtBottom, last])

  const scrollToLatest = useCallback(() => {
    const container = scrollRef.current
    if (container) container.scrollTop = container.scrollHeight
    setIsAtBottom(true)
  }, [scrollRef])

  let unseenCount = 0
  if (!isAtBottom && messages) {
    const seenIndex = messages.findIndex(({ _id }) => _id === seenId)
    if (seenIndex !== -1) {
      unseenCount = messages
        .slice(seenIndex + 1)
        .filter(({ author }) => author !== userName).length
    }
  }

  return { unseenCount, onScroll, scrollToLatest }
}
