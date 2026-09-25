import { useEffect, useRef } from 'react'

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
  /**
   * Where focus goes when the chat opens after the name form, which unmounts whatever was
   * focused. Leave it out on a normal page load, so nothing takes focus unasked.
   */
  initialFocus?: 'composer' | 'changeName'
}

export function ChatPage({ userName, onChangeName, initialFocus }: ChatPageProps) {
  const { data: messages, error, isFetching, refetch } = useMessages()
  const { isFailing } = usePollNewMessages(messages !== undefined)
  const scrollRef = useRef<HTMLDivElement>(null)
  const changeNameRef = useRef<HTMLButtonElement>(null)
  const { unseenCount, onScroll, scrollToLatest } = useChatScroll(
    scrollRef,
    messages,
    userName,
  )

  useEffect(() => {
    if (initialFocus === 'changeName') changeNameRef.current?.focus()
  }, [initialFocus])

  // The button disappears once clicked; move focus to the history so it isn't lost.
  const showLatest = () => {
    scrollToLatest()
    scrollRef.current?.focus({ preventScroll: true })
  }

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
            <button
              ref={changeNameRef}
              type="button"
              className={styles.changeName}
              onClick={onChangeName}
            >
              Change name
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.body}>
          <div
            ref={scrollRef}
            className={styles.scroller}
            role="region"
            aria-label="Message history"
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- keyboard users must be able to scroll the history (WCAG 2.1.1)
            tabIndex={0}
            onScroll={onScroll}
          >
            <div className={styles.content}>{renderContent()}</div>
          </div>
          {unseenCount > 0 && (
            <NewMessagesButton count={unseenCount} onClick={showLatest} />
          )}
        </div>

        <div className={styles.composerBar}>
          {isFailing && (
            <p className={styles.notice} role="status">
              Connection problem. New messages may be delayed – retrying…
            </p>
          )}
          <MessageComposer
            author={userName}
            onSent={scrollToLatest}
            focusOnMount={initialFocus === 'composer'}
          />
        </div>
      </main>
    </div>
  )
}
