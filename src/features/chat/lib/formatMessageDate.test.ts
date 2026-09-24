import { describe, expect, it } from 'vitest'

import { formatMessageDate } from './formatMessageDate.ts'

// Vitest runs with TZ=UTC (vitest.config.ts), so local time equals UTC here.

/** Today at a fixed local time, so the date part is dynamic but the time part is known. */
const todayAt = (hours: number, minutes: number) => {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

/** Independent reference for the month abbreviation (en-US always uses "Sep"). */
const shortMonth = (date: Date) => date.toLocaleString('en-US', { month: 'short' })

const datePart = (date: Date) =>
  `${date.getDate()} ${shortMonth(date)} ${date.getFullYear()}`

const pad = (value: number) => String(value).padStart(2, '0')

describe('formatMessageDate', () => {
  it('formats a timestamp like the design ("10 Mar 2018 9:55")', () => {
    const date = todayAt(9, 55)

    expect(formatMessageDate(date.toISOString())).toBe(`${datePart(date)} 9:55`)
  })

  it('does not pad the hour but pads the minutes', () => {
    const midnight = todayAt(0, 5)
    const evening = todayAt(21, 5)

    expect(formatMessageDate(midnight.toISOString())).toBe(`${datePart(midnight)} 0:05`)
    expect(formatMessageDate(evening.toISOString())).toBe(`${datePart(evening)} 21:05`)
  })

  it('uses the correct abbreviation for every month', () => {
    const year = new Date().getFullYear()

    const months = Array.from(
      { length: 12 },
      (_, month) =>
        formatMessageDate(new Date(year, month, 1).toISOString()).split(' ')[1],
    )

    expect(months).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ])
  })

  it('converts timestamps with an offset to local time', () => {
    const today = new Date()
    const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}T01:30:00.000+02:00`
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)

    expect(formatMessageDate(iso)).toBe(`${datePart(yesterday)} 23:30`)
  })

  it('formats the current time', () => {
    const now = new Date()

    const formatted = formatMessageDate(now.toISOString())

    expect(formatted).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4} \d{1,2}:\d{2}$/)
    expect(formatted.startsWith(datePart(now))).toBe(true)
  })

  it('returns invalid input unchanged', () => {
    expect(formatMessageDate('not a date')).toBe('not a date')
    expect(formatMessageDate('')).toBe('')
  })
})
