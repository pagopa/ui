import { readJson } from "../lib/json.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { fetchFigmaSnapshot, writeFigmaSnapshot } from "./rest.ts"
import { fileKeyFromSource, normalizeLive } from "./snapshot.ts"
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
    fileKeyFromSource(workspace),
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
