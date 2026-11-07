import type { Workspace } from "../../adapters/workspace.ts"
import { readJson } from "../../lib/json.ts"
import { parseSchema } from "../../lib/validate.ts"
import {
  DEVICE_EXCEPTIONS_PATH,
  deviceCoverage,
  isDraftCase,
  loadCaseFile,
  loadDeviceExceptions,
  validateCaseFile,
} from "../../parity/cases.ts"
import {
  longNoteErrors,
  NOTE_LENGTH_BASELINE_PATH,
  NoteLengthBaselineSchema,
  type Inventory,
  type InventoryNode,
  type PageSurface,
  type Registry,
} from "../../schemas/catalogue.ts"
import type { DevicePolicy } from "../../schemas/devices.ts"
import { checkDevicePolicy, loadDevicePolicy, type DeviceStats } from "../devices.ts"
import { fileKeyFromSource } from "../snapshot.ts"
import {
  checkPageSurface,
  loadPageSurface,
  PAGE_SURFACE_PATH,
  surfacePending,
  surfaceUncensused,
  surfaceUnmirrored,
  type SurfacePending,
  type SurfaceStats,
  type SurfaceUncensused,
  type SurfaceUnmirrored,
} from "../surface.ts"

export type ValidationResult = { errors: string[]; warnings: string[] }
export type DeviceValidation = ValidationResult & {
  policy: DevicePolicy | null
  stats: DeviceStats | null
}
export type CoverageStats = {
  sets: number
  covered: number
  missing: number
  drafts: number
  exceptions: number
}
export type CaseStats = { cases: number; errors: number; warnings: number; drafts: number }
export type SurfaceValidation = ValidationResult & {
  stats: SurfaceStats | null
  waiting: SurfacePending[]
  unmirrored: SurfaceUnmirrored[]
  uncensused: SurfaceUncensused[]
}

const DEVICE_POLICY_PATH = "src/catalog/figma/device-policy.json"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function validateInventoryMetadata(
  workspace: Workspace,
  inventory: Inventory,
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const fileKey = fileKeyFromSource(workspace)
  if (!fileKey) errors.push("src/catalog/figma/file.ts: FIGMA_FILE_KEY not found")
  else if (fileKey !== inventory.fileKey)
    errors.push("src/catalog/figma/file.ts: FIGMA_FILE_KEY != inventory.fileKey")
  const syncedAt = Date.parse(inventory.syncedAt)
  if (Number.isFinite(syncedAt)) {
    const ageDays = Math.floor((Date.now() - syncedAt) / 86_400_000)
    if (ageDays > 30)
      warnings.push(
        `inventory snapshot is ${ageDays} days old — reconcile with the live file (pnpm nx run pagopa-ui-cli:figma:triage)`,
      )
  }
  return { errors, warnings }
}

export function validateDeviceVocabulary(
  workspace: Workspace,
  nodes: InventoryNode[],
): DeviceValidation {
  try {
    const policy = loadDevicePolicy(workspace.path(DEVICE_POLICY_PATH))
    const result = checkDevicePolicy(policy, nodes)
    return { policy, stats: result.stats, errors: result.errors, warnings: result.warnings }
  } catch (error) {
    return { policy: null, stats: null, errors: [errorMessage(error)], warnings: [] }
  }
}

export function validateDeviceCases(
  workspace: Workspace,
  policy: DevicePolicy | null,
  registry: Registry,
  nodes: InventoryNode[],
): { result: ValidationResult; stats: CaseStats | null } {
  if (!policy) return { result: { errors: [], warnings: [] }, stats: null }
  try {
    const cases = loadCaseFile(workspace.path("src/catalog/figma/parity-cases.json"))
    const verdict = validateCaseFile(workspace, cases, { registry, nodes, policy })
    return {
      result: {
        errors: verdict.errors.map((error) => `cases: ${error}`),
        warnings: verdict.warnings.map((warning) => `cases: ${warning}`),
      },
      stats: {
        cases: cases.length,
        errors: verdict.errors.length,
        warnings: verdict.warnings.length,
        drafts: cases.filter(isDraftCase).length,
      },
    }
  } catch (error) {
    return { result: { errors: [errorMessage(error)], warnings: [] }, stats: null }
  }
}

