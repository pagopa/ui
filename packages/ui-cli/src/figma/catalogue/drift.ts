import type { SnapshotDelta } from "../snapshot.ts"
import type { InventoryNode } from "../../schemas/catalogue.ts"

type DeltaKey = "added" | "changed" | "renamed" | "moved" | "removed" | "affected" | "baseline"

function variantDeviceSuffix(
  node: InventoryNode,
  changedVariants: Map<string, { device?: string | null }>,
): string {
  const devices = new Set<string>()
  for (const variant of node.variants ?? []) {
    if (changedVariants.has(variant.nodeId))
      devices.add(changedVariants.get(variant.nodeId)?.device ?? "any")
  }
  return devices.size ? ` — devices ${[...devices].join(", ")}` : ""
}

export function formatCatalogueDrift(
  delta: SnapshotDelta,
  live: InventoryNode[] | null,
  writeRequested: boolean,
  prBodyPath: string | undefined,
  plan: boolean,
  hasDrift: boolean,
): { errors: string[]; lines: string[] } {
  const errors: string[] = []
  const lines: string[] = []
  if (!live) return { errors, lines }
  if (prBodyPath && !hasDrift && !plan) {
    lines.push("drift: none — inventory untouched, no pull request needed")
  }
  if (writeRequested || prBodyPath) return { errors, lines }
  const changedVariants = new Map(delta.changedVariants.map((change) => [change.nodeId, change]))
  const changes: Array<[DeltaKey, string]> = [
    ["added", "NEW"],
    ["removed", "REMOVED"],
    ["changed", "CHANGED"],
    ["renamed", "RENAMED"],
    ["moved", "MOVED"],
    ["baseline", "BASELINE REQUIRED"],
    ["affected", "AFFECTED"],
  ]
  for (const [key, label] of changes) {
    if (!delta[key].length) continue
    errors.push(
      `${label} nodes (${delta[key].length}):\n` +
        delta[key]
          .map(
            (node) =>
              `  ${node.nodeId}  ${node.name}${node.change ? ` — ${node.change}` : ""}${variantDeviceSuffix(node, changedVariants)}`,
          )
          .join("\n"),
    )
  }
  if (!Object.values(delta).some((nodes) => nodes.length) && !plan) {
    lines.push(`drift: none (${live.length} live nodes, contracts and design fingerprints match)`)
  }
  return { errors, lines }
}
