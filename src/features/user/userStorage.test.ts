import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as UserStorage from './userStorage.ts'

const STORAGE_KEY = 'doodle-chat:user'

// The module keeps an in-memory fallback, so each test gets a fresh copy of it.
let storage: typeof UserStorage

beforeEach(async () => {
  localStorage.clear()
  vi.resetModules()
  storage = await import('./userStorage.ts')
})

afterEach(() => {
  vi.restoreAllMocks()
})

const failWrites = () =>
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError')
  })

describe('userStorage', () => {
  it('returns null when nothing is saved, and the name once saved', () => {
    expect(storage.readUserName()).toBeNull()

    storage.saveUserName('Nandola')

    expect(storage.readUserName()).toBe('Nandola')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('Nandola')
  })

  it('ignores and removes a saved value that is not a valid name', () => {
    localStorage.setItem(STORAGE_KEY, '<script>')

    expect(storage.readUserName()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('falls back to memory when localStorage is completely unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })
    failWrites()

    expect(() => storage.saveUserName('Maddie')).not.toThrow()
    expect(storage.readUserName()).toBe('Maddie')
  })

  it('reports name changes from other tabs until unsubscribed', () => {
    const onChange = vi.fn()
    const unsubscribe = storage.subscribeToUserName(onChange)
    const fromOtherTab = (key: string | null) =>
      window.dispatchEvent(new StorageEvent('storage', { key }))

    fromOtherTab(STORAGE_KEY)
    // `key` is null when the other tab cleared all storage.
    fromOtherTab(null)
    fromOtherTab('something-else')
    expect(onChange).toHaveBeenCalledTimes(2)

    unsubscribe()
    fromOtherTab(STORAGE_KEY)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('prefers the newer in-memory name over an older stored one', () => {
    storage.saveUserName('Nandola')
    failWrites()

    storage.saveUserName('Maddie')

    expect(localStorage.getItem(STORAGE_KEY)).toBe('Nandola')
    expect(storage.readUserName()).toBe('Maddie')
  })
})
