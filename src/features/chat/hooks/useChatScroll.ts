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
  /** The same, for the observer, effect and scroll handler, without re-running them. */
  const isAtBottomRef = useRef(true)
  const updateIsAtBottom = useCallback((atBottom: boolean) => {
    isAtBottomRef.current = atBottom
    setIsAtBottom(atBottom)
  }, [])
  /** The message ids already loaded when the user scrolled away from the bottom. */
  const [seenIds, setSeenIds] = useState<ReadonlySet<string>>(() => new Set())
  const renderedMessages = useRef<readonly Message[]>(undefined)
  const viewportSize = useRef({ width: 0, height: 0 })
  const last = messages?.at(-1)

  // A shorter history (on-screen keyboard, rotation, an error above the composer) would
  // otherwise cover the newest message, so keep it in view while reading the latest.
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const measure = () => {
      viewportSize.current = {
        width: container.clientWidth,
        height: container.clientHeight,
      }
    }
    // Measured before any scroll event, so `onScroll` can tell a resize from a user scroll.
    measure()
    const observer = new ResizeObserver(() => {
      measure()
      if (isAtBottomRef.current) container.scrollTop = container.scrollHeight
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [scrollRef])

  useLayoutEffect(() => {
    const container = scrollRef.current
    const previous = renderedMessages.current
    renderedMessages.current = messages
    if (!container || !last || messages === previous) return
    const isNewOwn = last.author === userName && last._id !== previous?.at(-1)?._id
    // At the bottom, follow every change: a message can also arrive above the newest one
    // (posted before yours, fetched after it).
    if (!previous?.length || isAtBottomRef.current || isNewOwn) {
      container.scrollTop = container.scrollHeight
    }
  }, [scrollRef, messages, last, userName])

  const onScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    if (
      container.clientWidth !== viewportSize.current.width ||
      container.clientHeight !== viewportSize.current.height
    )
      return
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      NEAR_BOTTOM_PX
    if (!atBottom && isAtBottomRef.current) {
      setSeenIds(new Set(messages?.map(({ _id }) => _id)))
    }
    updateIsAtBottom(atBottom)
  }, [scrollRef, messages, updateIsAtBottom])

  const scrollToLatest = useCallback(() => {
    const container = scrollRef.current
    if (container) container.scrollTop = container.scrollHeight
    updateIsAtBottom(true)
  }, [scrollRef, updateIsAtBottom])

  const unseenCount =
    !isAtBottom && messages
      ? messages.filter(({ _id, author }) => !seenIds.has(_id) && author !== userName)
          .length
      : 0

  return { unseenCount, onScroll, scrollToLatest }
}
