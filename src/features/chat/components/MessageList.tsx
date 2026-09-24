import type { Message } from '../../../api/messages.ts'
import { MessageBubble } from './MessageBubble.tsx'
import styles from './MessageList.module.css'

interface MessageListProps {
  messages: readonly Message[]
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <ol className={styles.list} role="log" aria-label="Messages">
      {messages.map((message) => (
        <li key={message._id} className={styles.item}>
          <MessageBubble message={message} />
        </li>
      ))}
    </ol>
  )
}
