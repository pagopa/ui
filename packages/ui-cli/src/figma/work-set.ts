// One definition of "what the delta touched" and "what the delta hands to the
// work queue".
//
// Four consumers used to spell these sets out on their own — the exit code and
// the PR body, the brief queue, the device coverage and the registry refresh —
// and they disagreed: a renamed node was drift for the exit code but not for
// the queue, and a mocked node was silently dropped everywhere without a trace.
// The two lists below are the only definitions; a consumer projects what it
// needs.
import type { Registry } from "../schemas/catalogue.ts"
import type { SnapshotDelta } from "./snapshot.ts"

export type DeltaWorkSet = {
  /** Every node a session can act on: the delta reopened it or it composes one. */
  touched: string[]
  /** The work queue: every pending entry plus the touched nodes, minus the mocked. */
  queue: string[]
  /** Touched nodes that keep their status by design, so nothing is owed for them. */
  withheld: string[]
}

// The delta keys that mean "the design changed": a rename or a move changes
// where the node lives, not the drawing, so neither reopens an implementation.
const CHANGED_KEYS = ["added", "changed", "affected"] as const

// Every key that makes the committed inventory stale. `baseline` and
// `changedVariants` carry no node of their own (`baseline` says the inventory
// predates the variant baseline, `changedVariants` names variants inside a set
// whose parent is already in `changed`) but both mean the file moved on.
const FILE_KEYS = [
  "added",
  "removed",
  "changed",
  "renamed",
  "moved",
  "baseline",
  "affected",
  "changedVariants",
] as const

/** The nodes the delta reopened, in the order the keys declare them. */
export function deltaTouchedNodes(delta: SnapshotDelta): string[] {
  return [
    ...new Set(
      [...delta.added, ...delta.changed, ...delta.renamed, ...delta.moved, ...delta.affected].map(
        (node) => node.nodeId,
      ),
    ),
  ]
}

/** The nodes whose design changed, which is what reopens an implementation. */
export function deltaChangedNodes(delta: SnapshotDelta): string[] {
  return [...new Set(CHANGED_KEYS.flatMap((key) => delta[key]).map((node) => node.nodeId))]
}

/** Whether the committed inventory is stale with respect to the live file. */
export function deltaHasChange(delta: SnapshotDelta): boolean {
  return FILE_KEYS.some((key) => delta[key].length > 0)
}

/**
 * The work the delta hands to a session. `delta` is null when the run read no
 * live source: the queue is then the pending registry entries alone.
 */
export function deltaWorkSet(
  delta: SnapshotDelta | null,
  entries: Registry["entries"],
): DeltaWorkSet {
  const touched = delta ? deltaTouchedNodes(delta) : []
  const queue = new Set(
    Object.entries(entries)
      .filter(([, entry]) => entry.status === "pending")
      .map(([nodeId]) => nodeId),
  )
  for (const nodeId of delta ? deltaChangedNodes(delta) : []) queue.add(nodeId)
  const withheld = touched.filter((nodeId) => entries[nodeId]?.status === "mocked")
  for (const nodeId of withheld) queue.delete(nodeId)
  return { touched, queue: [...queue], withheld }
}
