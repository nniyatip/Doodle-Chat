const NAMED_ENTITIES = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
])

const ENTITY = /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi

/** Real characters only: no control characters (except whitespace) or lone surrogates. */
const isPrintable = (codePoint: number) =>
  codePoint <= 0x10ffff &&
  (codePoint >= 0x20 || codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d) &&
  (codePoint < 0x7f || codePoint > 0x9f) &&
  (codePoint < 0xd800 || codePoint > 0xdfff)

/**
 * Turns HTML entities such as `&#39;` back into the characters they stand for (some stored
 * messages contain them). A single pass, so `&amp;#39;` becomes the literal text `&#39;`.
 * The result is still rendered as plain text, so decoding can't inject markup.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text.includes('&')) return text
  return text.replace(
    ENTITY,
    (
      entity,
      decimal: string | undefined,
      hex: string | undefined,
      name: string | undefined,
    ) => {
      if (name !== undefined) return NAMED_ENTITIES.get(name.toLowerCase()) ?? entity
      const codePoint =
        decimal !== undefined ? Number(decimal) : Number.parseInt(hex ?? '', 16)
      return isPrintable(codePoint) ? String.fromCodePoint(codePoint) : entity
    },
  )
}
