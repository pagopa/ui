import fs from "node:fs"
import path from "node:path"

import { compile } from "@tailwindcss/node"
import { Scanner } from "@tailwindcss/oxide"
import type { Plugin } from "vite"

/**
 * Tailwind emits one spelling of a utility: its `prefix()` option is a global
 * switch that renames the generated custom properties too. The library uses
 * the prefix as a variant (`@custom-variant pui`) applied to a mirror of
 * candidates, and the published stylesheet `@source`s only that mirror: every
 * utility is declared once, under the prefix, so a host Tailwind that spells
 * `flex` cannot reach the same class name.
 */
export const PREFIX = "pui:"

function bare(candidate: string) {
  return candidate.startsWith(PREFIX) ? candidate.slice(PREFIX.length) : candidate
}

export function prefixed(candidate: string) {
  return `${PREFIX}${bare(candidate)}`
}

export function renderCandidates(candidates: Iterable<string>) {
  const names = new Set<string>()
  for (const candidate of candidates) {
    if (!candidate) continue
    names.add(prefixed(candidate))
  }
  return [...names]
    .sort()
    .map((name) => `${name}\n`)
    .join("")
}

function asUrl(base: string, entry: string) {
  const url = path.relative(base, entry).split(path.sep).join("/")
  return url.startsWith(".") ? url : `./${url}`
}

export async function collectCandidates(entry: string, base: string) {
  const sheet = await compile(`@import "${asUrl(base, entry)}";`, {
    base,
    onDependency: () => undefined,
  })
  return new Scanner({ sources: sheet.sources }).scan()
}

export interface PrefixedCandidatesOptions {
  /** Absolute path of the CSS entry whose scan surface is mirrored. */
  entry: string
  /** Absolute path of the mirror file the css entry `@source`s. */
  mirror: string
  /** Directory `tailwindcss` resolves from: the project the entry belongs to. */
  base: string
}

export function prefixedCandidates({ entry, mirror, base }: PrefixedCandidatesOptions): Plugin {
  let stale = true

  async function write() {
    stale = false
    const content = renderCandidates(await collectCandidates(entry, base))
    if (fs.existsSync(mirror) && fs.readFileSync(mirror, "utf8") === content) return
    fs.mkdirSync(path.dirname(mirror), { recursive: true })
    fs.writeFileSync(mirror, content)
  }

  return {
    name: "pagopa-ui:prefixed-candidates",
    enforce: "pre",
    async buildStart() {
      await write()
    },
    watchChange(id) {
      if (path.resolve(id) !== mirror) stale = true
    },
    async transform(code, id) {
      if (!id.endsWith(".css") || path.resolve(id) === mirror) return
      if (!code.includes("@source")) return
      if (stale) await write()
    },
  }
}
