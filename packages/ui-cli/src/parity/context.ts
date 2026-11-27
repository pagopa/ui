import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { readDevicePolicy, readInventory } from "../records/committed.ts"
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
// The registry target a node id names: the identity and the stories the
// diagnostic compares. A node the registry does not point at has nothing to
// open in Storybook, so it is a usage error rather than an empty report.
export function registryCase(workspace: Workspace, nodeId: string) {
  const known = buildCases(workspace, { statuses: ["pending", "implemented", "mocked"] }).find(
    (item) => item.nodeId === nodeId,
  )
  if (!known) throw new UsageError(`${nodeId} has no registry target with a story`)
  return known
}
