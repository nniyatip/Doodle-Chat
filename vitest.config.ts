import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      env: {
        // Dates in tests are asserted against a fixed timezone so they are stable on every machine.
        TZ: 'UTC',
        // Fixed API config so tests never depend on a developer's local .env file.
        VITE_API_URL: 'http://api.test/api/v1',
        VITE_API_TOKEN: 'test-token',
      },
    },
  }),
)