export function validatePageSurface(
  workspace: Workspace,
  surface: PageSurface | null,
  nodes: InventoryNode[],
  registry: Registry,
  policy: DevicePolicy | null,
  fileKey: string | null,
): SurfaceValidation {
  try {
    const census = surface ?? loadPageSurface(workspace.path(PAGE_SURFACE_PATH))
    const cases = policy ? loadCaseFile(workspace.path("src/catalog/figma/parity-cases.json")) : []
    const result = checkPageSurface(census, {
      nodes,
      registry,
      cases,
      fileKey: fileKey ?? "",
      devices: Object.keys(policy?.devices ?? {}),
    })
    return {
      errors: result.errors,
      warnings: result.warnings,
      stats: result.stats,
      waiting: surfacePending(census),
      unmirrored: surfaceUnmirrored(census),
      uncensused: surfaceUncensused(census, nodes),
    }
  } catch (error) {
    return {
      errors: [errorMessage(error)],
      warnings: [],
      stats: null,
      waiting: [],
      unmirrored: [],
      uncensused: [],
    }
  }
}

export function validateNoteBaseline(workspace: Workspace, registry: Registry): string[] {
  try {
    const baseline = parseSchema(
      NoteLengthBaselineSchema,
      readJson(workspace.path(NOTE_LENGTH_BASELINE_PATH)),
      NOTE_LENGTH_BASELINE_PATH,
    )
    return longNoteErrors(registry, baseline, NOTE_LENGTH_BASELINE_PATH)
  } catch (error) {
    if (error instanceof Error && error.message.includes("ENOENT")) return []
    return [`${NOTE_LENGTH_BASELINE_PATH}: ${errorMessage(error)}`]
  }
}

export function validateDeviceCoverage(
  workspace: Workspace,
  policy: DevicePolicy,
  nodes: InventoryNode[],
  registry: Registry,
  deltaIds: Set<string>,
): { errors: string[]; warnings: string[]; stats: CoverageStats } {
  const errors: string[] = []
  const warnings: string[] = []
  try {
    const cases = loadCaseFile(workspace.path("src/catalog/figma/parity-cases.json"))
    const exceptions = loadDeviceExceptions(workspace.path(DEVICE_EXCEPTIONS_PATH))
    const coverage = deviceCoverage({ policy, nodes, registry, cases, statuses: ["implemented"] })
    const byNode = new Map(coverage.all.map((row) => [row.nodeId, row]))
    validateCoverageExceptions(exceptions, byNode, errors)
    const uncovered = coverage.rows.filter(
      (row) => row.missing.length && !Object.hasOwn(exceptions, row.nodeId),
    )
    for (const row of uncovered) {
      if (deltaIds.has(row.nodeId))
        errors.push(
          `device coverage: ${row.nodeId} is in the delta and stays implemented without a case for ${row.missing.join(", ")} — save one case per declared device or add a reasoned entry to ${DEVICE_EXCEPTIONS_PATH}`,
        )
    }
    const historical = uncovered.filter((row) => !deltaIds.has(row.nodeId))
    if (historical.length)
      warnings.push(
        `device coverage: ${historical.length} implemented node(s) miss ${historical.reduce((count, row) => count + row.missing.length, 0)} device case(s) — the burn-down work list is \`pnpm nx run pagopa-ui-cli:parity:queue --uncovered\``,
      )
    return {
      errors,
      warnings,
      stats: {
        sets: coverage.rows.length,
        covered: coverage.totals.covered,
        missing: coverage.totals.missing,
        drafts: coverage.totals.drafts,
        exceptions: Object.keys(exceptions).length,
      },
    }
  } catch (error) {
    errors.push(errorMessage(error))
    return {
      errors,
      warnings,
      stats: { sets: 0, covered: 0, missing: 0, drafts: 0, exceptions: 0 },
    }
  }
}

function validateCoverageExceptions(
  exceptions: Record<string, string>,
  byNode: Map<string, { missing: string[] }>,
  errors: string[],
): void {
  for (const [nodeId, reason] of Object.entries(exceptions)) {
    if (typeof reason !== "string" || !reason.trim()) {
      errors.push(`${DEVICE_EXCEPTIONS_PATH}: ${nodeId} requires a reason`)
      continue
    }
    const row = byNode.get(nodeId)
    if (!row)
      errors.push(
        `${DEVICE_EXCEPTIONS_PATH}: ${nodeId} is not a registry entry with a device axis — remove the exception`,
      )
    else if (!row.missing.length)
      errors.push(
        `${DEVICE_EXCEPTIONS_PATH}: ${nodeId} covers every declared device — remove the exception`,
      )
  }
}
