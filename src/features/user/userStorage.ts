import { validateUserName } from './userName.ts'

const STORAGE_KEY = 'doodle-chat:user'

// Holds the name only when writing to localStorage failed (blocked, private mode or full),
// so it lasts for the current session. It is newer than anything in storage, so it wins.
let memoryUserName: string | null = null

/** Returns the saved name, or null if none is saved or the saved value is no longer valid. */
export function readUserName(): string | null {
  if (memoryUserName !== null) return memoryUserName

  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage unreadable: nothing saved for this session yet.
  }
  if (stored === null) return null

  const result = validateUserName(stored)
  if (result.ok) return result.value

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore: the invalid value is re-validated on every read anyway.
  }
  return null
}

/** Saves a name that has already been validated with `validateUserName`. */
export function saveUserName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, name)
    memoryUserName = null
  } catch {
    memoryUserName = name
  }
}
