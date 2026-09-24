import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/global.css'
import { createQueryClient } from './api/queryClient.ts'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ConfigError } from './config/ConfigError.tsx'
import { EnvError, getEnv } from './config/env.ts'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element "#root" was not found in index.html')
}

const queryClient = createQueryClient()

/** Fails fast with a readable screen instead of a blank page when .env is missing. */
const renderRoot = () => {
  try {
    getEnv()
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    )
  } catch (error) {
    if (error instanceof EnvError) return <ConfigError error={error} />
    throw error
  }
}

createRoot(container).render(<StrictMode>{renderRoot()}</StrictMode>)
