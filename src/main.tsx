import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/global.css'
import App from './App.tsx'
import { ConfigError } from './config/ConfigError.tsx'
import { EnvError, getEnv } from './config/env.ts'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element "#root" was not found in index.html')
}

/** Fails fast with a readable screen instead of a blank page when .env is missing. */
const renderRoot = () => {
  try {
    getEnv()
    return <App />
  } catch (error) {
    if (error instanceof EnvError) return <ConfigError error={error} />
    throw error
  }
}

createRoot(container).render(<StrictMode>{renderRoot()}</StrictMode>)
