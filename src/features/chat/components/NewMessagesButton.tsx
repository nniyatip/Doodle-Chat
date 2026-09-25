import styles from './NewMessagesButton.module.css'

interface NewMessagesButtonProps {
  count: number
  onClick: () => void
}

export function NewMessagesButton({ count, onClick }: NewMessagesButtonProps) {
  return (
    <button type="button" className={styles.button} onClick={onClick}>
      {count} new {count === 1 ? 'message' : 'messages'} <span aria-hidden="true">↓</span>
    </button>
  )
}
