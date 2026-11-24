// The catalogue workflow's two doors. The module is imported directly: the run
// door answers with the report a command prints, the read door with the
// diagnostics the node card shows. The command contract is asserted through the
// CLI helper, so the report a caller receives stays the report the CLI prints.
import assert from "node:assert/strict"
import { test } from "node:test"

import { readCatalogueDiagnostics, syncCatalogue } from "../../src/figma/catalogue/index.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

const node = {
  nodeId: "1:1",
  name: "Control",
  type: "COMPONENT_SET",
  pageId: "1:0",
  pageName: "Controls",
  properties: {
    Size: { type: "VARIANT", defaultValue: "Small", variantOptions: ["Small", "Large"] },
  },
  dependencies: [],
}

function files(registry) {
  return {
    "src/catalog/figma/inventory.json": {
      fileKey: "fixture",
      syncedAt: "2026-01-01",
      components: [node],
    },
    "src/catalog/figma/registry.json": registry,
    "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "fixture"',
    "src/catalog/figma/evidence-exceptions.json": { storyEvidence: {} },
    "src/catalog/figma/api-exceptions.json": { modulePatterns: {}, exports: {} },
    "src/catalog/figma/device-policy.json": {
      axes: [],
      any: ["Any", "Default"],
      devices: {
        mobile: { canonicalWidth: 320, defaultLayoutScope: "viewport", aliases: ["Mobile"] },
      },
    },
    "src/catalog/figma/page-surface.json": {
      fileKey: "fixture",
      readAt: "2026-01-01",
      note: "Fixture census.",
      pages: [],
    },
    "src/components/icons/figma-inventory.ts":
      "export const figmaIconNames = [] as const\nexport const figmaPictogramNames = [] as const",
    "src/pagopa-ui.ts": "",
  }
}

const cleanRegistry = {
  entries: { "1:1": { status: "excluded", reason: "Fixture-only control" } },
  bulkRules: [],
}

// The diagnostic the card shows is the module's diagnostic with the card's own
// `catalogue ` prefix in front of it, so the assertions here are on the line
// itself: one broken entry names the node, the fault and the repair.
test("the read door returns the diagnostics a broken registry entry produces", () => {
  const tree = fixtureTree(
    {
      ...files({
        entries: {
          "1:1": {
            status: "implemented",
            target: { module: "src/components/widget.tsx", export: "Widget" },
          },
        },
        bulkRules: [],
      }),
      "src/components/widget.tsx": "export const Other = 1\n",
    },
    "catalogue-read-",
  )
  try {
    assert.deepEqual(readCatalogueDiagnostics(workspaceAt(tree.root)), [
      'registry 1:1: export "Widget" not found in src/components/widget.tsx — fix target.export, then run `pnpm nx run pagopa-ui:check:catalogue`',
      "registry 1:1: implemented requires target.story — add the story that renders the component, then run `pnpm nx run pagopa-ui:check:catalogue`",
    ])
  } finally {
    tree.dispose()
  }
})

test("the read door reports no diagnostic for a registry that holds", () => {
  const tree = fixtureTree(files(cleanRegistry), "catalogue-read-clean-")
  try {
    assert.deepEqual(readCatalogueDiagnostics(workspaceAt(tree.root)), [])
  } finally {
    tree.dispose()
  }
})

test("the run door returns the plan report a caller prints", async () => {
  const tree = fixtureTree(
    { ...files(cleanRegistry), "live.json": JSON.stringify([node]) },
    "catalogue-run-",
  )
  try {
    const report = await syncCatalogue(workspaceAt(tree.root), { plan: true, input: "live.json" })
    assert.equal(report.exitCode, 0)
    assert.deepEqual(report.err, [])
    assert.equal(report.out.length, 1)
    const plan = JSON.parse(report.out[0])
    assert.deepEqual(plan.added, [])
    assert.deepEqual(plan.pending, [])
    assert.deepEqual(plan.surfaceUncensused, [{ pageId: "1:0", pageName: "Controls", nodes: 1 }])
    assert.deepEqual(plan.unverifiedDesign, ["1:1"])
  } finally {
    tree.dispose()
  }
})

// RD4 at the boundary it promises: a corrupt committed record is the
// repository's state, not a mistyped command, so the run exits 1 — never 2 —
// and the diagnostic names the document and the reason a person repairs.
test("a corrupt registry exits 1 and names the file and the reason", async () => {
  const tree = fixtureTree(
    {
      ...files({ entries: {}, bulkRules: [], surprise: true }),
      "live.json": JSON.stringify([node]),
    },
    "catalogue-corrupt-",
  )
  try {
    const cli = await runCli(["figma", "plan", "--input", "live.json"], { root: tree.root })
    assert.equal(cli.status, 1)
    assert.match(cli.stderr, /src\/catalog\/figma\/registry\.json/)
    assert.match(cli.stderr, /unknown key "surprise"/)
  } finally {
    tree.dispose()
  }
})

