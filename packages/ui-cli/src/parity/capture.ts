import fs from "node:fs"
import { writeJson } from "../lib/json.ts"
import path from "node:path"
import { now as clockNow } from "../adapters/figma-images.ts"
import type { CaseReport } from "./types.ts"

import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { readCases } from "../records/committed.ts"
import { buildCases, isDraftCase } from "./cases.ts"
import { checkCaseEvidence } from "./evidence.ts"
import { loadExport, type Project } from "./source.ts"

import { corpusPath, inventoryNode, registryCase, statusesFrom } from "./context.ts"
import { evaluateCase } from "./evaluate.ts"
import { responsiveCounts, responsiveSummary } from "./format.ts"
import { specFromCase } from "./mapping.ts"
import { output, type ParityOutput } from "./output.ts"
import type { CaseSpec, WaveOptions } from "./types.ts"
type WaveResult = {
  file?: string
  nodeId: string
  variant?: string
  variantName?: string
  device?: string | null
  storyId?: string
  status: string
  deltas?: number
  advisories?: number
  residues?: number
  responsive?: string
  id?: string
  draft?: boolean
  case?: unknown
  message?: string
}

type Evaluator = (spec: CaseSpec, input: { project: Project }) => ReturnType<typeof evaluateCase>
export async function captureWave(
  workspace: Workspace,
  options: WaveOptions,
  {
    evaluate = (spec, input) => evaluateCase(workspace, spec, input),
    now = clockNow,
  }: {
    evaluate?: (spec: CaseSpec, input: { project: Project }) => ReturnType<typeof evaluateCase>
    now?: () => Date
  } = {},
): Promise<ParityOutput> {
  const out: string[] = []
  const err: string[] = []
  const directory = workspace.path(String(options.outDir ?? workspace.path(".figma/parity")))
  const limit = options.limit ? Number(options.limit) : Number.POSITIVE_INFINITY
  const saved = Boolean(options.saved)

  let specs = selectWaveCases(workspace, options, limit)
  if (options.dryRun) {
    for (const spec of specs) {
      if (saved) {
        out.push(
          `${spec.id} ${spec.nodeId} ${spec.storyId || "(no story)"}${isDraftCase(spec) ? " (draft)" : ""}`,
        )
      } else {
        out.push(`${spec.nodeId} ${spec.storyId ?? "(no story)"}`)
      }
    }
    out.push(`${specs.length} case(s)`)
    if (saved && specs.some((spec) => !spec.storyId)) {
      err.push("error: saved case has no storyId")
      return output(2, out, err)
    }
    return output(0, out, err)
  }
  let project: Project
  try {
    project = loadExport(workspace, options.input)
  } catch (error) {
    if (!saved) throw error
    throw new UsageError(error instanceof Error ? error.message : String(error))
  }
  if (saved && project.raw.kind === "parity-source") {
    const errors = specs.flatMap((spec) =>
      checkCaseEvidence({
        root: workspace.workspaceRoot,
        entry: spec,
        node: inventoryNode(workspace, spec.nodeId),
        sourceSha256: project.sourceSha256,
      }),
    )
    if (errors.length) {
      for (const error of new Set(errors)) err.push(`error: ${error}`)
      return output(2, out, err)
    }
  }
  // The strict profile promotes the composition advisories into the verdict:
  // it is a case-level switch, and the command line forces it on the whole wave.
  if (options.strict) specs = specs.map((spec) => ({ ...spec, strict: true }))
  // `--note <text>` annotates every case of the wave: the captured report
  // carries it, and a later `--save-case` writes it into the corpus.
  const note = options.note
  if (note) specs = specs.map((spec) => ({ ...spec, note }))

  fs.mkdirSync(directory, { recursive: true })
  const results: WaveResult[] = []
  for (const [index, spec] of specs.slice(0, limit).entries()) {
    await captureOne(workspace, spec, index, project, directory, saved, evaluate, results, out, err)
  }
  return finishWave(options, now, directory, saved, results, out, err)
}

function selectWaveCases(workspace: Workspace, options: WaveOptions, limit: number): CaseSpec[] {
  const saved = options.saved
  let specs
  if (saved) {
    const nodeId = options.nodeId
    if (!nodeId || nodeId.includes(",")) {
      throw new UsageError("--saved requires one --node <id>")
    }
    if (options.status !== undefined || options.includeCatalogue || options.note !== undefined) {
      throw new UsageError(
        "--status, --include-catalogue and --note apply to registry waves, not --saved",
      )
    }
    if (options.casesFile !== undefined && !options.casesFile) {
      throw new UsageError("--cases needs a file")
    }
    if (options.device !== undefined && !options.device) {
      throw new UsageError("--device needs a value")
    }
    if (options.limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
      throw new UsageError("--limit needs a positive integer")
    }
    const device = options.device
    const entries = (readCases(corpusPath(workspace, options.casesFile)) ?? []).filter(
      (entry) => entry.nodeId === nodeId && (!device || entry.device === device),
    )
    if (!entries.length) {
      throw new UsageError(`${nodeId}: no saved cases${device ? ` for device ${device}` : ""}`)
    }
    const ids = new Set(entries.map((entry) => entry.id))
    if (ids.size !== entries.length) throw new UsageError(`${nodeId}: duplicate saved case ids`)
    specs = entries.map((entry) => specFromCase(entry, options)).slice(0, limit)
  } else if (options.casesFile) {
    specs = JSON.parse(fs.readFileSync(String(options.casesFile), "utf8"))
    if (!Array.isArray(specs)) throw new UsageError(`${options.casesFile}: expected a case array`)
  } else {
    let cases = [...buildCases(workspace, { statuses: statusesFrom(options.status) })]
    if (!options.includeCatalogue) {
      cases = cases.filter((item) => !(item.title ?? "").startsWith("Foundations/"))
    }
    if (options.nodeId && true) {
      const wanted = new Set(String(options.nodeId).split(","))
      cases = cases.filter((item) => wanted.has(item.nodeId))
    }
    // `--device mobile` captures every selected node at that device: the wave
    // iteration is one device per pass (RA8), not one node per pass.
    const device = options.device
    specs = cases.map((item) => ({
      nodeId: item.nodeId,
      storyId: item.storyIds[0] ?? "",
      export: item.export,
      ...(device ? { device } : {}),
    }))
  }

  return specs
}

