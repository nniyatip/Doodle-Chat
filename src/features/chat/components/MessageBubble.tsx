import { memo, useId } from 'react'

import type { Message } from '../../../api/messages.ts'
import { decodeHtmlEntities } from '../lib/decodeHtmlEntities.ts'
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
  const authorId = useId()
  const timeId = useId()

  return (
    <article
      className={isOwn ? `${styles.bubble} ${styles.own}` : styles.bubble}
      // Named "author + time" for screen-reader article navigation, e.g. "Maddie 22 Sep 2026 15:11".
      aria-labelledby={`${authorId} ${timeId}`}
    >
      {isOwn ? (
        // The design hides the author on own messages; screen readers still need it.
        <p id={authorId} className="visually-hidden">
          You
        </p>
      ) : (
        <p id={authorId} className={styles.author}>
          {message.author}
        </p>
      )}
      <p className={styles.text}>{decodeHtmlEntities(message.message)}</p>
      <time id={timeId} className={styles.time} dateTime={message.createdAt}>
        {formatMessageDate(message.createdAt)}
      </time>
    </article>
  )
})
