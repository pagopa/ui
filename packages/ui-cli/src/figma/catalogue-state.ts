import fs from "node:fs"

import type { Workspace } from "../adapters/workspace.ts"
import {
  COMMITTED_FILES,
  committedFile,
  readInventory,
  readRegistry,
} from "../records/committed.ts"
import type { Inventory, Registry } from "../schemas/catalogue.ts"

export interface CatalogueStateReport {
  inventory: Inventory | null
  registry: Registry | null
  errors: string[]
}

export function loadCatalogueState(workspace: Workspace): CatalogueStateReport {
  const errors: string[] = []
  const inventoryFile = committedFile("inventory", workspace.root)
  const registryFile = committedFile("registry", workspace.root)
  if (!fs.existsSync(inventoryFile)) {
    errors.push(`missing ${COMMITTED_FILES.inventory} (run with --write and a live export)`)
  }
  if (!fs.existsSync(registryFile)) errors.push(`missing ${COMMITTED_FILES.registry}`)
  if (errors.length) return { inventory: null, registry: null, errors }
  return {
    inventory: readInventory(workspace.root),
    registry: readRegistry(workspace.root),
    errors,
  }
}
