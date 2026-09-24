import { useLayoutEffect, useRef } from 'react'

import styles from './ChatPage.module.css'
import { ChatEmpty, ChatError, ChatLoading } from './components/ChatStatus.tsx'
import { MessageList } from './components/MessageList.tsx'
import { useMessages } from './hooks/useMessages.ts'

interface ChatPageProps {
  userName: string
  onChangeName: () => void
}

export function ChatPage({ userName, onChangeName }: ChatPageProps) {
  const { data: messages, error, isFetching, refetch } = useMessages()
  const scrollRef = useRef<HTMLElement>(null)
  const hasScrolledToLatest = useRef(false)

  // Open at the newest message, like any chat app. Later scrolling rules come with polling.
  useLayoutEffect(() => {
    const container = scrollRef.current
    if (hasScrolledToLatest.current || !container || !messages?.length) return
    container.scrollTop = container.scrollHeight
    hasScrolledToLatest.current = true
  }, [messages])

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

      <main ref={scrollRef} className={styles.main}>
        <div className={styles.content}>{renderContent()}</div>
      </main>
    </div>
  )
}
