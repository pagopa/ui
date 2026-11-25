import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { compareSnapshots } from "../../../../../packages/ui-cli/src/figma/snapshot.ts"
import { readJson, writeJson } from "../../../../../packages/ui-cli/src/lib/json.ts"
import {
  InventorySchema,
  type Inventory,
  type InventoryNode,
} from "../../../../../packages/ui-cli/src/schemas/catalogue.ts"

export const SCOPED_QUEUE_NODE_IDS = ["1293:8394", "1333:16408"] as const
export const DRIFT_CENSUS_REMOVED_ID = "8868:42690"
export const DRIFT_CENSUS_ADDED_ID = "9999:1"
export const DRIFT_CENSUS_EXPORT_PATH = ".figma/drift-census-export.json"

const INVENTORY_PATH = "packages/pagopa-ui/src/catalog/figma/inventory.json"
const WRITER_CHECK_PATH = "packages/ui-cli/.writer-check.json"

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}

// The scoped-queue task asks about a delta on named nodes, and the live Figma
// file has not moved on them: without a delta the task's own criterion
// ("scoped, never widened") is unsatisfiable, because only `--full` can name
// the nodes. Staling the committed inventory on those two nodes makes the live
// read report them as changed without affecting the other tasks.
export function seedScopedQueueDelta(inventory: Inventory): Inventory {
  const seededSet = new Set<string>(SCOPED_QUEUE_NODE_IDS)
  const nextComponents: InventoryNode[] = inventory.components.map((node) =>
    seededSet.has(node.nodeId)
      ? { ...node, designFingerprint: sha256(`stale:${node.nodeId}`) }
      : node,
  )
  const changed = compareSnapshots(nextComponents, inventory.components)
    .changed.map((node) => node.nodeId)
    .sort()
  const expected = [...SCOPED_QUEUE_NODE_IDS].sort()
  if (changed.join(", ") !== expected.join(", ")) {
    throw new Error(
      `figma-to-code eval: the seeded delta is [${changed.join(", ")}], expected [${expected.join(", ")}]. The inventory schema or compare changed.`,
    )
  }
  return { ...inventory, components: nextComponents }
}

// Builds the offline export for the drift-census-reconciliation guardrail: one
// published leaf on a bulk-excluded page removed and one new published set
// added on the same page. Derived from the already-seeded inventory so the
// offline delta contains only those two changes.
export function buildDriftCensusExport(inventory: Inventory): {
  fileKey: string
  components: InventoryNode[]
} {
  const template = inventory.components.find((node) => node.nodeId === DRIFT_CENSUS_REMOVED_ID)
  if (!template) {
    throw new Error(
      `figma-to-code eval: expected ${DRIFT_CENSUS_REMOVED_ID} in inventory.json for ${DRIFT_CENSUS_EXPORT_PATH}`,
    )
  }
  const added: InventoryNode = {
    ...template,
    nodeId: DRIFT_CENSUS_ADDED_ID,
    name: "Native Sheet",
    assetKey: "eval-native-sheet-key",
    designFingerprint: sha256(`eval:${DRIFT_CENSUS_ADDED_ID}`),
    ...(template.variants
      ? {
          variants: template.variants.map((variant, index) => ({
            ...variant,
            nodeId: `9999:${index + 2}`,
            designFingerprint: sha256(`eval:9999:${index + 2}`),
          })),
        }
      : {}),
  }
  const components = [
    ...inventory.components.filter((node) => node.nodeId !== DRIFT_CENSUS_REMOVED_ID),
    added,
  ]
  const delta = compareSnapshots(inventory.components, components)
  if (
    delta.added.map((node) => node.nodeId).join(",") !== DRIFT_CENSUS_ADDED_ID ||
    delta.removed.map((node) => node.nodeId).join(",") !== DRIFT_CENSUS_REMOVED_ID ||
    delta.changed.length !== 0
  ) {
    throw new Error(`figma-to-code eval: unexpected ${DRIFT_CENSUS_EXPORT_PATH} delta`)
  }
  return { fileKey: inventory.fileKey, components }
}

// Every command that records state goes through the JSON writer, and `figma
// status` never reaches it, so the writer gets its own fail-fast round-trip
// check. It needs no Figma token and leaves nothing behind.
export function verifyJsonWriter(workspaceRoot: string): void {
  const file = path.join(workspaceRoot, WRITER_CHECK_PATH)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  try {
    writeJson(file, { ok: true })
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"))
    if (typeof parsed !== "object" || parsed === null || !("ok" in parsed) || parsed.ok !== true) {
      throw new Error("figma-to-code eval: the ui-cli JSON writer returned unexpected content")
    }
  } finally {
    fs.rmSync(file, { force: true })
  }
}

export function seedEvalWorkspace(workspaceRoot: string): void {
  const inventoryFile = path.join(workspaceRoot, INVENTORY_PATH)
  const original = readJson(inventoryFile, InventorySchema)
  const seeded = seedScopedQueueDelta(original)
  fs.writeFileSync(inventoryFile, `${JSON.stringify(seeded, null, 2)}\n`)

  const driftExport = buildDriftCensusExport(seeded)
  const driftFile = path.join(workspaceRoot, DRIFT_CENSUS_EXPORT_PATH)
  fs.mkdirSync(path.dirname(driftFile), { recursive: true })
  fs.writeFileSync(driftFile, `${JSON.stringify(driftExport, null, 2)}\n`)

  verifyJsonWriter(workspaceRoot)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedEvalWorkspace(process.argv[2] ?? process.cwd())
}
