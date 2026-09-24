import styles from './ChatStatus.module.css'

export function ChatLoading() {
  return (
    <div>
      <p role="status" className="visually-hidden">
        Loading messages…
      </p>
      <div className={styles.skeletons} aria-hidden="true">
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    </div>
  )
}

export function ChatEmpty() {
  return (
    <div className={styles.panel}>
      <p className={styles.title}>No messages yet</p>
      <p className={styles.text}>Say hello to start the conversation.</p>
    </div>
  )
}

interface ChatErrorProps {
  error: Error
  onRetry: () => void
  isRetrying: boolean
}

export function ChatError({ error, onRetry, isRetrying }: ChatErrorProps) {
  return (
    <div className={`${styles.panel} ${styles.error}`} role="alert">
      <p className={styles.title}>Couldn't load messages</p>
      <p className={styles.text}>{error.message}</p>
      <button
        type="button"
        className={styles.retry}
        onClick={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  )
}
