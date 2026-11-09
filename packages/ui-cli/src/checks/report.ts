// The result every read-only gate returns. A gate never prints: the command
// layer formats the report, and a problem is the only thing that fails it.
export interface CheckReport {
  /** The contract's name as printed: "import layers", "css budget". */
  readonly name: string
  /** Violations: any one fails the gate (exit 1). */
  readonly problems: readonly string[]
  /** Printed on stderr, never failing. */
  readonly warnings?: readonly string[]
  /** Informational lines printed before the summary. */
  readonly details?: readonly string[]
  /** What was checked, printed with the verdict. */
  readonly summary: string
}

export function report(
  name: string,
  summary: string,
  problems: readonly string[] = [],
  extra: Pick<CheckReport, "warnings" | "details"> = {},
): CheckReport {
  return { name, summary, problems: [...new Set(problems)], ...extra }
}

export const passed = (result: CheckReport): boolean => result.problems.length === 0

export function formatCheck(result: CheckReport): { out: string[]; err: string[] } {
  const out = [...(result.details ?? [])]
  const err = (result.warnings ?? []).map((warning) => `${result.name}: warning: ${warning}`)
  if (passed(result)) {
    out.push(`${result.name}: OK — ${result.summary}`)
  } else {
    err.push(`${result.name}: ${result.problems.length} problem(s) — ${result.summary}`)
    for (const problem of result.problems) err.push(`  ${problem}`)
  }
  return { out, err }
}
