import fs from "node:fs"
import type { Workspace } from "../adapters/workspace.ts"
import { loadDevicePolicy, loadInventory } from "../figma/devices.ts"
import { UsageError } from "../lib/command.ts"
import { buildCases } from "./cases.ts"

export function devicePolicy(workspace: Workspace) {
  return loadDevicePolicy(workspace.path("src/catalog/figma/device-policy.json"))
}
export function inventoryNodes(workspace: Workspace) {
  return loadInventory(workspace.path("src/catalog/figma/inventory.json")).components
}
export function inventoryFileKey(workspace: Workspace) {
  return loadInventory(workspace.path("src/catalog/figma/inventory.json")).fileKey ?? ""
}
export function inventoryNode(workspace: Workspace, nodeId: string) {
  return inventoryNodes(workspace).find((node) => node.nodeId === nodeId)
}
export function corpusPath(workspace: Workspace, file?: string) {
  return workspace.path(file ?? "src/catalog/figma/parity-cases.json")
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
