#!/usr/bin/env node
// Figma catalogue validation and refresh domain.
//
// Static checks (no network, run in CI):
//   node src/cli.ts check catalogue
//     - inventory/registry/file-key consistency and published-node accounting
//     - page-surface census and composition evidence
//     - implemented targets, stories and public API coverage
//     - icon/pictogram public names cover manifest identities node-for-node
//     - warns when the inventory snapshot is older than 30 days
//
// Read-only drift check against a pinned export:
//   node src/cli.ts check catalogue --input .figma/live-rest.json
//
// Print a machine-readable plan, reading REST by default:
//   node src/cli.ts figma plan [--input .figma/live-rest.json]
//
// Refresh the committed inventory from a pinned export:
//   node src/cli.ts update inventory --input .figma/live-rest.json
//
// Refresh and queue new/changed/affected implementations for review:
//   node src/cli.ts figma triage --input .figma/live-rest.json
// Mocked demos retain their status and note and are not queued. Merging the
// drift PR is the review record.
//
// PR mode for the scheduled drift job:
//   node src/cli.ts update inventory --rest --pr-body .figma/pr-body.md
// The PR body is written only when the live snapshot has drift. The Figma side
// is never written to; mappings stay in the repository, keyed by nodeId.
import type { Workspace } from "../adapters/workspace.ts"
import { loadCatalogue } from "./catalogue/load.ts"
import { validateCatalogue } from "./catalogue/validate.ts"
import { createCatalogueContext } from "./catalogue/context.ts"
import { finishCatalogue } from "./catalogue/finish.ts"
import type { PageSurface } from "../schemas/catalogue.ts"

export interface CatalogueOptions {
  input?: string
  rest?: boolean
  plan?: boolean
  write?: boolean
  triage?: boolean
  prBody?: string
  save?: string
  delta?: string
  evidenceBase?: string
  token?: string
  surface?: PageSurface
}

export interface CatalogueReport {
  exitCode: number
  out: string[]
  err: string[]
}

export async function syncCatalogue(
  workspace: Workspace,
  options: CatalogueOptions = {},
): Promise<CatalogueReport> {
  const loaded = await loadCatalogue(workspace, options)
  if (!loaded.context) {
    return { exitCode: loaded.exitCode ?? 1, out: loaded.out ?? [], err: loaded.err ?? [] }
  }
  const context = createCatalogueContext(workspace, loaded.context)
  const validation = validateCatalogue(context)
  return finishCatalogue(context, validation, Boolean(options.plan))
}
