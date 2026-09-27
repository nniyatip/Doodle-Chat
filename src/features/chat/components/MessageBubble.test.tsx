import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Message } from '../../../api/messages.ts'
import { formatMessageDate } from '../lib/formatMessageDate.ts'
import { MessageBubble } from './MessageBubble.tsx'
import styles from './MessageBubble.module.css'

// CSS module classes are typed as possibly undefined; fail loudly rather than pass vacuously.
const ownClass = styles.own ?? expect.fail('MessageBubble.module.css has no .own class')

const message: Message = {
  _id: '6f1c2b1e-0000-4000-8000-000000000001',
  message: 'Sounds good to me!',
  author: 'Patricia',
  createdAt: new Date(Date.now() - 60 * 1000).toISOString(),
}
const time = formatMessageDate(message.createdAt)

const renderBubble = (isOwn: boolean, overrides: Partial<Message> = {}) => {
  render(<MessageBubble message={{ ...message, ...overrides }} isOwn={isOwn} />)
  return screen.getByRole('article')
}

describe('MessageBubble', () => {
  it.each([
    // The design hides the author on own messages; screen readers still hear "You".
    { isOwn: false, author: 'Patricia', absent: 'You', authorHidden: false },
    { isOwn: true, author: 'You', absent: 'Patricia', authorHidden: true },
  ])(
    'renders text, time and author (own: $isOwn)',
    ({ isOwn, author, absent, authorHidden }) => {
      const bubble = renderBubble(isOwn)

      expect(bubble).toHaveAccessibleName(`${author} ${time}`)
      expect(bubble.classList.contains(ownClass)).toBe(isOwn)
      expect(within(bubble).getByText('Sounds good to me!')).toBeInTheDocument()
      const timeElement = within(bubble).getByText(time)
      expect(timeElement.tagName).toBe('TIME')
      expect(timeElement).toHaveAttribute('dateTime', message.createdAt)
      const authorElement = within(bubble).getByText(author)
      expect(authorElement.classList.contains('visually-hidden')).toBe(authorHidden)
      expect(within(bubble).queryByText(absent)).not.toBeInTheDocument()
    },
  )

  it('decodes HTML entities in the text but still renders it as plain text', () => {
    const bubble = renderBubble(false, { message: 'It&#39;s &lt;b&gt;fine&lt;/b&gt;' })

    expect(within(bubble).getByText("It's <b>fine</b>")).toBeInTheDocument()
    expect(bubble.querySelector('b')).toBeNull()
  })
})
