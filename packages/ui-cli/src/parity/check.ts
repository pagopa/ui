import type { Workspace } from "../adapters/workspace.ts"
import { requiredDevices } from "../figma/devices.ts"
import { UsageError } from "../lib/command.ts"
import type { ParityCase } from "../schemas/parity.ts"
import { saveCase } from "./case-writer.ts"
import { caseIdFor, readCorpus, type CaseCorpus } from "./corpus.ts"
import { formatResult } from "./diff.ts"
import { checkCaseEvidence } from "./evidence.ts"
import { capture as captureStory } from "./render.ts"
import { checkSaved } from "./saved.ts"
import { loadExport } from "./source.ts"

import { corpusPath, devicePolicy, inventoryNode, registryCase } from "./context.ts"
import { evaluateCase } from "./evaluate.ts"
import { responsiveCounts, responsiveSummary, scopeSummary } from "./format.ts"
import { caseFromOptions, specFromCase } from "./mapping.ts"
import { output, type ParityOutput } from "./output.ts"
import type { CaseReport, CaseSpec, CheckOptions } from "./types.ts"
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
type CheckDeps = { capture?: typeof captureStory; evaluate?: typeof evaluateCase }

export async function check(
  workspace: Workspace,
  options: CheckOptions,
  deps: CheckDeps = {},
): Promise<ParityOutput> {
  if (options.saved) return checkSaved(workspace, options, (item) => check(workspace, item, deps))
  const out: string[] = []
  const err: string[] = []
  const caseId = options.caseId
  const nodeId = options.nodeId
  if (!caseId && !nodeId) throw new UsageError("check requires --node <id> or --case <caseId>")
  if (options.devices) {
    if (!nodeId)
      throw new UsageError("--devices needs --node <id>: it runs the node's device cases")
    return await checkDevices(workspace, { ...options, nodeId: String(nodeId) }, deps)
  }
  const path_ = corpusPath(workspace, options.casesFile)
  let spec
  let caseEntry: ParityCase | undefined
  if (caseId) {
    caseEntry = readCorpus(workspace, path_).find(String(caseId))
    spec = specFromCase(caseEntry, options)
    if (!spec.storyId)
      throw new UsageError(`${caseId}: the case declares no storyId and none was passed`)
  } else {
    spec = caseFromOptions(registryCase(workspace, String(nodeId)), options)
  }
  const project = loadExport(workspace, options.input)
  if (!options.json) out.push(`source: ${project.file} (${project.origin})`)
  // The slice is evidence, not a live read: before capturing, prove it still
  // describes the case and the inventory it was pinned against. A stale slice
  // is missing evidence, so the run stops before Storybook. An explicit
  // `--input <slice>` is the same evidence and gets the same check.
  if (project.raw.kind === "parity-source" && caseEntry) {
    const evidenceErrors = checkCaseEvidence({
      root: workspace.workspaceRoot,
      entry: spec,
      node: inventoryNode(workspace, spec.nodeId),
      sourceSha256: project.sourceSha256,
    })
    if (evidenceErrors.length) {
      for (const error of evidenceErrors) err.push(`error: ${error}`)
      return output(2, out, err)
    }
    if (!options.json) out.push("evidence: bundle matches the committed inventory")
  }
  const {
    report,
    probe,
    mapping,
    err: warnings,
  } = await (deps.evaluate ?? evaluateCase)(workspace, spec, { project, ...deps })
  err.push(...(warnings ?? []))
  if (options.saveCase) {
    const saved = saveCase(
      path_,
      { ...spec, storyId: report.storyId },
      { id: caseId ? String(caseId) : caseIdFor(spec) },
    )
    out.push(`case saved: ${saved.entry.id} -> ${saved.file} (${saved.total} case(s))`)
  }
  const data = checkedOutput(options, spec, project, report, probe, mapping, out)
  return output(report.deltas.length ? 3 : 0, out, err, data)
}

function checkedOutput(
  options: CheckOptions,
  spec: CaseSpec,
  project: ReturnType<typeof loadExport>,
  report: CaseReport,
  probe: Record<string, unknown>,
  mapping: string[],
  out: string[],
) {
  const caseId = options.caseId
  if (options.json)
    out.push(
      JSON.stringify(
        {
          report,
          probe,
          case: spec,
          source: { file: project.file, origin: project.origin },
          mapping,
        },
        null,
        2,
      ),
    )
  else {
    out.push(...formatCaseResult(report, { notes: options.notes }))
    // The mapping nudge belongs to the per-node loop, where the case is written:
    // a reviewed `--case` run reproduces the stored mapping and stays quiet.
    if (!caseId && mapping.length) {
      const shown = mapping.slice(0, 6).join(", ")
      const more = mapping.length > 6 ? `, +${mapping.length - 6} more` : ""
      out.push(
        `  mapping: ${mapping.length} source frame(s) with padding not mapped (${shown}${more}) ` +
          "— map them as --subject or record the adaptation",
      )
    }
  }
  return {
    report,
    probe,
    case: spec,
    source: { file: project.file, origin: project.origin },
    mapping,
  }
}

