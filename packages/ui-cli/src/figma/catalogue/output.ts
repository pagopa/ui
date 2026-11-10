import { implementationOrder, type SnapshotDelta } from "../snapshot.ts"
import { deltaWorkSet } from "../work-set.ts"
import { requestPointer } from "../config.ts"
import type { DeviceStats } from "../devices.ts"
import type {
  SurfacePending,
  SurfaceStats,
  SurfaceUncensused,
  SurfaceUnmirrored,
} from "../surface.ts"
import type { InventoryNode, Registry } from "../../schemas/catalogue.ts"

export function formatCoverageLine(stats: {
  sets: number
  covered: number
  missing: number
  exceptions: number
}): string {
  return `devices: ${stats.sets} implemented sets · covered ${stats.covered} · missing ${stats.missing} · exceptions ${stats.exceptions}`
}

export function formatCatalogueSummary(input: {
  committed: InventoryNode[]
  entries: Registry["entries"]
  bulkByNode: Map<string, { status?: string }>
  bulkByPage: Map<string, { status?: string }>
  evidenceExceptions: Record<string, string>
  apiExceptions: { exports?: Record<string, string> }
  deviceCoverage: { exceptions: number } | null
  deviceStats: DeviceStats | null
  formatDeviceLine: (stats: DeviceStats) => string
  formatCoverageLine: typeof formatCoverageLine
  coverage: { sets: number; covered: number; missing: number; exceptions: number } | null
  surfaceStats: SurfaceStats | null
  formatSurfaceLine: (stats: SurfaceStats) => string
  caseStats: { cases: number; errors: number; warnings: number; drafts: number } | null
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
    `exceptions: story evidence ${Object.keys(input.evidenceExceptions).length} · unmapped exports ${Object.keys(input.apiExceptions.exports ?? {}).length} · device ${input.deviceCoverage?.exceptions ?? 0}`,
  ]
  if (input.deviceStats) lines.push(input.formatDeviceLine(input.deviceStats))
  if (input.coverage) lines.push(input.formatCoverageLine(input.coverage))
  if (input.surfaceStats) lines.push(input.formatSurfaceLine(input.surfaceStats))
  if (input.caseStats)
    lines.push(
      `cases: ${input.caseStats.cases} case(s) · errors ${input.caseStats.errors} · warnings ${input.caseStats.warnings} · drafts ${input.caseStats.drafts}`,
    )
  return lines
}

export function renderCataloguePlan(input: {
  delta: SnapshotDelta
  live: InventoryNode[] | null
  committed: InventoryNode[]
  entries: Registry["entries"]
  liveVersion: string | undefined
  surfaceWaiting: SurfacePending[]
  surfaceUnmirrored: SurfaceUnmirrored[]
  surfaceUncensused: SurfaceUncensused[]
  deviceStats: DeviceStats | null
  deviceCoverage: unknown
}): string {
  const snapshot = input.live ?? input.committed
  const workSet = deltaWorkSet(input.delta, input.entries)
  const selected = new Set(workSet.queue)
  const designRequest = requestPointer()
  const pending = Object.entries(input.entries)
    .filter(([, entry]) => entry.status === "pending")
    .map(([nodeId, entry]) => ({
      nodeId,
      name: snapshot.find((node) => node.nodeId === nodeId)?.name ?? null,
      target: entry.target?.export ?? null,
      designRequests: [...new Set(entry.note?.match(designRequest) ?? [])],
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
      // A mocked node the delta reopened is not work, but calling the read
      // complete while the file changed would hide the decision it keeps.
      withheld: workSet.withheld,
      pending,
      surfaceWaiting: input.surfaceWaiting,
      surfaceUnmirrored: input.surfaceUnmirrored,
      surfaceUncensused: input.surfaceUncensused,
      unverifiedDesign: snapshot
        .filter((node) => !node.designFingerprint)
        .map((node) => node.nodeId),
      devices: input.deviceStats,
      deviceCoverage: input.deviceCoverage,
    },
    null,
    2,
  )
}
