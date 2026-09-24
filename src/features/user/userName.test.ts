import { describe, expect, it } from 'vitest'

import { USER_NAME_MAX_LENGTH, validateUserName } from './userName.ts'

describe('validateUserName', () => {
  it('trims and accepts a normal name', () => {
    expect(validateUserName('  Nando  ')).toEqual({ ok: true, value: 'Nando' })
  })

  it('accepts digits, spaces, hyphens and underscores', () => {
    expect(validateUserName('Anna-Lena_2 B')).toEqual({
      ok: true,
      value: 'Anna-Lena_2 B',
    })
  })

  it('rejects empty and whitespace-only input', () => {
    for (const raw of ['', '   ']) {
      expect(validateUserName(raw)).toEqual({
        ok: false,
        error: 'Please enter your name.',
      })
    }
  })

  it(`accepts ${USER_NAME_MAX_LENGTH} characters and rejects more`, () => {
    expect(validateUserName('a'.repeat(USER_NAME_MAX_LENGTH)).ok).toBe(true)
    expect(validateUserName('a'.repeat(USER_NAME_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: 'Name can be at most 50 characters.',
    })
  })

  it('rejects characters the API rejects', () => {
    for (const raw of ['Nando!', 'José', '<b>', 'a.b']) {
      expect(validateUserName(raw)).toMatchObject({ ok: false })
    }
  })

  it('allows plain spaces only, not tabs, newlines or non-breaking spaces', () => {
    for (const raw of ['Nando\tMaddie', 'Nando\nMaddie', 'Nando\u00a0Maddie']) {
      expect(validateUserName(raw)).toMatchObject({ ok: false })
    }
  })

  it('requires at least one letter or number', () => {
    for (const raw of ['---', '___', '- _ -']) {
      expect(validateUserName(raw)).toEqual({
        ok: false,
        error: 'Your name needs at least one letter or number.',
      })
    }
    expect(validateUserName('_Nando_').ok).toBe(true)
  })
})
