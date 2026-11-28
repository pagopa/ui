import { expect, test } from "vitest"

import { resolvePrimitives } from "./resolved-primitives.ts"

const PRIMITIVES = [
  ":root {",
  "  --figma-color-blue-500: #0b3ee3;",
  "  --figma-radius-8: 8px;",
  "  --radius-2: var(--figma-radius-8);",
  "}",
  "",
].join("\n")

function sheet(...declarations: string[]): string {
  return `${PRIMITIVES}.pagopa-ui-root {${declarations.join("")}}\n`
}

test("a semantic role ships the literal its primitive names", () => {
  const resolved = resolvePrimitives(sheet("--pui-primary: var(--figma-color-blue-500);"))
  expect(resolved).toContain("--pui-primary: #0b3ee3")
  expect(resolved).not.toContain("--figma-")
})

test("a primitive that aliases another resolves through the chain", () => {
  const resolved = resolvePrimitives(
    sheet("--pui-radius: var(--radius-2);", "--pui-primary: var(--figma-color-blue-500);"),
  )
  expect(resolved).toContain("--radius-2: 8px")
  expect(resolved).not.toContain("--figma-")
})

test("a fallback gives way to the resolved primitive", () => {
  const resolved = resolvePrimitives(sheet("--pui-primary: var(--figma-color-blue-500, #ff0000);"))
  expect(resolved).toContain("--pui-primary: #0b3ee3")
})

test("a reference with no declaration fails the build instead of shipping", () => {
  expect(() => resolvePrimitives(sheet("--pui-primary: var(--figma-color-unknown);"))).toThrow(
    /--figma-color-unknown is referenced but never declared/,
  )
})

test("a primitive that references itself fails rather than looping", () => {
  const circular = `:root {--figma-a: var(--figma-b);--figma-b: var(--figma-a);}
.pagopa-ui-root {--pui-primary: var(--figma-a);}
`
  expect(() => resolvePrimitives(circular)).toThrow(/circular primitive reference/)
})
