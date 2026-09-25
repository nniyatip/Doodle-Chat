const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

const ENTITY = /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi
const MAX_CODE_POINT = 0x10ffff

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
      if (name !== undefined) return NAMED_ENTITIES[name.toLowerCase()] ?? entity
      const codePoint =
        decimal !== undefined ? Number(decimal) : Number.parseInt(hex ?? '', 16)
      return codePoint > 0 && codePoint <= MAX_CODE_POINT
        ? String.fromCodePoint(codePoint)
        : entity
    },
  )
}
