import type { Workspace } from "../../adapters/workspace.ts"
import type { Registry } from "../../schemas/catalogue.ts"
import type { DevicePolicy } from "../../schemas/devices.ts"
import { fileKeyFromSource } from "../snapshot.ts"
import { deltaTouchedNodes } from "../work-set.ts"
import type { CatalogueBase } from "./load.ts"
import { type CatalogueContext, type CatalogueSources, createCatalogueSources } from "./context.ts"
import {
  type SurfacePending,
  type SurfaceStats,
  type SurfaceUncensused,
  type SurfaceUnmirrored,
} from "../surface.ts"
import { type DeviceStats } from "../devices.ts"
import { staleStoryTitles } from "../stories.ts"
import {
  validateBulkRules,
  validateIconNames,
  validatePublicApi,
  validateRegistry,
  findUnaccountedNodes,
} from "./registry-validation.ts"
import {
  validateDeviceCases,
  validateDeviceCoverage,
  validateDeviceVocabulary,
  validateInventoryMetadata,
  validatePageSurface,
} from "./validation.ts"

export type CatalogueValidation = {
  errors: string[]
  warnings: string[]
  fileKey: string
  entries: Registry["entries"]
  bulkByPage: Map<string, Registry["bulkRules"][number]>
  bulkByNode: ReturnType<typeof validateBulkRules>["bulkByNode"]
  devicePolicy: DevicePolicy | null
  deviceStats: DeviceStats | null
  deviceCoverage: {
    sets: number
    covered: number
    missing: number
    drafts: number
    exceptions: number
  } | null
  caseStats: { cases: number; errors: number; warnings: number; drafts: number } | null
  surfaceStats: SurfaceStats | null
  surfaceWaiting: SurfacePending[]
  surfaceUnmirrored: SurfaceUnmirrored[]
  surfaceUncensused: SurfaceUncensused[]
}

function validateRegistryCatalogue(
  workspace: Workspace,
  context: CatalogueSources,
  errors: string[],
): {
  entries: Registry["entries"]
  bulk: ReturnType<typeof validateBulkRules>
} {
  const bulk = validateBulkRules(workspace, context.registry)
  errors.push(...bulk.errors)
  const entries = context.registry.entries ?? {}
  errors.push(
    ...validateRegistry(
      workspace,
      context.registry,
      context.committed,
      context.sourceModules,
      context.storyImportsByFile,
      context.allStoryImports,
      context.evidenceExceptions,
    ),
  )
  errors.push(
    ...validatePublicApi(
      workspace,
      context.sourceModules,
      entries,
      context.apiExceptions,
      context.publicExports,
    ),
  )
  errors.push(
    ...findUnaccountedNodes(context.committed, context.registry, bulk.bulkByPage, bulk.bulkByNode),
  )
  errors.push(...staleStoryTitles(workspace, context.registry))
  errors.push(
    ...validateIconNames(
      workspace,
      context.registry,
      context.committed,
      entries,
      bulk.bulkByPage,
      bulk.bulkByNode,
      bulk.manifests,
    ),
  )
  return { entries, bulk }
}

/**
 * The registry's hermetic diagnostics: no live export, no delta, no writes. The
 * node card runs this read on every brief, so it must stay off the network.
 */
export function catalogueDiagnostics(workspace: Workspace, base: CatalogueBase): string[] {
  const errors = [...base.errors]
  validateRegistryCatalogue(workspace, createCatalogueSources(workspace, base), errors)
  return errors
}

export function validateCatalogue(context: CatalogueContext): CatalogueValidation {
  const workspace = context.workspace
  const errors: string[] = []
  const warnings: string[] = []
  const fileKey = fileKeyFromSource(workspace) ?? ""
  const metadata = validateInventoryMetadata(workspace, context.inventory)
  errors.push(...metadata.errors)
  warnings.push(...metadata.warnings)
  const device = validateDeviceVocabulary(workspace, context.committed)
  errors.push(...device.errors)
  warnings.push(...device.warnings)
  // A renamed or moved node has no design change but its target still has to
  // move with it, so the coverage counts everything the delta touched.
  const deltaIds = new Set(context.delta ? deltaTouchedNodes(context.delta) : [])
  let deviceCoverage: CatalogueValidation["deviceCoverage"] = null
  if (device.policy) {
    const coverage = validateDeviceCoverage(
      workspace,
      device.policy,
      context.committed,
      context.registry,
      deltaIds,
    )
    errors.push(...coverage.errors)
    warnings.push(...coverage.warnings)
    deviceCoverage = coverage.stats
  }
  const cases = validateDeviceCases(workspace, device.policy, context.registry, context.committed)
  errors.push(...cases.result.errors)
  warnings.push(...cases.result.warnings)
  const surface = validatePageSurface(
    workspace,
    context.reconciledSurface,
    context.committed,
    context.registry,
    device.policy,
    fileKey,
  )
  errors.push(...surface.errors)
  warnings.push(...surface.warnings)
  const { entries, bulk } = validateRegistryCatalogue(workspace, context, errors)
  return {
    errors,
    warnings,
    fileKey,
    entries,
    bulkByPage: bulk.bulkByPage,
    bulkByNode: bulk.bulkByNode,
    devicePolicy: device.policy,
    deviceStats: device.stats,
    deviceCoverage,
    caseStats: cases.stats,
    surfaceStats: surface.stats,
    surfaceWaiting: surface.waiting,
    surfaceUnmirrored: surface.unmirrored,
    surfaceUncensused: surface.uncensused,
  }
}
