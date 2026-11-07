import fs from "node:fs"
import path from "node:path"
import type { Workspace } from "../../adapters/workspace.ts"
import type { CatalogueReport } from "../sync.ts"
import { formatDeviceLine } from "../devices.ts"
import { formatSurfaceLine } from "../surface.ts"
import { renderCatalogueDelta, renderCataloguePrBody } from "../catalogue-render.ts"
import { formatCatalogueSummary, formatCoverageLine, renderCataloguePlan } from "./output.ts"
import type { CatalogueContext } from "./context.ts"
import type { CatalogueValidation } from "./validate.ts"

function writePendingFiles(
  root: string,
  context: CatalogueContext,
  plan: boolean,
  out: string[],
  err: string[],
): void {
  for (const [file, data] of context.pendingWrites) {
    const temporary = path.join(root, `${file}.${Date.now()}.tmp`)
    try {
      fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n", { flag: "wx" })
      fs.renameSync(temporary, path.join(root, file))
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
    }
    const line = `validated and written: ${file}`
    if (plan) err.push(line)
    else out.push(line)
  }
}

function writePullRequestBody(
  workspace: Workspace,
  context: CatalogueContext,
  validation: CatalogueValidation,
  out: string[],
): void {
  if (!context.prBodyPath || !context.hasDrift) return
  const file = path.resolve(workspace.root, context.prBodyPath)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(
    file,
    `${renderCataloguePrBody({
      workspace,
      inventory: context.inventory,
      registry: context.registry,
      delta: context.delta,
      live: context.live,
      committed: context.committed,
      liveVersion: context.liveVersion,
      ratchet: context.ratchet,
      evidenceBase: context.evidenceBase,
      devicePolicy: validation.devicePolicy,
      deviceStats: validation.deviceStats,
      deviceCoverage: validation.deviceCoverage,
      bulkByNode: validation.bulkByNode,
      bulkByPage: validation.bulkByPage,
      entries: validation.entries,
    })}\n`,
  )
  out.push(`pr body: ${context.prBodyPath}`)
}

function writeDeltaFile(
  workspace: Workspace,
  context: CatalogueContext,
  validation: CatalogueValidation,
  out: string[],
): void {
  if (!context.deltaPath || !context.live) return
  const file = path.resolve(workspace.root, context.deltaPath)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      renderCatalogueDelta({
        workspace,
        inventory: context.inventory,
        registry: context.registry,
        delta: context.delta,
        live: context.live,
        committed: context.committed,
        liveVersion: context.liveVersion,
        ratchet: context.ratchet,
        evidenceBase: context.evidenceBase,
        devicePolicy: validation.devicePolicy,
        deviceStats: validation.deviceStats,
        deviceCoverage: validation.deviceCoverage,
        bulkByNode: validation.bulkByNode,
        bulkByPage: validation.bulkByPage,
        entries: validation.entries,
      }),
      null,
      2,
    )}\n`,
  )
  out.push(`delta: ${context.deltaPath}`)
}

export function finishCatalogue(
  context: CatalogueContext,
  validation: CatalogueValidation,
  plan: boolean,
): CatalogueReport {
  const workspace = context.workspace
  const out = [...context.out]
  const err = [...context.err]
  const errors = [...context.errors, ...validation.errors]
  const warnings = [...context.warnings, ...validation.warnings]
  if (plan) {
    out.push(
      renderCataloguePlan({
        delta: context.delta,
        live: context.live,
        committed: context.committed,
        entries: validation.entries,
        liveVersion: context.liveVersion,
        surfaceWaiting: validation.surfaceWaiting,
        surfaceUnmirrored: validation.surfaceUnmirrored,
        surfaceUncensused: validation.surfaceUncensused,
        deviceStats: validation.deviceStats,
        deviceCoverage: validation.deviceCoverage,
      }),
    )
    err.push(...errors.map((error) => `error: ${error}`))
  } else {
    err.push(
      ...warnings.map((warning) => `warn: ${warning}`),
      ...errors.map((error) => `error: ${error}`),
    )
    out.push(
      ...formatCatalogueSummary({
        committed: context.committed,
        entries: validation.entries,
        bulkByNode: validation.bulkByNode,
        bulkByPage: validation.bulkByPage,
        evidenceExceptions: context.evidenceExceptions,
        apiExceptions: context.apiExceptions,
        deviceCoverage: validation.deviceCoverage,
        deviceStats: validation.deviceStats,
        formatDeviceLine,
        formatCoverageLine,
        coverage: validation.deviceCoverage,
        surfaceStats: validation.surfaceStats,
        formatSurfaceLine,
        caseStats: validation.caseStats,
      }),
    )
  }
  if (!errors.length) {
    writePendingFiles(workspace.root, context, plan, out, err)
    writePullRequestBody(workspace, context, validation, out)
    writeDeltaFile(workspace, context, validation, out)
  }
  const driftOnly = context.hasDrift && !context.writeRequested && !context.prBodyPath
  return { exitCode: errors.length ? (driftOnly ? 3 : 1) : 0, out, err }
}
