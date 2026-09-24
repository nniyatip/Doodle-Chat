import { describe, expect, it } from 'vitest'

import { EnvError, parseEnv } from './env.ts'

const catchEnvError = (run: () => unknown): EnvError => {
  try {
    run()
  } catch (error) {
    if (error instanceof EnvError) return error
    throw error
  }
  throw new Error('Expected parseEnv to throw an EnvError')
}

describe('parseEnv', () => {
  it('returns the config and removes a trailing slash from the URL', () => {
    expect(
      parseEnv({
        VITE_API_URL: 'http://localhost:3000/api/v1/',
        VITE_API_TOKEN: 'token',
      }),
    ).toEqual({ apiUrl: 'http://localhost:3000/api/v1', apiToken: 'token' })
  })

  it('reports every missing variable at once', () => {
    const error = catchEnvError(() => parseEnv({}))

    expect(error.problems).toEqual([
      'VITE_API_URL is missing.',
      'VITE_API_TOKEN is missing.',
    ])
  })

  it('rejects values that are not http(s) URLs', () => {
    for (const url of ['not a url', 'localhost:3000/api/v1']) {
      const error = catchEnvError(() =>
        parseEnv({ VITE_API_URL: url, VITE_API_TOKEN: 't' }),
      )

      expect(error.problems).toEqual([
        `VITE_API_URL must be an http(s) URL, got "${url}".`,
      ])
    }
  })

  it('treats whitespace-only values as missing', () => {
    const error = catchEnvError(() =>
      parseEnv({ VITE_API_URL: 'http://localhost:3000', VITE_API_TOKEN: '   ' }),
    )

    expect(error.problems).toEqual(['VITE_API_TOKEN is missing.'])
  })
})
