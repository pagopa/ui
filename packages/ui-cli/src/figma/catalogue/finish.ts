import fs from "node:fs"
import path from "node:path"
import type { Workspace } from "../../adapters/workspace.ts"
import { writeJson } from "../../lib/json.ts"
import type { CatalogueReport } from "../sync.ts"
import { formatDeviceLine } from "../devices.ts"
import { formatSurfaceLine } from "../surface.ts"
import { renderCatalogueDelta, renderCataloguePrBody } from "../catalogue-render.ts"
import { designPaths, readFigmaConfig } from "../config.ts"
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
    writeJson(path.join(root, file), data)
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
  writeJson(
    file,
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
  )
  out.push(`delta: ${context.deltaPath}`)
}

/**
 * The exit code reads each origin on its own: drift is the one failure a pull
 * request can absorb, and it is exit 3 only while nothing else failed. Matching
 * the two lists by their text was the previous test, and any error whose text
 * repeated a drift line passed as drift.
 */
export function catalogueExitCode(input: {
  errors: string[]
  validationErrors: string[]
  driftErrors: string[]
}): number {
  if (input.errors.length || input.validationErrors.length) return 1
  return input.driftErrors.length ? 3 : 0
}

/** The files the run asked to write, named even when the run refuses to write them. */
function writeTargets(context: CatalogueContext): string[] {
  const targets = [...context.pendingWrites.keys()]
  if (context.prBodyPath && context.hasDrift) targets.push(context.prBodyPath)
  if (context.deltaPath && context.live) targets.push(context.deltaPath)
  return targets
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
        requests: designPaths(readFigmaConfig(workspace)).requests,
      }),
    )
    err.push(
      ...errors.map((error) => `error: ${error}`),
      ...context.driftErrors.map((error) => `error: ${error}`),
    )
  } else {
    err.push(
      ...warnings.map((warning) => `warn: ${warning}`),
      ...errors.map((error) => `error: ${error}`),
      ...context.driftErrors.map((error) => `error: ${error}`),
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
  } else {
    const targets = writeTargets(context)
    if (targets.length)
      err.push(
        `not written: ${targets.join(", ")} — ${errors.length} error(s) block the run, fix them and rerun`,
      )
  }
  return {
    exitCode: catalogueExitCode({
      errors: context.errors,
      validationErrors: validation.errors,
      driftErrors: context.driftErrors,
    }),
    out,
    err,
  }
}
