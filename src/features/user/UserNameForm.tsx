import { useId, useRef, useState, type FormEvent } from 'react'

import { USER_NAME_MAX_LENGTH, validateUserName } from './userName.ts'
import styles from './UserNameForm.module.css'

interface UserNameFormProps {
  /** Pre-fills the field, e.g. with the current name when changing it. */
  initialName?: string
  onSubmit: (name: string) => void
  /** When given, the form is in "change name" mode and shows a Cancel button. */
  onCancel?: () => void
}

export function UserNameForm({
  initialName = '',
  onSubmit,
  onCancel,
}: UserNameFormProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const errorId = useId()
  const titleId = useId()
  const isChanging = onCancel !== undefined

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateUserName(name)
    if (!result.ok) {
      setError(result.error)
      inputRef.current?.focus()
      return
    }
    onSubmit(result.value)
  }

  return (
    <main className={styles.container}>
      <section className={styles.card} aria-labelledby={titleId}>
        <h1 id={titleId} className={styles.title}>
          {isChanging ? 'Change your name' : 'Welcome to Doodle Chat'}
        </h1>
        <p className={styles.intro}>
          {isChanging
            ? 'Your new name is used for the messages you send from now on.'
            : 'Choose a name to start chatting.'}
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label htmlFor={inputId} className={styles.label}>
            Your name
          </label>
          <input
            ref={inputRef}
            id={inputId}
            className={styles.input}
            type="text"
            name="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            autoComplete="nickname"
            autoCapitalize="words"
            spellCheck={false}
            maxLength={USER_NAME_MAX_LENGTH}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
          />
          {error && (
            <p id={errorId} className={styles.error} role="alert">
              {error}
            </p>
          )}

          <div className={styles.actions}>
            {isChanging && (
              <button type="button" className={styles.secondary} onClick={onCancel}>
                Cancel
              </button>
            )}
            <button type="submit" className={styles.primary}>
              {isChanging ? 'Save' : 'Start chatting'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
