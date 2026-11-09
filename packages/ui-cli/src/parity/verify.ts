import type { ParityCase } from "../schemas/parity.ts"

import type { Workspace } from "../adapters/workspace.ts"
import { isDraftCase, loadCaseFile, loadRegistry, validateCaseFile } from "./cases.ts"
import { formatCoverage, loadCoveragePopulations } from "./coverage.ts"
import { checkEvidence } from "./evidence.ts"

import {
  corpusPath,
  devicePolicy,
  frameBaseline,
  inventoryFileKey,
  inventoryNodes,
} from "./context.ts"
import { output, type ParityOutput } from "./output.ts"
export function verify(
  workspace: Workspace,
  options: { casesFile?: string; json?: boolean } = {},
): ParityOutput {
  const out: string[] = []
  const err: string[] = []
  const path_ = corpusPath(workspace, options.casesFile)
  const cases = loadCaseFile(path_)
  const registry = loadRegistry(workspace.path("src/catalog/figma/registry.json"))
  const nodes = inventoryNodes(workspace)
  const policy = devicePolicy(workspace)
  const corpus = validateCaseFile(workspace, cases, { registry, nodes, policy })
  const errors = [...corpus.errors]
  const warnings = [...corpus.warnings]
  const drafts = cases.filter(isDraftCase).length
  verifyFrames(workspace, cases, errors, warnings)
  const evidence = checkEvidence({
    root: workspace.workspaceRoot,
    dataRoot: workspace.root,
    cases,
    nodes,
  })
  const populations = loadCoveragePopulations(
    workspace,
    nodes,
    registry,
    cases,
    ["implemented"],
    evidence,
    inventoryFileKey(workspace),
    corpus.errors,
  )
  coverageIssues(populations, evidence, errors, warnings)
  if (options.json) {
    out.push(
      JSON.stringify(
        {
          corpus: path_,
          cases: cases.length,
          drafts,
          errors,
          warnings,
          evidence: {
            entries: evidence.entries,
            bytes: evidence.bytes,
          },
          coverage: populations.devices.totals,
          rows: populations.devices.rows,
          populations,
        },
        null,
        2,
      ),
    )
  } else {
    for (const warning of warnings) err.push(`warn: ${warning}`)
    for (const error of errors) err.push(`error: ${error}`)
    out.push(
      `cases: ${cases.length} case(s) · errors ${errors.length} · ` +
        `warnings ${warnings.length} · drafts ${drafts}`,
    )
    out.push(
      `devices: ${populations.devices.totals.nodes} node(s) with an axis · declared ${populations.devices.totals.declared} · ` +
        `covered ${populations.devices.totals.covered} · missing ${populations.devices.totals.missing} · ` +
        `drafts ${populations.devices.totals.drafts}`,
    )
    out.push(
      `evidence: ${evidence.entries}/${evidence.cases} manifest entr(ies) · ${evidence.bytes} bytes`,
    )
    for (const line of formatCoverage(populations)) out.push(line)
    out.push(errors.length ? "verify: failed" : "verify: ok")
  }
  return output(errors.length ? 1 : 0, out, err)
}

function verifyFrames(
  workspace: Workspace,
  cases: ParityCase[],
  errors: string[],
  warnings: string[],
) {
  // The frame baseline only shrinks: a story that left the corpus, or that now
  // has nothing to frame, owes its removal; a story that renders its own frame
  // again owes it too — a waiver that outlives its reason hides the next
  // collapse the same way the missing frame hid this one.
  const baselined = frameBaseline(workspace)
  for (const storyId of Object.keys(baselined)) {
    const owed = cases.filter(
      (entry) =>
        entry.storyId === storyId && entry.layoutScope === "container" && Number(entry.width) > 0,
    )
    if (!owed.length) {
      errors.push(`frame-baseline: ${storyId} owes no source frame any more — delete its entry`)
    }
    if (!owed.length) continue
    warnings.push(
      `frame-baseline: ${storyId} still renders without a source frame (${[
        ...new Set(owed.map((entry) => Number(entry.width))),
      ].join(" or ")}px) — wrap it in \`SourceFrame\` and drop the entry`,
    )
  }
}

function coverageIssues(
  populations: ReturnType<typeof loadCoveragePopulations>,
  evidence: ReturnType<typeof checkEvidence>,
  errors: string[],
  warnings: string[],
) {
  // One source for the device numbers: the same populations the coverage lines
  // print. `all` keeps the statuses the filtered rows omit, so a pending node
  // still warns instead of vanishing.
  for (const row of populations.devices.all) {
    if (row.status !== "implemented" && row.status !== "pending") continue
    if (!row.missing.length) continue
    const message = `${row.nodeId} (${row.status}) misses device case(s): ${row.missing.join(", ")}`
    if (row.status === "implemented") errors.push(message)
    else warnings.push(message)
  }
  for (const warning of evidence.warnings) warnings.push(`evidence: ${warning}`)
  for (const error of populations.evidence.errors) errors.push(`evidence: ${error}`)
}
