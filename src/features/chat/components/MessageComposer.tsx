import { useEffect, useId, useRef, useState, type FormEvent } from 'react'

import { MESSAGE_MAX_LENGTH } from '../../../api/messages.ts'
import { useSendMessage } from '../hooks/useSendMessage.ts'
import styles from './MessageComposer.module.css'

/** The "characters left" counter appears this close to the limit. */
const COUNTER_THRESHOLD = 50
const NEARLY_AT_LIMIT = 10

/**
 * What the screen-reader live region says. It changes only at a few points, so typing near
 * the limit isn't announced on every keystroke; the exact count is in the visible counter.
 */
const limitAnnouncement = (remaining: number) => {
  if (remaining <= 0) return 'Character limit reached'
  if (remaining <= NEARLY_AT_LIMIT)
    return `Nearly at the ${MESSAGE_MAX_LENGTH} character limit`
  if (remaining <= COUNTER_THRESHOLD)
    return `Approaching the ${MESSAGE_MAX_LENGTH} character limit`
  return ''
}

interface MessageComposerProps {
  author: string
  /** Called after a message was saved and added to the list. */
  onSent: () => void
  /** Focus the input when shown, e.g. right after the user picked a name. */
  focusOnMount?: boolean
}

export function MessageComposer({
  author,
  onSent,
  focusOnMount = false,
}: MessageComposerProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const errorId = useId()
  const counterId = useId()
  const { mutate, isPending, error, reset } = useSendMessage()

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus()
  }, [focusOnMount])

  const remaining = MESSAGE_MAX_LENGTH - text.length
  const showCounter = remaining <= COUNTER_THRESHOLD
  const describedBy =
    [error && errorId, showCounter && counterId].filter(Boolean).join(' ') || undefined

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = text.trim()
    if (isPending || !message) return

    mutate(
      { message, author },
      {
        onSuccess: () => {
          setText('')
          inputRef.current?.focus()
          onSent()
        },
      },
    )
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-busy={isPending}
      noValidate
    >
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error.message}
        </p>
      )}
      <div className={styles.row}>
        <label htmlFor={inputId} className="visually-hidden">
          Message
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className={styles.input}
          type="text"
          name="message"
          placeholder="Message"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            if (error) reset()
          }}
          // readOnly, not disabled: disabled fields lose keyboard focus.
          readOnly={isPending}
          maxLength={MESSAGE_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="send"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <button type="submit" className={styles.send} aria-disabled={isPending}>
          {isPending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {showCounter && (
        <p id={counterId} className={styles.counter}>
          {remaining} characters left
        </p>
      )}
      <p className="visually-hidden" aria-live="polite">
        {limitAnnouncement(remaining)}
      </p>
    </form>
  )
}
