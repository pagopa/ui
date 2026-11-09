import fs from "node:fs"
import type { Workspace } from "../adapters/workspace.ts"
import { readJson } from "../lib/json.ts"
import { InventorySchema, RegistrySchema, type InventoryNode } from "../schemas/catalogue.ts"
import { loadDevicePolicy, requiredDevices } from "./devices.ts"
import { buildBrief, formatBrief, type NodeBrief } from "./brief.ts"
import {
  compareSnapshots,
  deltaChangeNodes,
  implementationOrder,
  normalizeLive,
  type SnapshotDelta,
} from "./snapshot.ts"

/** The default read is the delta in hand; the whole pending queue is opt-in. */
export const DEFAULT_QUEUE_LINE_CAP = 60

export type BriefQueueKind = "delta" | "pending" | "all"

export type BriefQueueScope = {
  kind: BriefQueueKind
  /** Pending nodes the read left out because they are outside the delta. */
  omitted: number
  /** Nodes the line cap dropped from the listing. */
  truncated: number
  /** The cap that produced `truncated`, `null` when the read is uncapped. */
  lineCap: number | null
}

export type BriefQueueItem = {
  nodeId: string
  class: string
  devices: string[]
  brief: NodeBrief
}

export type BriefQueue = {
  scope: BriefQueueScope
  implementationOrder: string[]
  items: BriefQueueItem[]
}

export type BriefQueueOptions = {
  scope?: BriefQueueKind
  lineCap?: number | null
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

/** Visual lines an item costs: its header, its blank separator and its brief. */
function itemLines(item: BriefQueueItem): number {
  return formatBrief(item.brief).length + 2
}

function capItems(
  items: BriefQueueItem[],
  lineCap: number | null,
): { items: BriefQueueItem[]; truncated: number } {
  if (lineCap === null) return { items, truncated: 0 }
  const shown: BriefQueueItem[] = []
  let lines = 0
  for (const item of items) {
    const cost = itemLines(item)
    if (lines + cost > lineCap) break
    lines += cost
    shown.push(item)
  }
  return { items: shown, truncated: items.length - shown.length }
}

export function buildBriefQueue(workspace: Workspace, options: BriefQueueOptions = {}): BriefQueue {
  const kind = options.scope ?? "delta"
  const lineCap =
    options.lineCap !== undefined ? options.lineCap : kind === "all" ? null : DEFAULT_QUEUE_LINE_CAP
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
  const all = [...nodes.values()]
  const scoped = kind === "delta" && delta !== null
  const selected = new Set(scoped ? deltaChangeNodes(delta) : pending)
  const inScope = implementationOrder(all, selected)
  const seen = new Set(inScope)
  inScope.push(...[...selected].filter((id) => !seen.has(id)).sort())
  const pendingOrder = implementationOrder(all, pending)
  const items = inScope.map((id) => {
    const node = nodes.get(id)
    return {
      nodeId: id,
      class: node ? classes(delta, node).join(", ") || "pending" : "pending",
      devices: node ? devices(workspace, node) : [],
      brief: buildBrief(workspace, id),
    }
  })
  const capped = capItems(items, lineCap)
  return {
    scope: {
      kind: kind === "all" ? "all" : scoped ? "delta" : "pending",
      omitted: pendingOrder.length - inScope.filter((id) => pending.has(id)).length,
      truncated: capped.truncated,
      lineCap,
    },
    implementationOrder: inScope,
    items: capped.items,
  }
}

export function formatBriefQueue(queue: BriefQueue): string[] {
  const lines = [`implementationOrder ${queue.implementationOrder.join(", ")}`]
  for (const item of queue.items) {
    lines.push(`\n${item.nodeId} · ${item.class} · devices ${item.devices.join(", ") || "none"}`)
    lines.push(...formatBrief(item.brief))
  }
  const { kind, omitted, truncated, lineCap } = queue.scope
  if (kind === "pending")
    lines.push(
      "",
      "no delta snapshot (.figma/live-rest.json): the whole pending queue is shown, unscoped",
    )
  if (omitted > 0)
    lines.push("", `${omitted} more pending node(s) not shown — pass --full for the whole queue`)
  if (truncated > 0)
    lines.push(
      "",
      `truncated at ${lineCap} lines: ${truncated} more node(s) in scope not shown — pass --limit <lines> or --full`,
    )
  return lines
}
