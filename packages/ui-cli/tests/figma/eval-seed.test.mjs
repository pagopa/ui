import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import {
  DRIFT_CENSUS_ADDED_ID,
  DRIFT_CENSUS_EXPORT_PATH,
  DRIFT_CENSUS_REMOVED_ID,
  SCOPED_QUEUE_NODE_IDS,
  seedEvalWorkspace,
} from "../../../../.agents/skills/figma-to-code/harbor/environment/seed.ts"
import { compareSnapshots } from "../../src/figma/snapshot.ts"
import { fixtureTree } from "../helpers/cli.mjs"

const COMMITTED_INVENTORY = path.resolve(
  import.meta.dirname,
  "../../../pagopa-ui/src/catalog/figma/inventory.json",
)

test("seedEvalWorkspace stales scoped-queue nodes, writes drift-census export and checks the JSON writer", () => {
  const original = JSON.parse(fs.readFileSync(COMMITTED_INVENTORY, "utf8"))
  const tree = fixtureTree(
    { "packages/pagopa-ui/src/catalog/figma/inventory.json": original },
    "figma-eval-seed-",
  )
  try {
    seedEvalWorkspace(tree.root)

    const seeded = JSON.parse(
      fs.readFileSync(
        path.join(tree.root, "packages/pagopa-ui/src/catalog/figma/inventory.json"),
        "utf8",
      ),
    )
    const scopedDelta = compareSnapshots(seeded.components, original.components)
    assert.deepEqual(
      scopedDelta.changed.map((node) => node.nodeId).sort(),
      [...SCOPED_QUEUE_NODE_IDS].sort(),
    )

    const driftExport = JSON.parse(
      fs.readFileSync(path.join(tree.root, DRIFT_CENSUS_EXPORT_PATH), "utf8"),
    )
    const driftDelta = compareSnapshots(seeded.components, driftExport.components)
    assert.deepEqual(
      driftDelta.added.map((node) => node.nodeId),
      [DRIFT_CENSUS_ADDED_ID],
    )
    assert.deepEqual(
      driftDelta.removed.map((node) => node.nodeId),
      [DRIFT_CENSUS_REMOVED_ID],
    )
    assert.deepEqual(driftDelta.changed, [])
    assert.equal(fs.existsSync(path.join(tree.root, "packages/ui-cli/.writer-check.json")), false)
  } finally {
    tree.dispose()
  }
})
