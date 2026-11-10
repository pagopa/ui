// One definition of "what the delta touched" and "what the delta hands to the
// work queue".
//
// Five consumers spelled these sets out on their own — the exit code, the PR
// body, the brief queue, the device coverage and the registry refresh — each with
// its own key list, so a renamed node reached some of them and not others. The
// helpers below are the only key lists; a consumer projects what it needs.
import type { Registry } from "../schemas/catalogue.ts"
import type { SnapshotDelta } from "./snapshot.ts"

// The delta keys that mean "the design changed": a rename or a move changes
// where the node lives, not the drawing. These keys decide `deltaChangedNodes`,
// which is what reopens an implementation and what a registry renewal grades.
// `deltaTouchedNodes` below adds the renamed and moved nodes on top: the session
// still carries their device target, but they cost no new review.
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
 * The work the delta hands to a session: every pending registry entry plus the
 * nodes whose design changed, minus the mocked ones, whose status is a decision
 * that says no review is owed. `delta` is null when the run read no live source:
 * the queue is then the pending registry entries alone.
 */
export function deltaWorkSet(delta: SnapshotDelta | null, entries: Registry["entries"]): string[] {
  const queue = new Set(
    Object.entries(entries)
      .filter(([, entry]) => entry.status === "pending")
      .map(([nodeId]) => nodeId),
  )
  for (const nodeId of delta ? deltaChangedNodes(delta) : []) queue.add(nodeId)
  for (const nodeId of queue) if (entries[nodeId]?.status === "mocked") queue.delete(nodeId)
  return [...queue]
}
