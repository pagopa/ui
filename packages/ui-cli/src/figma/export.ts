import { readJson } from "../lib/json.ts"
import { enterRoot } from "../lib/paths.ts"
import { fetchFigmaSnapshot, writeFigmaSnapshot } from "./rest.ts"
import { fileKeyFromSource, normalizeLive } from "./snapshot.ts"
import { requireFigmaToken } from "./token.ts"

export async function runExport(argv: string[] = process.argv.slice(2)): Promise<number> {
  enterRoot()
  if (argv.length && (argv.length !== 2 || argv[0] !== "--input")) {
    throw new Error("Usage: ui-cli figma export [--input <live MCP inventory>]")
  }
  requireFigmaToken()
  const mcpNodes = argv.length ? normalizeLive(readJson(argv[1] ?? "")) : []
  const snapshot = await fetchFigmaSnapshot(fileKeyFromSource(), mcpNodes)
  const nodes = normalizeLive(snapshot)
  const target = ".figma/live-rest.json"
  writeFigmaSnapshot(target, snapshot)
  console.log(
    `Read-only export: ${nodes.length} component roots, version ${snapshot.version}` +
      `${snapshot.lastModified ? ` (modified ${snapshot.lastModified})` : ""} -> ${target}`,
  )
  return 0
}
