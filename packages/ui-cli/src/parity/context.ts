import fs from "node:fs"
import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { committedFile, readDevicePolicy, readInventory } from "../records/committed.ts"
import { buildCases } from "./case-rows.ts"

export function devicePolicy(workspace: Workspace) {
  return readDevicePolicy(workspace.root)
}
export function inventoryNodes(workspace: Workspace) {
  return readInventory(workspace.root).components
}
export function inventoryFileKey(workspace: Workspace) {
  return readInventory(workspace.root).fileKey
}
export function inventoryNode(workspace: Workspace, nodeId: string) {
  return inventoryNodes(workspace).find((node) => node.nodeId === nodeId)
}
// The one place a `--cases` override becomes a file: an identity resolves
// against the workspace (`packages/…` and `apps/…` under its root), and an
// absolute path is taken as given. Every reader and writer of the corpus takes
// this result, never the raw option, so a command reads the file it names.
export function corpusPath(workspace: Workspace, file?: string) {
  return file ? workspace.path(file) : committedFile("cases", workspace.root)
}
export function frameBaseline(workspace: Workspace): Record<string, string> {
  const file = workspace.path("src/catalog/figma/frame-baseline.json")
  const parsed: { stories?: Record<string, string> } = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : {}
  return parsed.stories ?? {}
}
export function statusesFrom(status?: string, fallback = "pending") {
  return (status ?? fallback)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}
export function registryCase(workspace: Workspace, nodeId: string) {
  const known = buildCases(workspace, { statuses: ["pending", "implemented", "mocked"] }).find(
    (item) => item.nodeId === nodeId,
  )
  if (!known) throw new UsageError(`${nodeId} has no registry target with a story`)
  return known
}
