import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import {
  DRIFT_CENSUS_ADDED_ID,
  DRIFT_CENSUS_EXPORT_PATH,
  DRIFT_CENSUS_REMOVED_ID,
  SCOPED_QUEUE_NODE_IDS,
  SURFACE_SYNC_CANDIDATE_ID,
  SURFACE_SYNC_EXPORT_PATH,
  SURFACE_SYNC_MISSING_COMPOSITION_ID,
  SURFACE_SYNC_PAGE_IDS,
  SURFACE_SYNC_UNPUBLISHED_ID,
  seedEvalWorkspace,
} from "../../../../.agents/skills/figma-to-code/harbor/environment/seed.ts"
import { compareSnapshots } from "../../src/figma/snapshot.ts"
import { readSurfaceTrees, syncPagesSurface } from "../../src/figma/surface-sync.ts"
import { fixtureTree, workspaceAt } from "../helpers/cli.mjs"

const COMMITTED_CATALOG = path.resolve(import.meta.dirname, "../../../pagopa-ui/src/catalog/figma")

function catalogText(name) {
  return fs.readFileSync(path.join(COMMITTED_CATALOG, name), "utf8")
}

test("seedEvalWorkspace stales scoped-queue nodes, writes exports and checks the JSON writer", async () => {
  const original = JSON.parse(catalogText("inventory.json"))
  const originalSurface = JSON.parse(catalogText("page-surface.json"))
  const tree = fixtureTree(
    {
      "packages/pagopa-ui/src/catalog/figma/file.ts": catalogText("file.ts"),
      "packages/pagopa-ui/src/catalog/figma/inventory.json": original,
      "packages/pagopa-ui/src/catalog/figma/page-surface.json": originalSurface,
      "packages/pagopa-ui/src/catalog/figma/registry.json": catalogText("registry.json"),
      "packages/pagopa-ui/src/catalog/figma/device-policy.json": catalogText("device-policy.json"),
    },
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

    const workspace = workspaceAt(path.join(tree.root, "packages/pagopa-ui"))
    const exportPath = path.join(tree.root, SURFACE_SYNC_EXPORT_PATH)
    const read = await readSurfaceTrees(workspace, [...SURFACE_SYNC_PAGE_IDS], {
      input: exportPath,
    })
    assert.deepEqual([...read.trees.keys()], [...SURFACE_SYNC_PAGE_IDS])

    const synced = await syncPagesSurface(workspace, {
      pageIds: [...SURFACE_SYNC_PAGE_IDS],
      trees: read.trees,
      now: "2026-11-26",
      dryRun: true,
      check: async () => ({ exitCode: 0, out: [], err: [] }),
    })
    const [overlayDiff, dividerDiff] = synced.pages
    assert.equal(overlayDiff.page.pageId, "1:23")
    assert.deepEqual(
      overlayDiff.added.map((item) => [item.nodeId, item.decision]),
      [[SURFACE_SYNC_UNPUBLISHED_ID, "unpublished"]],
    )
    assert.deepEqual(overlayDiff.removed, [])
    assert.deepEqual(overlayDiff.compositionCandidates, [
      {
        nodeId: SURFACE_SYNC_CANDIDATE_ID,
        name: "XS Mobile scrim",
        drawn: 1,
        width: 320,
        suggestedDevice: "mobile",
      },
    ])
    assert.deepEqual(overlayDiff.staleCompositions, [])
    assert.deepEqual(
      overlayDiff.unverifiedCompositions.map((item) => item.nodeId),
      [SURFACE_SYNC_MISSING_COMPOSITION_ID],
    )
    const expectedOverlay = originalSurface.pages.find((page) => page.pageId === "1:23")
    assert.deepEqual(overlayDiff.page.compositions, expectedOverlay.compositions)

    assert.equal(dividerDiff.page.pageId, "61:2777")
    assert.deepEqual(dividerDiff.added, [])
    assert.deepEqual(dividerDiff.removed, [])
    assert.deepEqual(dividerDiff.compositionCandidates, [])
    assert.deepEqual(dividerDiff.unverifiedCompositions, [])

    assert.equal(fs.existsSync(path.join(tree.root, "packages/ui-cli/.writer-check.json")), false)
  } finally {
    tree.dispose()
  }
})
