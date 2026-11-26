// Figma parity — the ephemeral diagnostic.
//
// Compares one registry target's numeric source against its Storybook render
// and reports the deltas. It reads the pinned export and the rendered DOM and
// writes nothing: no case is saved, no evidence bundle is refreshed, and a run
// leaves the tree exactly as it found it. The corpus this command once wrote is
// retired (ADR-0011), so a finding is reported to the person running it rather
// than accumulated in the repository.

import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { registryCase } from "./context.ts"
import { formatResult } from "./diff.ts"
import { evaluateCase } from "./evaluate.ts"
import { responsiveCounts, responsiveSummary, scopeSummary } from "./format.ts"
import { output, type ParityOutput } from "./output.ts"
import { capture as captureStory } from "./render.ts"
import { loadExport } from "./source.ts"
import { specFromOptions } from "./spec.ts"
import type { CaseReport, DiagnoseOptions } from "./types.ts"

export function formatCaseResult(report: CaseReport, { notes }: { notes?: boolean }): string[] {
  const out: string[] = []
  out.push(`${report.nodeId} ${report.variant} "${report.variantName}" -> ${report.storyId}`)
  if (report.device) out.push(`  device ${report.device}`)
  out.push(formatResult(report))
  const responsive = responsiveCounts(report)
  out.push(
    `  responsive: ${responsiveSummary(responsive)}` +
      (report.scope ? ` · scope ${scopeSummary(report.scope)}` : ""),
  )
  if (notes) {
    for (const note of report.notes) out.push(`  note ${note.path}: ${note.note}`)
    const capture = report.capture
    if (capture) {
      out.push(
        `  capture devicePixelRatio ${capture.dpr} · ruler ${capture.rulerWidth}px · root ${capture.rootWidth}px` +
          ` · focus ${capture.focus} · offsets from ${capture.offsetOrigin}` +
          (capture.state ? ` · state ${capture.state.state}: ${capture.state.ok}` : ""),
      )
    }
  }
  return out
}

export type DiagnoseDeps = { capture?: typeof captureStory; evaluate?: typeof evaluateCase }

// Exit codes: 0 the render matches, 3 the render reconciles, 2 the run could not
// produce a comparable render (missing story, missing source, capture refusal).
export async function check(
  workspace: Workspace,
  options: DiagnoseOptions,
  deps: DiagnoseDeps = {},
): Promise<ParityOutput> {
  if (!options.nodeId) throw new UsageError("check requires --node <id>")
  const spec = specFromOptions(registryCase(workspace, String(options.nodeId)), options)
  const project = loadExport(workspace, options.input)
  const out: string[] = []
  if (!options.json) out.push(`source: ${project.file} (${project.origin})`)
  const {
    report,
    probe,
    mapping,
    err: warnings,
  } = await (deps.evaluate ?? evaluateCase)(workspace, spec, { project, ...deps })
  const data = {
    report,
    probe,
    spec,
    source: { file: project.file, origin: project.origin },
    mapping,
  }
  if (options.json) out.push(JSON.stringify(data, null, 2))
  else {
    out.push(...formatCaseResult(report, { notes: options.notes }))
    if (mapping.length) {
      const shown = mapping.slice(0, 6).join(", ")
      const more = mapping.length > 6 ? `, +${mapping.length - 6} more` : ""
      out.push(
        `  mapping: ${mapping.length} source frame(s) with padding not mapped (${shown}${more}) ` +
          "— map them as --subject or record the adaptation",
      )
    }
  }
  return output(report.deltas.length ? 3 : 0, out, warnings ?? [], data)
}
