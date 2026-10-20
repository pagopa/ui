// Shared provenance and licence policy for the generated Figma artwork families.
//
// The registry is the source of truth: each bulk rule carries a `provenance`
// block (provider, origin, licence, optional links) and may list per-node
// `provenanceOverrides` for the identities that diverge from the family default
// (brand marks, custom glyphs). An override is a complete block: it replaces
// the family default instead of inheriting its links, so a brand mark can never
// surface the Material Symbols licence. Both the icon and the pictogram
// generators resolve the policy through this module, so the manifests and the
// checks cannot drift from each other.

import { parseSchema } from "../lib/validate.ts"
import type { BulkRule } from "../schemas/catalogue.ts"
import {
  PROVENANCE_ORIGINS,
  ProvenanceOverridesSchema,
  ProvenanceSchema,
  type Provenance,
} from "../schemas/provenance.ts"

export { PROVENANCE_ORIGINS }

// Resolves the rule default against the per-node overrides. Returns a Map keyed
// by nodeId; unknown keys and unknown fields fail loudly so a policy typo can
// never silently drop provenance evidence.
export function resolveProvenance(
  rule: Pick<BulkRule, "page" | "provenance" | "provenanceOverrides">,
  nodeIds: Set<string>,
): Map<string, Provenance> {
  const label = rule.page ?? "artwork"
  if (!rule.provenance) {
    throw new Error(`${label}: artwork provenance is required on the bulk rule`)
  }
  const base = parseSchema(ProvenanceSchema, rule.provenance, `${label}: provenance`)
  const overrides = parseSchema(
    ProvenanceOverridesSchema,
    rule.provenanceOverrides ?? {},
    `${label}: provenance overrides`,
  )
  for (const id of Object.keys(overrides)) {
    if (!nodeIds.has(id)) {
      throw new Error(`${label}: provenance override ${id} is not a published identity`)
    }
  }
  const resolved = new Map<string, Provenance>()
  for (const id of nodeIds) {
    resolved.set(id, overrides[id] ?? base)
  }
  return resolved
}
