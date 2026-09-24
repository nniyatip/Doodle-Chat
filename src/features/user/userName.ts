export const USER_NAME_MAX_LENGTH = 50

// Stricter subset of the API's author rule (/^[\w\s-]+$/): plain spaces only, no tabs,
// newlines or non-breaking spaces. Anything accepted here is accepted by the server.
// `\w` is ASCII-only, which is why names like "José" are rejected by the server too.
const USER_NAME_PATTERN = /^[\w -]+$/
const HAS_LETTER_OR_DIGIT = /[A-Za-z0-9]/

export type UserNameResult = { ok: true; value: string } | { ok: false; error: string }

/** Trims and validates a user name so the API always accepts it as a message author. */
export function validateUserName(raw: string): UserNameResult {
  const value = raw.trim()
  if (!value) return { ok: false, error: 'Please enter your name.' }
  if (value.length > USER_NAME_MAX_LENGTH) {
    return { ok: false, error: `Name can be at most ${USER_NAME_MAX_LENGTH} characters.` }
  }
  if (!USER_NAME_PATTERN.test(value)) {
    return {
      ok: false,
      error: 'Use only letters (A–Z), numbers, spaces, hyphens and underscores.',
    }
  }
  if (!HAS_LETTER_OR_DIGIT.test(value)) {
    return { ok: false, error: 'Your name needs at least one letter or number.' }
  }
  return { ok: true, value }
}
