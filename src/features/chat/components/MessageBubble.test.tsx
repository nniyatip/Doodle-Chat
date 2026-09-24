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

const renderBubble = (isOwn: boolean) => {
  render(<MessageBubble message={message} isOwn={isOwn} />)
  return screen.getByRole('article')
}

describe('MessageBubble', () => {
  it("shows the author on other people's messages", () => {
    const bubble = renderBubble(false)

    expect(within(bubble).getByText('Patricia')).toBeVisible()
    expect(within(bubble).queryByText('You')).not.toBeInTheDocument()
    expect(bubble).not.toHaveClass(ownClass)
  })

  it('marks own messages and replaces the author with a hidden "You"', () => {
    const bubble = renderBubble(true)

    expect(bubble).toHaveClass(ownClass)
    expect(within(bubble).getByText('You')).toHaveClass('visually-hidden')
    expect(within(bubble).queryByText('Patricia')).not.toBeInTheDocument()
  })

  it.each([false, true])('renders the text and time (own: %s)', (isOwn) => {
    const bubble = renderBubble(isOwn)

    expect(within(bubble).getByText('Sounds good to me!')).toBeInTheDocument()
    const time = within(bubble).getByText(formatMessageDate(message.createdAt))
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('dateTime', message.createdAt)
  })
})