async function captureOne(
  workspace: Workspace,
  spec: CaseSpec,
  index: number,
  project: Project,
  directory: string,
  saved: boolean,
  evaluate: Evaluator,
  results: WaveResult[],
  out: string[],
  err: string[],
) {
  // A wave case may declare its story; otherwise the registry decides, and a
  // case without a declared story export is recorded as missing evidence.
  if (!saved && !spec.storyId) {
    try {
      const known = registryCase(workspace, spec.nodeId)
      const index = spec.export ? known.exports.indexOf(spec.export) : 0
      spec.storyId = known.storyIds[index >= 0 ? index : 0] ?? ""
    } catch {
      spec.storyId = ""
    }
  }
  if (!spec.storyId) {
    results.push({
      ...(saved ? { id: spec.id } : {}),
      nodeId: spec.nodeId,
      status: "missing-story",
    })
    out.push(`missing-story ${spec.id ?? spec.nodeId}`)
    return
  }
  try {
    // Two cases can share a node (two variants): the file name carries both,
    // and a device case carries its device after the selector.
    const selector = `${spec.variant ?? spec.state ?? "case"}${spec.device ? `-${spec.device}` : ""}`
    const fileBase = saved
      ? `${String(index + 1).padStart(3, "0")}-${String(spec.id).replace(/[^a-zA-Z0-9._-]/g, "-")}`
      : `${spec.nodeId.replace(":", "-")}-${selector}`
    const {
      report,
      probe,
      err: warnings,
    } = await evaluate(
      { ...spec, screenshot: path.join(directory, `${fileBase}.png`) },
      { project },
    )
    err.push(...(warnings ?? []))
    writeJson(path.join(directory, `${fileBase}.json`), { report, probe, case: spec })
    recordCaptured(spec, report, fileBase, saved, results, out)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    results.push({
      ...(saved ? { id: spec.id } : {}),
      nodeId: spec.nodeId,
      status: "error",
      message,
    })
    out.push(`error ${spec.id ?? spec.nodeId}: ${message}`)
  }
}

function finishWave(
  options: WaveOptions,
  now: () => Date,
  directory: string,
  saved: boolean,
  results: WaveResult[],
  out: string[],
  err: string[],
): ParityOutput {
  const summary = {
    schemaVersion: 1,
    wave: String(options.wave ?? now().toISOString().slice(0, 10)),
    generatedAt: now().toISOString(),
    cases: results,
    counts: results.reduce((counts: Record<string, number>, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1
      return counts
    }, {}),
  }
  writeJson(path.join(directory, "summary.json"), summary)
  out.push(`${results.length} case(s) -> ${options.outDir ?? directory}/summary.json`)
  if (
    saved &&
    results.some((item) => item.status === "missing-story" || item.status === "error" || item.draft)
  ) {
    return output(2, out, err, summary)
  }
  return output(
    results.some((item) => item.status === "error" || item.status === "missing-story")
      ? 2
      : results.some((item) => (item.deltas ?? 0) > 0)
        ? 3
        : 0,
    out,
    err,
    summary,
  )
}

function recordCaptured(
  spec: CaseSpec,
  report: CaseReport,
  fileBase: string,
  saved: boolean,
  results: WaveResult[],
  out: string[],
) {
  results.push({
    file: `${fileBase}.json`,
    ...(saved ? { id: spec.id, draft: isDraftCase(spec) } : {}),
    nodeId: report.nodeId,
    variant: report.variant,
    variantName: report.variantName,
    device: report.device ?? spec.device ?? null,
    storyId: String(report.storyId ?? ""),
    status: report.verdict,
    deltas: report.deltas.length,
    advisories: report.advisories.length,
    residues: report.residues.length,
    responsive: responsiveSummary(responsiveCounts(report)),
    case: spec,
  })
  out.push(
    `${report.verdict.padEnd(22)} ${saved ? `${spec.id} ` : ""}${report.nodeId} ${report.variant}` +
      `${saved && isDraftCase(spec) ? " (draft)" : ""}` +
      `${report.device ? ` ${report.device}` : ""}`,
  )
}
