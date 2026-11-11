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
import type { Workspace } from "../../adapters/workspace.ts"
import type { PageSurface } from "../../schemas/catalogue.ts"
import { createCatalogueContext } from "./context.ts"
import { finishCatalogue } from "./finish.ts"
import { loadCatalogue, loadCatalogueBase } from "./load.ts"
import { registryDiagnostics } from "./validate.ts"

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

/**
 * The workflow's run door: load the committed records and the live source,
 * refresh what the run asks to refresh, validate the result and write the
 * handoff. The steps' handoff stays internal, so a caller cannot assemble half
 * a run and call it the workflow.
 */
export async function syncCatalogue(
  workspace: Workspace,
  options: CatalogueOptions = {},
): Promise<CatalogueReport> {
  const loaded = await loadCatalogue(workspace, options)
  if (!loaded.context) {
    return { exitCode: loaded.exitCode ?? 1, out: loaded.out ?? [], err: loaded.err ?? [] }
  }
  const context = createCatalogueContext(workspace, loaded.context)
  return finishCatalogue(context, Boolean(options.plan))
}

/**
 * The workflow's read door: the registry's hermetic diagnostics, with no live
 * export, no delta and no writes. The node card runs it on every brief, so it
 * must stay off the network; an unreadable record throws.
 */
export function readCatalogueDiagnostics(workspace: Workspace): string[] {
  return registryDiagnostics(workspace, loadCatalogueBase(workspace))
}
