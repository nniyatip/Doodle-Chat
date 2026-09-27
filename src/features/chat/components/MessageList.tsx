import type { Message } from '../../../api/messages.ts'
import { ChatEmpty } from './ChatStatus.tsx'
import { MessageBubble } from './MessageBubble.tsx'
import styles from './MessageList.module.css'

interface MessageListProps {
  messages: readonly Message[]
  /** The API has no user ids, so a message is "own" when its author matches this name. */
  currentUserName: string
}

export function MessageList({ messages, currentUserName }: MessageListProps) {
  return (
    // The log role lives on a wrapper: on the <ol> itself it would remove the list semantics.
    // It stays mounted when the chat is empty, so screen readers announce the first message.
    <div role="log" aria-label="Messages">
      {messages.length > 0 ? (
        <ol className={styles.list}>
          {messages.map((message) => (
            <li key={message._id} className={styles.item}>
              <MessageBubble
                message={message}
                isOwn={message.author === currentUserName}
              />
            </li>
          ))}
        </ol>
      ) : (
        <ChatEmpty />
      )}
    </div>
  )
}
