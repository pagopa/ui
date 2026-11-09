import fs from "node:fs"
import type { Workspace } from "../adapters/workspace.ts"
import { readJson } from "../lib/json.ts"
import { InventorySchema, RegistrySchema, type InventoryNode } from "../schemas/catalogue.ts"
import { loadDevicePolicy, requiredDevices } from "./devices.ts"
import { buildBrief, formatBrief, type NodeBrief } from "./brief.ts"
import {
  compareSnapshots,
  implementationOrder,
  normalizeLive,
  type SnapshotDelta,
} from "./snapshot.ts"

export type BriefQueue = {
  implementationOrder: string[]
  items: Array<{ nodeId: string; class: string; devices: string[]; brief: NodeBrief }>
}

function classes(delta: SnapshotDelta | null, node: InventoryNode): string[] {
  if (!delta) return []
  const names = ["added", "removed", "changed", "renamed", "moved", "baseline", "affected"] as const
  const found: string[] = names.filter((name) =>
    delta[name].some((entry) => entry.nodeId === node.nodeId),
  )
  if (
    delta.changedVariants.some((entry) =>
      node.variants?.some((variant) => variant.nodeId === entry.nodeId),
    )
  )
    found.push("changedVariants")
  return found
}

function devices(workspace: Workspace, node: InventoryNode): string[] {
  const file = workspace.path("src/catalog/figma/device-policy.json")
  if (fs.existsSync(file)) return requiredDevices(loadDevicePolicy(file), node)
  return [
    ...new Set(
      (node.variants ?? []).flatMap((variant) => (variant.device ? [variant.device] : [])),
    ),
  ]
}

export function buildBriefQueue(workspace: Workspace): BriefQueue {
  const inventory = readJson(workspace.path("src/catalog/figma/inventory.json"), InventorySchema)
  const registry = readJson(workspace.path("src/catalog/figma/registry.json"), RegistrySchema)
  const pending = new Set(
    Object.entries(registry.entries)
      .filter(([, entry]) => entry.status === "pending")
      .map(([nodeId]) => nodeId),
  )
  const snapshot = workspace.path(".figma/live-rest.json")
  const live = fs.existsSync(snapshot)
    ? normalizeLive(readJson(snapshot), { workspace })
    : inventory.components
  const delta = fs.existsSync(snapshot) ? compareSnapshots(inventory.components, live) : null
  const nodes = new Map(live.map((node) => [node.nodeId, node]))
  for (const node of inventory.components) if (!nodes.has(node.nodeId)) nodes.set(node.nodeId, node)
  const order = implementationOrder([...nodes.values()], pending)
  const ordered = new Set(order)
  order.push(...[...pending].filter((id) => !ordered.has(id)).sort())
  return {
    implementationOrder: order,
    items: order.flatMap((id) => {
      const node = nodes.get(id)
      return [
        {
          nodeId: id,
          class: node ? classes(delta, node).join(", ") || "pending" : "pending",
          devices: node ? devices(workspace, node) : [],
          brief: buildBrief(workspace, id),
        },
      ]
    }),
  }
}

export function formatBriefQueue(queue: BriefQueue): string[] {
  const lines = [`implementationOrder ${queue.implementationOrder.join(", ")}`]
  for (const item of queue.items) {
    lines.push(`\n${item.nodeId} · ${item.class} · devices ${item.devices.join(", ") || "none"}`)
    lines.push(...formatBrief(item.brief))
  }
  return lines
}
