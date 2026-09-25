import { useRef } from 'react'

import styles from './ChatPage.module.css'
import { ChatEmpty, ChatError, ChatLoading } from './components/ChatStatus.tsx'
import { MessageComposer } from './components/MessageComposer.tsx'
import { MessageList } from './components/MessageList.tsx'
import { NewMessagesButton } from './components/NewMessagesButton.tsx'
import { useChatScroll } from './hooks/useChatScroll.ts'
import { useMessages } from './hooks/useMessages.ts'
import { usePollNewMessages } from './hooks/usePollNewMessages.ts'

interface ChatPageProps {
  userName: string
  onChangeName: () => void
}

export function ChatPage({ userName, onChangeName }: ChatPageProps) {
  const { data: messages, error, isFetching, refetch } = useMessages()
  const { isFailing } = usePollNewMessages(messages !== undefined)
  const scrollRef = useRef<HTMLElement>(null)
  const { unseenCount, onScroll, scrollToLatest } = useChatScroll(
    scrollRef,
    messages,
    userName,
  )

  const renderContent = () => {
    if (messages) {
      return messages.length > 0 ? (
        <MessageList messages={messages} currentUserName={userName} />
      ) : (
        <ChatEmpty />
      )
    }
    if (error) {
      return (
        <ChatError error={error} onRetry={() => void refetch()} isRetrying={isFetching} />
      )
    }
    return <ChatLoading />
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>Doodle Chat</h1>
          <div className={styles.userInfo}>
            <p className={styles.user}>
              Chatting as <strong>{userName}</strong>
            </p>
            <button type="button" className={styles.changeName} onClick={onChangeName}>
              Change name
            </button>
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <main ref={scrollRef} className={styles.main} onScroll={onScroll}>
          <div className={styles.content}>{renderContent()}</div>
        </main>
        {unseenCount > 0 && (
          <NewMessagesButton count={unseenCount} onClick={scrollToLatest} />
        )}
      </div>

      <footer className={styles.footer}>
        {isFailing && (
          <p className={styles.notice} role="status">
            Connection problem. New messages may be delayed – retrying…
          </p>
        )}
        <MessageComposer author={userName} onSent={scrollToLatest} />
      </footer>
    </div>
  )
}
