import type { Message } from '../../../api/messages.ts'
import { MessageBubble } from './MessageBubble.tsx'
import styles from './MessageList.module.css'

interface MessageListProps {
  messages: readonly Message[]
  /** The API has no user ids, so a message is "own" when its author matches this name. */
  currentUserName: string
}

export function MessageList({ messages, currentUserName }: MessageListProps) {
  return (
    <ol className={styles.list} role="log" aria-label="Messages">
      {messages.map((message) => (
        <li key={message._id} className={styles.item}>
          <MessageBubble message={message} isOwn={message.author === currentUserName} />
        </li>
      ))}
    </ol>
  )
}
