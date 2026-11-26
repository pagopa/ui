import fs from "node:fs"
import path from "node:path"

import { compile } from "@tailwindcss/node"
import { expect, test } from "vitest"

import { collectCandidates, renderCandidates, spellings } from "./prefixed-candidates.ts"

const packageRoot = path.resolve(import.meta.dirname, "..")
const libraryEntry = path.join(packageRoot, "src/library.css")
const mirror = path.join(packageRoot, ".generated/prefixed-candidates.txt")

function declarations(css: string, selector: string) {
  const at = css.indexOf(selector)
  const open = css.indexOf("{", at)
  const close = css.indexOf("}", open)
  return css.slice(open + 1, close).trim()
}

function className(selector: string) {
  let name = ""
  for (let index = 1; index < selector.length; index++) {
    const character = selector[index]
    if (character === "\\") {
      name += character + selector[index + 1]
      index++
      continue
    }
    if (" :.>#+~[*".includes(character)) break
    name += character
  }
  return name
}

function classTokens(css: string) {
  const tokens = new Set<string>()
  for (const match of css.matchAll(/([^{}]*)\{/g)) {
    const prelude = match[1].trim()
    if (prelude.startsWith(".")) tokens.add(className(prelude))
  }
  return tokens
}

async function buildSheet(css: string, candidates: string[]) {
  const sheet = await compile(css, { base: packageRoot, onDependency() {} })
  return sheet.build(candidates)
}

test("a candidate gets a bare and a prefixed spelling", () => {
  expect(spellings("flex")).toEqual(["flex", "pui:flex"])
  expect(spellings("pui:flex")).toEqual(["flex", "pui:flex"])
  expect(spellings("pui:hover:flex")).toEqual(["hover:flex", "pui:hover:flex"])
})

test("the mirror lists every spelling once, sorted, with a trailing newline", () => {
  const mirror = renderCandidates(["pui:flex", "flex", "", "hover:flex", "flex"])
  expect(mirror).toBe("flex\nhover:flex\npui:flex\npui:hover:flex\n")
})

test("a prefixed candidate compiles to what Tailwind's own prefix emits", async () => {
  const candidates = ["pui:flex", "pui:hover:flex", "pui:uppercase"]
  const native = await buildSheet('@import "tailwindcss" prefix(pui);', candidates)
  const variant = await buildSheet('@import "tailwindcss";\n@custom-variant pui (&);', candidates)

  for (const selector of [".pui\\:flex", ".pui\\:hover\\:flex:hover", ".pui\\:uppercase"]) {
    expect(native).toContain(selector)
    expect(declarations(variant, selector)).toBe(declarations(native, selector))
  }
})

test("the prefix leaves a group marker on its own spelling", async () => {
  const candidate = "pui:group-hover/nav:opacity-100"
  const native = await buildSheet('@import "tailwindcss" prefix(pui);', [candidate])
  const variant = await buildSheet('@import "tailwindcss";\n@custom-variant pui (&);', [candidate])

  expect(variant).toContain(
    ".pui\\:group-hover\\/nav\\:opacity-100:is(:where(.group\\/nav):hover *)",
  )
  expect(native).toContain(
    ".pui\\:group-hover\\/nav\\:opacity-100:is(:where(.pui\\:group\\/nav):hover *)",
  )
})

test("the published stylesheet doubles without losing a class", async () => {
  // The mirror is what the build writes, so the scan runs without it: the
  // candidates are the ones the real surface holds.
  fs.rmSync(mirror, { force: true })
  const candidates = await collectCandidates(libraryEntry, packageRoot)

  const single = classTokens(await buildSheet(`@import "${libraryEntry}";`, candidates))
  const prefixed = classTokens(
    await buildSheet(
      `@import "${libraryEntry}";`,
      candidates.map((candidate) => spellings(candidate)[1]),
    ),
  )

  // What the plugin produces: the mirror is written, then the surface is
  // scanned again and the sheet built from what it found.
  fs.mkdirSync(path.dirname(mirror), { recursive: true })
  fs.writeFileSync(mirror, renderCandidates(candidates))
  const mirrored = await collectCandidates(libraryEntry, packageRoot)
  const doubled = classTokens(await buildSheet(`@import "${libraryEntry}";`, mirrored))

  expect(prefixed.size).toBeGreaterThan(single.size * 0.95)
  for (const token of new Set([...single, ...prefixed])) {
    expect(doubled, `${token} lost`).toContain(token)
  }
})
