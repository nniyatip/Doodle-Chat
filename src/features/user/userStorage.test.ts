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

    storage.saveUserName('Nando')

    expect(storage.readUserName()).toBe('Nando')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('Nando')
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

  it('falls back to memory when only writing fails (e.g. Safari private mode)', () => {
    failWrites()

    storage.saveUserName('Maddie')

    expect(storage.readUserName()).toBe('Maddie')
  })

  it('prefers the newer in-memory name over an older stored one', () => {
    storage.saveUserName('Nando')
    failWrites()

    storage.saveUserName('Maddie')

    expect(localStorage.getItem(STORAGE_KEY)).toBe('Nando')
    expect(storage.readUserName()).toBe('Maddie')
  })
})
