import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

import { ResizeObserverStub } from './resizeObserver.ts'

// Always the stub, even if jsdom gains a ResizeObserver: tests trigger it with `resize()`.
globalThis.ResizeObserver = ResizeObserverStub

afterEach(() => {
  cleanup()
})