// One command for a node's whole device dimension (RA5): every device the set
// declares, its committed case, and one table. A device without a reviewed case
// is missing evidence, and the command exits 1 — the coverage is never inferred
// from a sibling device.
async function checkDevices(
  workspace: Workspace,
  options: CheckOptions & { nodeId: string },
  deps: CheckDeps,
): Promise<ParityOutput> {
  const { nodeId } = options
  const out: string[] = []
  const err: string[] = []
  const corpus = readCorpus(workspace, corpusPath(workspace, options.casesFile))
  const inventory = inventoryNode(workspace, nodeId)
  if (!inventory) throw new UsageError(`${nodeId} is not in inventory.json`)
  const devices = requiredDevices(devicePolicy(workspace), inventory)
  if (!devices.length) {
    throw new UsageError(`${nodeId} declares no device axis: there is no device case to run`)
  }
  const project = loadExport(workspace, options.input)
  if (!options.json) out.push(`source: ${project.file} (${project.origin})`)
  const evidenceErrors = deviceEvidence(workspace, corpus, devices, nodeId, inventory, project)
  if (evidenceErrors.length)
    return output(
      2,
      out,
      evidenceErrors.map((error) => `error: ${error}`),
    )
  if (project.raw.kind === "parity-source" && !options.json)
    out.push("evidence: bundle matches the committed inventory")
  const rows: DeviceRow[] = []
  for (const device of devices) {
    const entry = corpus.of(nodeId).find((item) => item.device === device)
    if (!entry) {
      rows.push({ device, variant: "-", verdict: "missing-case", deltas: 0, responsive: "-" })
      continue
    }
    rows.push(await deviceResult(workspace, entry, device, project, deps))
  }
  const failed = rows.some((row) => row.verdict === "missing-case" || row.verdict === "error")
  const deltas = rows.some((row) => (row.deltas ?? 0) > 0)
  if (options.json) out.push(JSON.stringify({ nodeId, devices: rows }, null, 2))
  else {
    out.push(`${nodeId} ${inventory.name} — ${devices.length} declared device(s)`)
    out.push("device   variant    verdict              deltas  responsive")
    for (const row of rows) {
      out.push(
        `${String(row.device).padEnd(8)} ${String(row.variant).padEnd(10)} ` +
          `${String(row.verdict).padEnd(20)} ${String(row.deltas).padEnd(7)} ${row.responsive}`,
      )
    }
  }
  return output(failed ? 2 : deltas ? 3 : 0, out, err, { nodeId, devices: rows })
}

type DeviceRow = {
  device: string
  variant: string
  verdict: string
  deltas: number
  responsive: string
}

function deviceEvidence(
  workspace: Workspace,
  corpus: CaseCorpus,
  devices: string[],
  nodeId: string,
  inventory: NonNullable<ReturnType<typeof inventoryNode>>,
  project: ReturnType<typeof loadExport>,
): string[] {
  if (project.raw.kind !== "parity-source") return []
  return [
    ...new Set(
      devices.flatMap((device) => {
        const entry = corpus.of(nodeId).find((item) => item.device === device)
        return entry
          ? checkCaseEvidence({
              root: workspace.workspaceRoot,
              entry,
              node: inventory,
              sourceSha256: project.sourceSha256,
            })
          : []
      }),
    ),
  ]
}

async function deviceResult(
  workspace: Workspace,
  entry: ParityCase,
  device: string,
  project: ReturnType<typeof loadExport>,
  deps: CheckDeps,
): Promise<DeviceRow> {
  try {
    const spec = specFromCase(entry)
    const { report } = await (deps.evaluate ?? evaluateCase)(workspace, spec, { project, ...deps })
    const counts = responsiveCounts(report)
    return {
      device,
      variant: report.variant,
      verdict: report.verdict,
      deltas: report.deltas.length,
      responsive: responsiveSummary(counts),
    }
  } catch (error) {
    return {
      device,
      variant: "-",
      verdict: "error",
      deltas: 0,
      responsive: error instanceof Error ? error.message : String(error),
    }
  }
}
