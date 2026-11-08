import fs from "node:fs"

import { readJson } from "../lib/json.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { fetchFigmaSnapshot, writeFigmaSnapshot } from "./rest.ts"
import { normalizeLive } from "./snapshot.ts"
import { figmaToken, type KeychainRunner } from "../adapters/figma-token.ts"

export async function exportFigma(
  workspace: Workspace,
  env: NodeJS.ProcessEnv,
  input?: string,
  run?: KeychainRunner,
): Promise<string> {
  figmaToken(env, run)
  const mcpNodes = input ? normalizeLive(readJson(input), { workspace }) : []
  const snapshot = await fetchFigmaSnapshot(
    fileKeyFromWorkspace(workspace),
    mcpNodes,
    figmaToken(env, run),
  )
  const nodes = normalizeLive(snapshot, { workspace })
  const target = workspace.path(".figma/live-rest.json")
  writeFigmaSnapshot(target, snapshot)
  return (
    `Read-only export: ${nodes.length} component roots, version ${snapshot.version}` +
    `${snapshot.lastModified ? ` (modified ${snapshot.lastModified})` : ""} -> ${target}`
  )
}

function fileKeyFromWorkspace(workspace: Workspace): string {
  const file = fs.readFileSync(workspace.path("src/catalog/figma/file.ts"), "utf8")
  const match = file.match(/FIGMA_FILE_KEY\s*=\s*["']([^"']+)["']/)
  if (!match?.[1]) throw new Error("src/catalog/figma/file.ts must export a literal FIGMA_FILE_KEY")
  return match[1]
}
