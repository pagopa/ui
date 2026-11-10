// The one place where a registry status becomes a census decision.
//
// The census (`page-surface.json`) states, per published identity, what the
// library gives it; the registry states the same thing as a status. The two are
// one value spelled twice, and three call sites used to translate between them
// on their own: the census gate that compares them, the `registry set` writer
// that has to keep them in step, and the drift refresh that has to know which
// entries keep their status. They disagreed on the edges — `unpublished` has no
// registry status at all, and a `mocked` node has to keep its note.
import type { Status } from "../schemas/common.ts"
import type { SurfaceDecision } from "../schemas/catalogue.ts"

export type { SurfaceDecision }

/** The decisions that carry a written reason in the census. */
const REASONED = new Set<SurfaceDecision>(["mocked", "excluded", "pending"])

/**
 * The decision a registry status implies. `inLibrary` decides first: an
 * identity the published export does not carry is `unpublished` whatever the
 * registry says, because it has no mapping to agree with.
 */
export function surfaceDecision(inLibrary: boolean, status: Status | undefined): SurfaceDecision {
  if (!inLibrary) return "unpublished"
  if (status === "implemented") return "shipped"
  if (status === "mocked" || status === "excluded" || status === "pending") return status
  // No entry and no bulk rule: an unpublished mapping is what is owed, not a
  // fifth state.
  return "pending"
}

/** The registry status a decision requires, or null for `unpublished`. */
export function registryStatusFor(decision: SurfaceDecision): Status | null {
  return decision === "shipped" ? "implemented" : decision === "unpublished" ? null : decision
}

/** Whether the census owes a reason for the decision. */
export function requiresReason(decision: SurfaceDecision): boolean {
  return REASONED.has(decision)
}

/**
 * Which registry statuses keep their entry when the delta reopens it: a mocked
 * or excluded node is not work, and neither is a node whose bulk rule already
 * decided it.
 */
export function keepsStatusOnDrift(status: Status | string | undefined, rule?: Status | string) {
  return status === "mocked" || status === "excluded" || (!status && rule === "excluded")
}
