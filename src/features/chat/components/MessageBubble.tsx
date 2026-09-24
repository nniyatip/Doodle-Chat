import { memo } from 'react'

import type { Message } from '../../../api/messages.ts'
import { formatMessageDate } from '../lib/formatMessageDate.ts'
import styles from './MessageBubble.module.css'

interface MessageBubbleProps {
  message: Message
  /** Sent by the current user: shown on the right, without the author name. */
  isOwn: boolean
}

/** One chat message. Memoised: the list re-renders on every new message. */
export const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
}: MessageBubbleProps) {
  return (
    <article className={isOwn ? `${styles.bubble} ${styles.own}` : styles.bubble}>
      {isOwn ? (
        // The design hides the author on own messages; screen readers still need it.
        <p className="visually-hidden">You</p>
      ) : (
        <p className={styles.author}>{message.author}</p>
      )}
      <p className={styles.text}>{message.message}</p>
      <time className={styles.time} dateTime={message.createdAt}>
        {formatMessageDate(message.createdAt)}
      </time>
    </article>
  )
})
