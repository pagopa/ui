import fs from "node:fs"

import type { Workspace } from "../adapters/workspace.ts"
import { readJson } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import {
  InventorySchema,
  RegistrySchema,
  type Inventory,
  type Registry,
} from "../schemas/catalogue.ts"

export const INVENTORY_PATH = "src/catalog/figma/inventory.json"
export const REGISTRY_PATH = "src/catalog/figma/registry.json"

export interface CatalogueStateReport {
  inventory: Inventory | null
  registry: Registry | null
  errors: string[]
}

export function loadCatalogueState(workspace: Workspace): CatalogueStateReport {
  const errors: string[] = []
  const inventoryFile = workspace.path(INVENTORY_PATH)
  const registryFile = workspace.path(REGISTRY_PATH)
  if (!fs.existsSync(inventoryFile)) {
    errors.push(`missing ${INVENTORY_PATH} (run with --write and a live export)`)
  }
  if (!fs.existsSync(registryFile)) errors.push(`missing ${REGISTRY_PATH}`)
  if (errors.length) return { inventory: null, registry: null, errors }
  return {
    inventory: parseSchema(InventorySchema, readJson(inventoryFile), INVENTORY_PATH),
    registry: parseSchema(RegistrySchema, readJson(registryFile), REGISTRY_PATH),
    errors,
  }
}
