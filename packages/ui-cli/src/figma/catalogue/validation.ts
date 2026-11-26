import type { Workspace } from "../../adapters/workspace.ts"
import { readJson } from "../../lib/json.ts"
import { readDevicePolicy } from "../../records/committed.ts"
import { parseSchema } from "../../lib/validate.ts"
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
import { checkDevicePolicy, type DeviceStats } from "../devices.ts"
import { fileKeyFromSource } from "../snapshot.ts"
import {
  checkPageSurface,
  loadPageSurface,
  PAGE_SURFACE_PATH,
  surfacePending,
  surfaceUncensused,
  type SurfacePending,
  type SurfaceStats,
  type SurfaceUncensused,
} from "../surface.ts"

export type ValidationResult = { errors: string[]; warnings: string[] }
export type DeviceValidation = ValidationResult & {
  policy: DevicePolicy | null
  stats: DeviceStats | null
}
export type SurfaceValidation = ValidationResult & {
  stats: SurfaceStats | null
  waiting: SurfacePending[]
  uncensused: SurfaceUncensused[]
}

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
    const policy = readDevicePolicy(workspace.root)
    const result = checkDevicePolicy(policy, nodes)
    return { policy, stats: result.stats, errors: result.errors, warnings: result.warnings }
  } catch (error) {
    return { policy: null, stats: null, errors: [errorMessage(error)], warnings: [] }
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
    const result = checkPageSurface(census, {
      nodes,
      registry,
      fileKey: fileKey ?? "",
      devices: Object.keys(policy?.devices ?? {}),
    })
    return {
      errors: result.errors,
      warnings: result.warnings,
      stats: result.stats,
      waiting: surfacePending(census),
      uncensused: surfaceUncensused(census, nodes),
    }
  } catch (error) {
    return {
      errors: [errorMessage(error)],
      warnings: [],
      stats: null,
      waiting: [],
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
