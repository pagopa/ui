import type { CaseReport, Scope } from "./types.ts"
// The responsive findings of one report, split by kind: what the responsive
// verdict added on top of the geometry (RA5). The gating kinds are the deltas;
// a recorded residue keeps the reason visible without gating.
export function responsiveCounts(report: CaseReport) {
  const counts: Record<string, number> = {
    clipped: 0,
    escaped: 0,
    truncated: 0,
    scrollable: 0,
    band: 0,
    scope: 0,
    residues: 0,
  }
  for (const delta of report.deltas ?? []) {
    if (!delta.path.startsWith("responsive.")) continue
    const kind = delta.path.split(".")[1]
    if (typeof counts[kind] === "number") counts[kind] += 1
  }
  for (const residue of report.residues ?? []) {
    if (residue.path.startsWith("responsive.")) counts.residues += 1
  }
  return counts
}

export function responsiveSummary(counts: ReturnType<typeof responsiveCounts>): string {
  const findings = counts.clipped + counts.escaped + counts.truncated + counts.band + counts.scope
  if (!findings) return counts.residues ? `${counts.residues} residue(s)` : "clean"
  return (
    `${findings} finding(s): ` +
    [
      counts.clipped ? `clipped ${counts.clipped}` : undefined,
      counts.escaped ? `escaped ${counts.escaped}` : undefined,
      counts.truncated ? `truncated ${counts.truncated}` : undefined,
      counts.band ? `band ${counts.band}` : undefined,
      counts.scope ? `scope ${counts.scope}` : undefined,
      counts.scrollable ? `scrollable ${counts.scrollable}` : undefined,
    ]
      .filter(Boolean)
      .join(" · ")
  )
}

export function scopeSummary(scope: Scope | undefined): string {
  if (!scope) return "none"
  const axis = scope.declared === "viewport" ? "viewport" : "rootWidth"
  return `${scope.declared}: ${scope.changed?.[axis] ? "verified" : "NOT confirmed"}`
}
