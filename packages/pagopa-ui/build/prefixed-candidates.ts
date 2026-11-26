import fs from "node:fs"
import path from "node:path"

import { compile } from "@tailwindcss/node"
import { Scanner } from "@tailwindcss/oxide"
import type { Plugin } from "vite"

/**
 * Tailwind emits one spelling of a utility: its `prefix()` option is a global
 * switch that renames the generated custom properties too. The migration needs
 * both spellings at once, so the prefix is a variant (`@custom-variant pui`)
 * applied to a mirror of candidates that is `@source`d next to the real ones.
 */
export const PREFIX = "pui:"

function bare(candidate: string) {
  return candidate.startsWith(PREFIX) ? candidate.slice(PREFIX.length) : candidate
}

export function spellings(candidate: string): [string, string] {
  const name = bare(candidate)
  return [name, `${PREFIX}${name}`]
}

export function renderCandidates(candidates: Iterable<string>) {
  const names = new Set<string>()
  for (const candidate of candidates) {
    if (!candidate) continue
    for (const name of spellings(candidate)) names.add(name)
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
  /** Absolute path of the mirror file the entry `@source`s. */
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
    async transform(_code, id) {
      if (!id.endsWith(".css") || id.startsWith(mirror)) return
      if (stale) await write()
    },
  }
}
