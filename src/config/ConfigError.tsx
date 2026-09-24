import styles from './ConfigError.module.css'
import type { EnvError } from './env.ts'

interface ConfigErrorProps {
  error: EnvError
}

/** Shown instead of the app when required environment variables are missing or invalid. */
export function ConfigError({ error }: ConfigErrorProps) {
  return (
    <main className={styles.container}>
      <section className={styles.card} role="alert" aria-labelledby="config-error-title">
        <h1 id="config-error-title" className={styles.title}>
          Doodle Chat is not configured
        </h1>
        <ul className={styles.problems}>
          {error.problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
        <p>
          Copy <code>.env.example</code> to <code>.env</code>, then restart{' '}
          <code>npm run dev</code>.
        </p>
      </section>
    </main>
  )
}
