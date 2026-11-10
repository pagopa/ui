import fs from "node:fs"
import type { Workspace } from "../adapters/workspace.ts"
import { readJson } from "../lib/json.ts"
import type { InventoryNode } from "../schemas/catalogue.ts"
import type { DevicePolicy } from "../schemas/devices.ts"
import { loadDevicePolicy, requiredDevices } from "./devices.ts"
import { buildBrief, formatBrief, readBriefSources, type NodeBrief } from "./brief.ts"
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
  /** Pending nodes the read did not print, whether out of scope or past the cap. */
  omitted: number
  /** Nodes the line cap dropped from the listing, the pending ones aside. */
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

function devices(policy: DevicePolicy | null, node: InventoryNode): string[] {
  if (policy) return requiredDevices(policy, node)
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

/**
 * The cap bounds the whole rendered read, so the lines `formatBriefQueue` adds
 * around the items — the implementation-order header and the notices — are paid
 * before the first one. The truncation notice only exists once the cap drops a
 * node, so the listing is computed without it and, when it fires, once more with
 * its two lines: the second pass can only show fewer nodes, so it stays stable.
 */
function capItems(
  items: BriefQueueItem[],
  lineCap: number | null,
  fixedLines: number,
): BriefQueueItem[] {
  if (lineCap === null) return items
  const shown: BriefQueueItem[] = []
  let lines = fixedLines
  for (const item of items) {
    const cost = itemLines(item)
    if (lines + cost > lineCap) break
    lines += cost
    shown.push(item)
  }
  return shown
}

export function buildBriefQueue(workspace: Workspace, options: BriefQueueOptions = {}): BriefQueue {
  const kind = options.scope ?? "delta"
  const lineCap =
    options.lineCap !== undefined ? options.lineCap : kind === "all" ? null : DEFAULT_QUEUE_LINE_CAP
  // One read of everything a brief needs, and one of the device policy: a queue
  // of n nodes must not walk the workspace n times.
  const sources = readBriefSources(workspace)
  const policyFile = workspace.path("src/catalog/figma/device-policy.json")
  const policy = fs.existsSync(policyFile) ? loadDevicePolicy(policyFile) : null
  const { inventory, registry } = sources
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
  const items = inScope.map((id) => {
    const node = nodes.get(id)
    return {
      nodeId: id,
      class: node ? classes(delta, node).join(", ") || "pending" : "pending",
      devices: node ? devices(policy, node) : [],
      brief: buildBrief(workspace, id, sources),
    }
  })
  const inScopeIds = new Set(inScope)
  const omitted = [...pending].filter((id) => !inScopeIds.has(id)).length
  // The scope kind the read reports: `delta` only with a snapshot to scope to.
  const scopeKind: BriefQueueKind = kind === "all" ? "all" : scoped ? "delta" : "pending"
  const capped = capItems(items, lineCap, fixedQueueLines(scopeKind, omitted))
  // The truncation notice is a fixed line the cap must also pay for: recompute
  // the listing once when it fires, so the rendered read never exceeds the cap.
  const withNotice =
    lineCap !== null && capped.length < items.length
      ? capItems(items, lineCap, fixedQueueLines(scopeKind, omitted) + 2)
      : capped
  // The two counts describe disjoint sets, and each says only what is true: a
  // pending node the delta left out is *omitted*, a node the cap dropped is
  // *truncated* whether or not it is pending. Counting a cap-dropped pending
  // node as omitted would call a node in scope "outside this delta".
  const printed = new Set(withNotice.map((item) => item.nodeId))
  return {
    scope: {
      kind: scopeKind,
      omitted,
      truncated: inScope.filter((id) => !printed.has(id)).length,
      lineCap,
    },
    implementationOrder: inScope,
    items: withNotice,
  }
}

/** The lines `formatBriefQueue` renders before and after the items. */
function fixedQueueLines(kind: BriefQueueKind, omitted: number): number {
  return (
    1 + // the implementation-order header
    (kind === "pending" ? 2 : 0) + // the unscoped-fallback notice and its blank line
    (omitted > 0 ? 2 : 0) // the omitted notice and its blank line
  )
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
      "no delta snapshot (.figma/live-rest.json): this read is the unscoped pending queue, not the delta — run `pnpm ui-cli figma export` to scope it",
    )
  // State the omission; never sell the widening. The scoped read is the point,
  // so `--full` stays in `--help` instead of being advertised in the output.
  if (omitted > 0) lines.push("", `${omitted} more pending node(s) outside this delta, not read`)
  if (truncated > 0)
    lines.push(
      "",
      `truncated at ${lineCap} lines: ${truncated} more node(s) in scope not shown — raise --limit to read them`,
    )
  return lines
}
