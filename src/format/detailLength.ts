export type DetailLengthRule = {
  maxWidth: number
  maxLines: number
}

// Line count is the content limit. A character cap cuts too early in a wide
// column and still overflows a narrow one.
export const DETAIL_LENGTH_RULES: DetailLengthRule[] = [
  { maxWidth: 640, maxLines: 2 },
  { maxWidth: 1100, maxLines: 3 },
  { maxWidth: Number.POSITIVE_INFINITY, maxLines: 4 },
]

export function detailLengthRule(viewportWidth: number): DetailLengthRule {
  return DETAIL_LENGTH_RULES.find((rule) => viewportWidth <= rule.maxWidth) ?? DETAIL_LENGTH_RULES[DETAIL_LENGTH_RULES.length - 1]
}
