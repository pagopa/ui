import fs from "node:fs"
import path from "node:path"

import { compile } from "@tailwindcss/node"
import { expect, test } from "vitest"

import { collectCandidates, prefixed, renderCandidates } from "./prefixed-candidates.ts"

const packageRoot = path.resolve(import.meta.dirname, "..")
const scanEntry = path.join(packageRoot, "src/scan.css")
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

const prefix = "pui\\:"

function asUrl(base: string, file: string) {
  const url = path.relative(base, file).split(path.sep).join("/")
  return url.startsWith(".") ? url : `./${url}`
}

async function buildSheet(css: string, candidates: string[]) {
  const sheet = await compile(css, { base: packageRoot, onDependency() {} })
  return sheet.build(candidates)
}

test("the mirror lists every candidate once, under the prefix", () => {
  const mirror = renderCandidates(["pui:flex", "flex", "", "hover:flex", "flex"])
  expect(mirror).toBe("pui:flex\npui:hover:flex\n")
  expect(prefixed("pui:hover:flex")).toBe("pui:hover:flex")
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

test("the published stylesheet declares each utility once, under the prefix", async () => {
  // The mirror is what the build writes, so the scan runs without it: the
  // candidates are the ones the real surface holds.
  fs.rmSync(mirror, { force: true })
  const candidates = await collectCandidates(scanEntry, packageRoot)
  expect(candidates.length).toBeGreaterThan(1000)

  fs.mkdirSync(path.dirname(mirror), { recursive: true })
  fs.writeFileSync(mirror, renderCandidates(candidates))

  // What the build compiles: the narrowed entry scans the mirror and nothing
  // else, so the source trees cannot put a bare utility back in the artifact.
  // Custom-property names and separators reach the scanner from the sources
  // that share a prefix with an excluded one; none of them emits a rule.
  const mirrored = await collectCandidates(libraryEntry, packageRoot)
  for (const utility of ["flex", "p-6", "bg-accent"]) {
    expect(candidates).toContain(`pui:${utility}`)
    expect(mirrored).not.toContain(utility)
  }

  const compiled = await buildSheet(`@import "${asUrl(packageRoot, libraryEntry)}";`, mirrored)
  const tokens = classTokens(compiled)
  const prefixedTokens = [...tokens].filter((token) => token.startsWith(prefix))
  expect(prefixedTokens.length).toBeGreaterThan(1000)

  // A utility the mirror holds under the prefix never keeps a bare twin.
  const bareTwins = [...tokens].filter(
    (token) => !token.startsWith(prefix) && tokens.has(`${prefix}${token}`),
  )
  expect(bareTwins).toEqual([])
  expect(tokens).not.toContain("flex")
  expect(tokens).toContain(`pui${prefix.slice(3)}flex`)
})
