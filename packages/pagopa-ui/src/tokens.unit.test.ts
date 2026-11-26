import { expect, test } from "vitest"

import dtcgJson from "../../tokens/src/tokens.dtcg.generated.json"

import { semanticTokens } from "./tokens"

const dtcg: {
  primitives: Record<string, { $type: string; $value: string }>
  pui: Record<string, { $type: string; $value: string }>
} = dtcgJson

test("every role is a rendered value, named for its role", () => {
  expect(new Set(semanticTokens.map((token) => token.cssName)).size).toBe(semanticTokens.length)
  for (const token of semanticTokens) {
    expect(token.cssName).toBe(`--pui-${token.name}`)
    expect(token.value.length).toBeGreaterThan(0)
    expect(token.value).not.toMatch(/^var\(/)
    expect(["color", "dimension", "shadow"]).toContain(token.type)
  }
})

test("the DTCG projection carries the same roles, typed and aliased", () => {
  expect(Object.keys(dtcg.pui)).toHaveLength(semanticTokens.length)
  for (const token of semanticTokens) {
    expect(dtcg.pui[token.name]).toEqual({ $type: token.type, $value: token.dtcg })
  }
})

test("a DTCG alias resolves to a primitive the projection carries", () => {
  const aliases = semanticTokens
    .map((token) => /^\{primitives\.([a-z0-9-]+)\}$/.exec(token.dtcg)?.[1])
    .filter((alias) => alias !== undefined)

  expect(aliases.length).toBeGreaterThan(0)
  for (const alias of aliases) expect(dtcg.primitives[alias]).toBeDefined()
})
