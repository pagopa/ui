import type { Workspace } from "../../adapters/workspace.ts"
import { createSourceModules } from "../../lib/source-modules.ts"
import type { CatalogueLoadContext } from "./load.ts"
import { collectPublicExports, storyImports, type SourceModules } from "./source.ts"
import { validateCatalogue, type CatalogueValidation } from "./validate.ts"

export type CatalogueContext = CatalogueLoadContext & {
  workspace: Workspace
  sourceModules: SourceModules
  publicExports: Map<string, string>
  storyImportsByFile: Map<string, Set<string>>
  allStoryImports: Set<string>
  /** The verdict on this context, attached to what it was derived from. */
  validation: CatalogueValidation
}

/** The context as the steps hand it on, before its verdict exists. */
export type CatalogueCandidate = Omit<CatalogueContext, "validation">

/** The workspace reads the registry, its stories and the public API share. */
export type CatalogueSources = Pick<
  CatalogueContext,
  | "registry"
  | "committed"
  | "sourceModules"
  | "storyImportsByFile"
  | "allStoryImports"
  | "evidenceExceptions"
  | "apiExceptions"
  | "publicExports"
>

// Split from `createCatalogueContext` so a hermetic reader — the node card's
// catalogue gate — walks the sources without a live export, a delta or a writer.
export function createCatalogueSources(
  workspace: Workspace,
  loaded: Pick<
    CatalogueLoadContext,
    "registry" | "committed" | "evidenceExceptions" | "apiExceptions"
  >,
): CatalogueSources {
  const sourceModules = createSourceModules(workspace)
  const storyImportsByFile = storyImports(workspace, sourceModules)
  const allStoryImports = new Set([...storyImportsByFile.values()].flatMap((names) => [...names]))
  return {
    registry: loaded.registry,
    committed: loaded.committed,
    evidenceExceptions: loaded.evidenceExceptions,
    apiExceptions: loaded.apiExceptions,
    sourceModules,
    publicExports: collectPublicExports(sourceModules),
    storyImportsByFile,
    allStoryImports,
  }
}

export function createCatalogueContext(
  workspace: Workspace,
  loaded: CatalogueLoadContext,
): CatalogueContext {
  const candidate: CatalogueCandidate = {
    ...loaded,
    workspace,
    ...createCatalogueSources(workspace, loaded),
  }
  return { ...candidate, validation: validateCatalogue(candidate) }
}
