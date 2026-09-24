import { memo } from 'react'

import type { Message } from '../../../api/messages.ts'
import { formatMessageDate } from '../lib/formatMessageDate.ts'
import styles from './MessageBubble.module.css'

interface MessageBubbleProps {
  message: Message
}

/** One chat message. Memoised: the list re-renders on every new message. */
export const MessageBubble = memo(function MessageBubble({
  message,
}: MessageBubbleProps) {
  return (
    <article className={styles.bubble}>
      <p className={styles.author}>{message.author}</p>
      <p className={styles.text}>{message.message}</p>
      <time className={styles.time} dateTime={message.createdAt}>
        {formatMessageDate(message.createdAt)}
      </time>
    </article>
  )
})
