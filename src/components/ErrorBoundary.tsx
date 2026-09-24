import { Component, type ErrorInfo, type ReactNode } from 'react'

import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Injectable for tests; reloading is the most reliable recovery from a render error. */
  onReload?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
}

/** Shows a readable fallback instead of a blank page when rendering throws. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected render error', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { onReload = () => window.location.reload() } = this.props
    return (
      <main className={styles.container}>
        <section className={styles.card} role="alert" aria-labelledby="app-error-title">
          <h1 id="app-error-title" className={styles.title}>
            Something went wrong
          </h1>
          <p className={styles.text}>
            An unexpected error stopped the chat. Reloading the page usually fixes it.
          </p>
          <button type="button" className={styles.button} onClick={onReload}>
            Reload
          </button>
        </section>
      </main>
    )
  }
}