test("the plan command prints exactly the report the run door returns", async () => {
  const tree = fixtureTree(
    { ...files(cleanRegistry), "live.json": JSON.stringify([node]) },
    "catalogue-run-cli-",
  )
  try {
    const env = { PAGOPA_UI_STORIES_ROOT: "src/catalog/figma" }
    const report = await syncCatalogue(workspaceAt(tree.root), { plan: true, input: "live.json" })
    const cli = await runCli(["figma", "plan", "--input", "live.json"], { root: tree.root, env })
    assert.equal(cli.status, report.exitCode)
    assert.equal(cli.stdout, report.out.join("\n"))
    assert.equal(cli.stderr, report.err.join("\n"))
  } finally {
    tree.dispose()
  }
})

test("triage removes deleted published identities and records bulk-excluded additions in the page census", async () => {
  const excludedBulkNode = {
    ...node,
    nodeId: "2:2",
    name: "New excluded helper",
    pageId: "2:0",
    pageName: "Excluded page",
  }
  const tree = fixtureTree(
    {
      ...files({
        entries: { "1:1": { status: "excluded", reason: "Fixture-only control" } },
        bulkRules: [{ pageId: "2:0", status: "excluded", reason: "Legacy scratch page" }],
      }),
      "src/catalog/figma/page-surface.json": {
        fileKey: "fixture",
        readAt: "2026-01-01",
        note: "Fixture census.",
        pages: [
          {
            pageId: "1:0",
            pageName: "Controls",
            identities: [
              {
                nodeId: "1:1",
                name: "Control",
                kind: "COMPONENT_SET",
                inLibrary: true,
                decision: "excluded",
                reason: "Fixture-only control",
              },
              {
                nodeId: "1:9",
                name: "Local helper",
                kind: "COMPONENT",
                inLibrary: false,
                decision: "unpublished",
              },
            ],
            compositions: [],
          },
          {
            pageId: "2:0",
            pageName: "Excluded page",
            identities: [],
            compositions: [],
          },
        ],
      },
      "live.json": JSON.stringify([excludedBulkNode]),
    },
    "catalogue-surface-reconcile-",
  )
  try {
    const ws = workspaceAt(tree.root)
    const triaged = await syncCatalogue(ws, {
      input: "live.json",
      write: true,
      triage: true,
    })
    assert.equal(triaged.exitCode, 0, triaged.err.join("\n"))
    const fs = await import("node:fs")
    const surface = JSON.parse(
      fs.readFileSync(`${tree.root}/src/catalog/figma/page-surface.json`, "utf8"),
    )
    const controls = surface.pages.find((page) => page.pageId === "1:0")
    assert.deepEqual(
      controls.identities.map((entry) => entry.nodeId),
      ["1:9"],
      "removed published node is dropped while unpublished helper stays",
    )
    const excludedPage = surface.pages.find((page) => page.pageId === "2:0")
    assert.equal(excludedPage.identities.length, 1)
    assert.equal(excludedPage.identities[0].nodeId, "2:2")
    assert.equal(excludedPage.identities[0].decision, "excluded")
    assert.equal(excludedPage.identities[0].reason, "Legacy scratch page")
    assert.deepEqual(readCatalogueDiagnostics(ws), [])
  } finally {
    tree.dispose()
  }
})

test("triage does not silently drop inLibrary census identities outside delta.removed", async () => {
  const tree = fixtureTree(
    {
      ...files(cleanRegistry),
      "src/catalog/figma/page-surface.json": {
        fileKey: "fixture",
        readAt: "2026-01-01",
        note: "Fixture census.",
        pages: [
          {
            pageId: "1:0",
            pageName: "Controls",
            identities: [
              {
                nodeId: "1:1",
                name: "Control",
                kind: "COMPONENT_SET",
                inLibrary: true,
                decision: "excluded",
                reason: "Fixture-only control",
              },
              {
                nodeId: "1:8",
                name: "Out-of-delta published helper",
                kind: "COMPONENT",
                inLibrary: true,
                decision: "excluded",
                reason: "Not present in committed inventory",
              },
            ],
            compositions: [],
          },
        ],
      },
      "live.json": JSON.stringify([node]),
    },
    "catalogue-surface-guard-",
  )
  try {
    const triaged = await syncCatalogue(workspaceAt(tree.root), {
      input: "live.json",
      write: true,
      triage: true,
    })
    assert.equal(triaged.exitCode, 1)
    assert.match(
      triaged.err.join("\n"),
      /1:8 Out-of-delta published helper is marked in the library but the inventory does not publish it/,
    )
  } finally {
    tree.dispose()
  }
})
