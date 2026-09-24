export interface Env {
  apiUrl: string
  apiToken: string
}

interface RawEnv {
  VITE_API_URL?: string
  VITE_API_TOKEN?: string
}

export class EnvError extends Error {
  readonly problems: string[]

  constructor(problems: string[]) {
    super(`Invalid app configuration: ${problems.join(' ')}`)
    this.name = 'EnvError'
    this.problems = problems
  }
}

const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** Validates raw environment values, reporting every problem at once. */
export function parseEnv(raw: RawEnv): Env {
  const apiUrl = raw.VITE_API_URL?.trim() ?? ''
  const apiToken = raw.VITE_API_TOKEN?.trim() ?? ''
  const problems: string[] = []

  if (!apiUrl) {
    problems.push('VITE_API_URL is missing.')
  } else if (!isHttpUrl(apiUrl)) {
    problems.push(`VITE_API_URL must be an http(s) URL, got "${apiUrl}".`)
  }
  if (!apiToken) {
    problems.push('VITE_API_TOKEN is missing.')
  }
  if (problems.length > 0) {
    throw new EnvError(problems)
  }

  return { apiUrl: apiUrl.replace(/\/+$/, ''), apiToken }
}

let cachedEnv: Env | undefined

/** Lazily validated app configuration, so a missing .env never crashes at import time. */
export function getEnv(): Env {
  cachedEnv ??= parseEnv(import.meta.env)
  return cachedEnv
}
