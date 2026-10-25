#!/usr/bin/env node
// The public token contract: the `--figma-*` custom properties the stylesheet
// ships are public, and a rename or a removal is a breaking change. The
// committed list is the reviewed diff every release carries.
//
//   node src/cli.ts check public-tokens           # compare the list
//   node src/cli.ts check public-tokens --write   # record the list you accept
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { enterRoot, resolveRoot, tokensPath } from "../lib/paths.ts"

const CONTRACT_PATH = "etc/tokens.txt"
const TOKENS_CSS = "src/tokens.generated.css"
const INVENTORY = "src/figma-tokens.generated.ts"

const CSS_NAME = /^ {2}(--figma-[a-z0-9-]+):/gm

type Inventory = { figmaTokens: Array<{ cssName: string }> }

export function cssTokenNames(source: string): string[] {
  return [...source.matchAll(CSS_NAME)].map((match) => match[1] ?? "").filter(Boolean)
}

// The CSS names the stylesheet declares, plus the typed list the package
// exports. The `js:` prefix keeps the two projections apart: a token that is
// only in the CSS is not in the typed list, and vice versa.
export async function publicTokenNames(
  tokensRoot: string = tokensPath(),
): Promise<{ css: string[]; js: string[] }> {
  const cssFile = path.join(tokensRoot, TOKENS_CSS)
  const inventoryFile = path.join(tokensRoot, INVENTORY)
  for (const file of [cssFile, inventoryFile]) {
    if (!fs.existsSync(file)) {
      throw new Error(`missing ${file} — run "pnpm nx run pagopa-ui-tokens:tokens:check"`)
    }
  }
  const css = cssTokenNames(fs.readFileSync(cssFile, "utf8"))
  const inventory: Inventory = await import(pathToFileURL(inventoryFile).href)
  return { css, js: inventory.figmaTokens.map((token) => `js:${token.cssName}`) }
}

function contractNames(file: string): string[] {
  if (!fs.existsSync(file)) return []
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

export async function runPublicTokens(argv: string[] = []): Promise<number> {
  enterRoot()
  const { css, js } = await publicTokenNames(tokensPath())
  const expected = [...new Set([...css, ...js])].sort()
  const file = path.join(resolveRoot(), CONTRACT_PATH)
  const current = contractNames(file)
  const added = expected.filter((name) => !current.includes(name))
  const removed = current.filter((name) => !expected.includes(name))
  if (!added.length && !removed.length) {
    console.log(
      `public tokens OK: ${css.length} CSS names, ${js.length} typed names, ${current.length} in ${CONTRACT_PATH}`,
    )
    return 0
  }
  if (argv.includes("--write")) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, `${expected.join("\n")}\n`)
    console.log(`public tokens written: ${expected.length} names -> ${CONTRACT_PATH}`)
    return 0
  }
  console.error(`public tokens: ${added.length} added, ${removed.length} removed`)
  for (const name of added) console.error(`  + ${name}`)
  for (const name of removed) console.error(`  - ${name}`)
  console.error(
    "a removed or renamed token is a breaking change: add a CHANGELOG line and a `minor` version plan, then run with `--write`",
  )
  return 1
}
