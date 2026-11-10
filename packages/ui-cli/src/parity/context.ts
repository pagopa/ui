import fs from "node:fs"
import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { committedFile, readDevicePolicy, readInventory } from "../records/committed.ts"
import { buildCases } from "./cases.ts"

export function devicePolicy(workspace: Workspace) {
  return readDevicePolicy(committedFile("device-policy", workspace.root))
}
export function inventoryNodes(workspace: Workspace) {
  return readInventory(committedFile("inventory", workspace.root)).components
}
export function inventoryFileKey(workspace: Workspace) {
  return readInventory(committedFile("inventory", workspace.root)).fileKey
}
export function inventoryNode(workspace: Workspace, nodeId: string) {
  return inventoryNodes(workspace).find((node) => node.nodeId === nodeId)
}
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
