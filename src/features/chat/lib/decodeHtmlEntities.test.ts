import { describe, expect, it } from 'vitest'

import { decodeHtmlEntities } from './decodeHtmlEntities.ts'

describe('decodeHtmlEntities', () => {
  it('decodes named, decimal and hexadecimal entities', () => {
    expect(decodeHtmlEntities('It&#39;s')).toBe("It's")
    expect(decodeHtmlEntities('&quot;Tom &amp; Jerry&quot;')).toBe('"Tom & Jerry"')
    expect(decodeHtmlEntities('&lt;b&gt; &apos;hi&apos;')).toBe("<b> 'hi'")
    expect(decodeHtmlEntities('Pizza &#x1F355;')).toBe('Pizza 🍕')
  })

  it('decodes only once, so escaped entities stay readable text', () => {
    expect(decodeHtmlEntities('&amp;#39;')).toBe('&#39;')
    expect(decodeHtmlEntities('&amp;lt;script&amp;gt;')).toBe('&lt;script&gt;')
  })

  it('leaves unknown, invalid and incomplete entities untouched', () => {
    expect(decodeHtmlEntities('&nbsp; &copy;')).toBe('&nbsp; &copy;')
    expect(decodeHtmlEntities('&#0; &#x110000; &#99999999;')).toBe(
      '&#0; &#x110000; &#99999999;',
    )
    expect(decodeHtmlEntities('Fish & chips &amp')).toBe('Fish & chips &amp')
  })

  it('returns text without entities unchanged', () => {
    expect(decodeHtmlEntities('Hello 👋')).toBe('Hello 👋')
  })
})
