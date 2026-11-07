import type { Workspace } from "../../adapters/workspace.ts"
import { createSourceModules } from "../../lib/source-modules.ts"
import type { CatalogueLoadContext } from "./load.ts"
import { collectPublicExports, storyImports, type SourceModules } from "./source.ts"

export type CatalogueContext = CatalogueLoadContext & {
  workspace: Workspace
  sourceModules: SourceModules
  publicExports: Map<string, string>
  storyImportsByFile: Map<string, Set<string>>
  allStoryImports: Set<string>
}

export function createCatalogueContext(
  workspace: Workspace,
  loaded: CatalogueLoadContext,
): CatalogueContext {
  const sourceModules = createSourceModules(workspace)
  const storyImportsByFile = storyImports(workspace, sourceModules)
  const allStoryImports = new Set([...storyImportsByFile.values()].flatMap((names) => [...names]))
  return {
    ...loaded,
    workspace,
    sourceModules,
    publicExports: collectPublicExports(sourceModules),
    storyImportsByFile,
    allStoryImports,
  }
}
