import assert from "node:assert/strict"
import path from "node:path"
import { test } from "node:test"

import { prepareCatalogueRefresh } from "../../src/figma/catalogue-refresh.ts"
import { loadCatalogueState } from "../../src/figma/catalogue-state.ts"
import { storyImports } from "../../src/figma/catalogue/source.ts"
import { createSourceModules } from "../../src/lib/source-modules.ts"
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

function baseFiles() {
  return {
    "src/catalog/figma/inventory.json": {
      fileKey: "fixture",
      syncedAt: "2026-01-01",
      components: [node],
    },
    "src/catalog/figma/registry.json": {
      entries: { "1:1": { status: "excluded", reason: "Fixture-only control" } },
      bulkRules: [],
    },
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

// A one-node refresh of the fixture, so a note's fate is all the test reads.
function renewNote(files, entry, prefix) {
  const tree = fixtureTree(files, prefix)
  try {
    const workspace = workspaceAt(tree.root)
    const liveNode = { ...node, name: "Control v2" }
    const report = prepareCatalogueRefresh(workspace, {
      inventory: loadCatalogueState(workspace).inventory,
      registry: { entries: { "1:1": entry }, bulkRules: [] },
      live: [liveNode],
      delta: {
        added: [],
        removed: [],
        changed: [liveNode],
        changedVariants: [],
        renamed: [],
        moved: [],
        baseline: [],
        affected: [],
      },
      evidenceExceptions: {},
      noteBaseline: null,
    })
    return { note: report.registry.entries["1:1"].note, notices: report.notices }
  } finally {
    tree.dispose()
  }
}

test("renewing a note that holds only the renewal line loses nothing and says nothing", () => {
  const previous =
    "Figma delta 2026-01-01: review new/changed node or dependency before marking implemented"
  const { note, notices } = renewNote(
    baseFiles(),
    { status: "implemented", note: previous },
    "catalogue-renew-quiet-",
  )
  assert.match(note, /^Figma delta \d{4}-\d{2}-\d{2}:/)
  assert.deepEqual(notices, [])
})

test("renewing a note keeps its open question and reports the text it discards", () => {
  const { note, notices } = renewNote(
    baseFiles(),
    {
      status: "implemented",
      note: "Figma delta 2026-01-01: review new/changed node or dependency before marking implemented. Open design question: docs/design-requests/2026-01-02-ring.md. Depends on the card work.",
    },
    "catalogue-renew-residue-",
  )
  assert.match(note, /Open design question: docs\/design-requests\/2026-01-02-ring\.md$/)
  assert.equal(notices.length, 1)
  assert.match(notices[0], /^1:1 renewed: its note dropped "Depends on the card work\." — /)
})

test("a renewal reads pointers from the folder the config declares", () => {
  const { note, notices } = renewNote(
    {
      ...baseFiles(),
      "figma-to-code.yaml": "design:\n  requests: design/questions\n",
    },
    {
      status: "implemented",
      note: "Open design question: design/questions/2026-01-02-ring.md",
    },
    "catalogue-renew-folder-",
  )
  assert.match(note, /Open design question: design\/questions\/2026-01-02-ring\.md$/)
  assert.deepEqual(notices, [])
})

test("a note that only quotes the renewal sentence keeps it as prose", () => {
  const quoted = `Prior run said: ${"Figma delta 2026-01-01: review new/changed node or dependency before marking implemented"}`
  const { notices } = renewNote(
    baseFiles(),
    { status: "implemented", note: quoted },
    "catalogue-renew-quoted-",
  )
  assert.deepEqual(notices, [
    `1:1 renewed: its note dropped "Prior run said: Figma delta 2026-01-01: review new/changed node or dependency before marking implemented" — carry anything still owed into the new note`,
  ])
})

test("catalogue state loading reads the inventory and registry from the workspace", () => {
  const tree = fixtureTree(baseFiles(), "catalogue-state-")
  try {
    const report = loadCatalogueState(workspaceAt(tree.root))
    assert.deepEqual(report.errors, [])
    assert.equal(report.inventory.fileKey, "fixture")
    assert.equal(report.inventory.components[0].nodeId, "1:1")
    assert.equal(report.registry.entries["1:1"].status, "excluded")
  } finally {
    tree.dispose()
  }
})

test("inventory refresh queues changed implementations and returns proposed writes", () => {
  const tree = fixtureTree(baseFiles(), "catalogue-refresh-")
  try {
    const workspace = workspaceAt(tree.root)
    const state = loadCatalogueState(workspace)
    const liveNode = { ...node, name: "Control v2" }
    const report = prepareCatalogueRefresh(workspace, {
      inventory: state.inventory,
      registry: {
        entries: { "1:1": { status: "implemented", note: "Reviewed" } },
        bulkRules: [],
      },
      live: [liveNode],
      delta: {
        added: [],
        removed: [],
        changed: [liveNode],
        changedVariants: [],
        renamed: [],
        moved: [],
        baseline: [],
        affected: [],
      },
      evidenceExceptions: { "1:1": "Temporary exception" },
      noteBaseline: null,
    })
    assert.equal(report.inventory.components[0].name, "Control v2")
    assert.equal(report.registry.entries["1:1"].status, "pending")
    assert.match(report.registry.entries["1:1"].note, /^Figma delta \d{4}-\d{2}-\d{2}:/)
    assert.deepEqual(report.evidenceExceptions, {})
    assert.deepEqual(
      [...report.pendingWrites.keys()],
      [
        "src/catalog/figma/inventory.json",
        "src/catalog/figma/registry.json",
        "src/catalog/figma/evidence-exceptions.json",
      ],
    )
  } finally {
    tree.dispose()
  }
})

test("catalogue CLI reports drift on stderr with exit code 3", async () => {
  const tree = fixtureTree(
    {
      ...baseFiles(),
      "src/catalog/figma/registry.json": {
        entries: { "1:1": { status: "excluded", reason: "Fixture-only control" } },
        bulkRules: [],
      },
      "live.json": JSON.stringify([{ ...node, name: "Renamed control" }]),
    },
    "catalogue-cli-",
  )
  try {
    const result = await runCli(["check", "catalogue", "--input", "live.json"], {
      root: tree.root,
      env: { PAGOPA_UI_STORIES_ROOT: "src/catalog/figma" },
    })
    assert.equal(result.status, 3, result.stderr)
    assert.match(result.stdout, /^inventory: 1 nodes \| excluded 1/m)
    assert.match(result.stderr, /RENAMED nodes \(1\):/)
    assert.match(result.stderr, /1:1  Renamed control/)
  } finally {
    tree.dispose()
  }
})

test("catalogue CLI preserves success, failure and usage contracts", async () => {
  const missing = fixtureTree({ "pnpm-workspace.yaml": "packages: []\n" }, "catalogue-empty-")
  try {
    const result = await runCli(["check", "catalogue"], {
      root: missing.root,
      env: { PAGOPA_UI_STORIES_ROOT: "src/catalog/figma" },
    })
    assert.equal(result.status, 1)
    assert.equal(result.stdout, "")
    assert.match(result.stderr, /missing src\/catalog\/figma\/inventory\.json/)
  } finally {
    missing.dispose()
  }

  const valid = fixtureTree(
    {
      ...baseFiles(),
      "live.json": JSON.stringify([node]),
    },
    "catalogue-valid-",
  )
  try {
    const result = await runCli(["check", "catalogue", "--input", "live.json"], {
      root: valid.root,
      env: { PAGOPA_UI_STORIES_ROOT: "src/catalog/figma" },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /^inventory: 1 nodes \\| excluded 1/m)
    assert.match(result.stderr, /warn: inventory snapshot is \d+ days old/)
  } finally {
    valid.dispose()
  }

  const usage = await runCli(["check", "catalogue", "--input", "live.json", "--rest"], {
    root: valid.root,
  })
  assert.equal(usage.status, 2)
  assert.equal(usage.stdout, "")
  assert.equal(usage.stderr, "error: choose either --input <file> or --rest")
})

test("story imports ignore dependency and cache directories under the stories root", () => {
  const tree = fixtureTree({
    ...baseFiles(),
    "stories/control.stories.tsx": "export default {}",
    "stories/node_modules/dep/leak.stories.tsx": "export default {}",
    "stories/.cache/fixture/leak.stories.tsx": "export default {}",
  })
  try {
    const workspace = workspaceAt(tree.root, { PAGOPA_UI_STORIES_ROOT: "stories" })
    const imports = storyImports(workspace, createSourceModules(workspace))
    assert.deepEqual(
      [...imports.keys()].map((file) => path.basename(file)),
      ["control.stories.tsx"],
    )
  } finally {
    tree.dispose()
  }
})
