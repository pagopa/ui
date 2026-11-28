import { implementationOrder, type SnapshotDelta } from "../snapshot.ts"
import { deltaWorkSet } from "../work-set.ts"
import { issuePointers } from "../config.ts"
import type { DeviceStats } from "../devices.ts"
import type { SurfacePending, SurfaceStats, SurfaceUncensused } from "../surface.ts"
import type { InventoryNode, Registry } from "../../schemas/catalogue.ts"

export function formatCatalogueSummary(input: {
  committed: InventoryNode[]
  entries: Registry["entries"]
  bulkByNode: Map<string, { status?: string }>
  bulkByPage: Map<string, { status?: string }>
  evidenceExceptions: Record<string, string>
  apiExceptions: { exports?: Record<string, string> }
  deviceStats: DeviceStats | null
  formatDeviceLine: (stats: DeviceStats) => string
  surfaceStats: SurfaceStats | null
  formatSurfaceLine: (stats: SurfaceStats) => string
}): string[] {
  const statuses: Record<string, number> = {}
  for (const node of input.committed) {
    const entry = input.entries[node.nodeId]
    const rule = input.bulkByNode.get(node.nodeId) ?? input.bulkByPage.get(node.pageId)
    const status = entry?.status ?? rule?.status ?? "unaccounted"
    statuses[status] = (statuses[status] ?? 0) + 1
  }
  const lines = [
    `inventory: ${input.committed.length} nodes | ${Object.entries(statuses)
      .map(([status, count]) => `${status} ${count}`)
      .join(" · ")}`,
    `exceptions: story evidence ${Object.keys(input.evidenceExceptions).length} · unmapped exports ${Object.keys(input.apiExceptions.exports ?? {}).length}`,
  ]
  if (input.deviceStats) lines.push(input.formatDeviceLine(input.deviceStats))
  if (input.surfaceStats) lines.push(input.formatSurfaceLine(input.surfaceStats))
  return lines
}

export function renderCataloguePlan(input: {
  delta: SnapshotDelta
  live: InventoryNode[] | null
  committed: InventoryNode[]
  entries: Registry["entries"]
  liveVersion: string | undefined
  surfaceWaiting: SurfacePending[]
  surfaceUncensused: SurfaceUncensused[]
  deviceStats: DeviceStats | null
}): string {
  const snapshot = input.live ?? input.committed
  const selected = new Set(deltaWorkSet(input.delta, input.entries))
  const pending = Object.entries(input.entries)
    .filter(([, entry]) => entry.status === "pending")
    .map(([nodeId, entry]) => ({
      nodeId,
      name: snapshot.find((node) => node.nodeId === nodeId)?.name ?? null,
      target: entry.target?.export ?? null,
      designRequests: issuePointers(entry.note),
    }))
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId, undefined, { numeric: true }))
  const delta = Object.fromEntries(
    Object.entries(input.delta).map(([key, nodes]) => [
      key,
      key === "changedVariants" ? nodes : nodes.map((node) => node.nodeId),
    ]),
  )
  return JSON.stringify(
    {
      ...delta,
      snapshotVersion: input.liveVersion ?? null,
      implementationOrder: implementationOrder(snapshot, selected),
      pending,
      surfaceWaiting: input.surfaceWaiting,
      surfaceUncensused: input.surfaceUncensused,
      unverifiedDesign: snapshot
        .filter((node) => !node.designFingerprint)
        .map((node) => node.nodeId),
      devices: input.deviceStats,
    },
    null,
    2,
  )
}
