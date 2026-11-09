// The public token contract: the `--figma-*` custom properties the stylesheet
// ships are public, and a rename or a removal is a breaking change. The
// committed list is the reviewed diff every release carries.
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

import type { Workspace } from "../adapters/workspace.ts"
import { writeText } from "../lib/json.ts"
import { report, type CheckReport } from "./report.ts"

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
  tokensRoot: string,
): Promise<{ css: string[]; js: string[] }> {
  const cssFile = path.join(tokensRoot, TOKENS_CSS)
  const inventoryFile = path.join(tokensRoot, INVENTORY)
  for (const file of [cssFile, inventoryFile]) {
    if (!fs.existsSync(file)) {
      throw new Error(`missing ${file} — run "pnpm nx run pagopa-ui-tokens:check:tokens"`)
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

async function compare(workspace: Workspace) {
  const { css, js } = await publicTokenNames(workspace.tokensRoot)
  const expected = [...new Set([...css, ...js])].sort()
  const current = contractNames(workspace.path(CONTRACT_PATH))
  return {
    css,
    js,
    expected,
    current,
    added: expected.filter((name) => !current.includes(name)),
    removed: current.filter((name) => !expected.includes(name)),
  }
}

export async function checkPublicTokens(workspace: Workspace): Promise<CheckReport> {
  const { css, js, current, added, removed } = await compare(workspace)
  const changed = added.length + removed.length > 0
  return report(
    "public tokens",
    changed
      ? `${added.length} added, ${removed.length} removed — a removed or renamed token is a breaking change: add a CHANGELOG line and a \`minor\` version plan, then run \`ui-cli update public-tokens\``
      : `${css.length} CSS names, ${js.length} typed names, ${current.length} in ${CONTRACT_PATH}`,
    [...added.map((name) => `+ ${name}`), ...removed.map((name) => `- ${name}`)],
  )
}

export async function updatePublicTokens(workspace: Workspace): Promise<string> {
  const { expected } = await compare(workspace)
  writeText(workspace.path(CONTRACT_PATH), `${expected.join("\n")}\n`)
  return `public tokens written: ${expected.length} names -> ${CONTRACT_PATH}`
}
