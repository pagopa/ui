// The ceilings of the Figma flow's context budget. They are code and never
// baseline state, so the committed baseline can only lower the measurement; a
// test pins each number here, which makes raising one an edit a reviewer sees.
export const CONTEXT_BUDGET_LIMITS = {
  entry: 1536,
  file: 4096,
  route: 8192,
  card: 1536,
  preamble: 1024,
} as const

export type ContextKind = keyof typeof CONTEXT_BUDGET_LIMITS

export const CONTEXT_KINDS: readonly ContextKind[] = ["entry", "file", "route", "card", "preamble"]
