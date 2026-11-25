import assert from "node:assert/strict"
import { test } from "node:test"
import { fixtureTree, workspaceAt } from "../helpers/cli.mjs"
import {
  planSurfaceSync,
  selectSurfacePages,
  syncPageSurface,
  syncPagesSurface,
} from "../../src/figma/surface-sync.ts"

const metadata = {
  id: "1:1",
  name: "Components",
  type: "CANVAS",
  children: [
    { id: "4:4", name: "Button", type: "COMPONENT" },
    { id: "4:5", name: "Unpublished helper", type: "COMPONENT_SET" },
    {
      id: "6:6",
      name: "Composition",
      type: "FRAME",
      children: [{ id: "4:4", name: "Button", type: "COMPONENT" }],
    },
  ],
}

const files = {
  "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "file-key"\n',
  "src/catalog/figma/inventory.json": {
    fileKey: "file-key",
    syncedAt: "2026-01-01",
    components: [
      { nodeId: "4:4", name: "Button", type: "COMPONENT", pageId: "1:1", pageName: "Components" },
    ],
  },
  "src/catalog/figma/registry.json": {
    entries: {
      "4:4": {
        status: "implemented",
        target: {
          module: "src/button.ts",
          export: "Button",
          story: "button.stories.tsx",
          storyExports: ["Default"],
        },
      },
    },
    bulkRules: [],
  },
  "src/catalog/figma/page-surface.json": {
    fileKey: "file-key",
    readAt: "2026-01-01",
    note: "Existing census note.",
    pages: [
      {
        pageId: "1:1",
        pageName: "Old page name",
        identities: [
          {
            nodeId: "4:4",
            name: "Old button name",
            kind: "COMPONENT",
            inLibrary: true,
            decision: "shipped",
            reason: "Preserve this reason.",
          },
        ],
        compositions: [
          {
            nodeId: "6:6",
            name: "Example",
            device: "desktop",
            drawn: 1,
            mirrors: [],
            reason: "No reviewed case.",
          },
        ],
      },
    ],
  },
}

test("surface sync preserves reviewed identities and compositions, adding tree identities", () => {
  const fixture = fixtureTree(files, "surface-sync-plan-")
  try {
    const result = planSurfaceSync(workspaceAt(fixture.root), "1:1", metadata, "2026-02-02")
    const page = result.surface.pages[0]
    assert.equal(page.pageName, "Components")
    assert.equal(page.identities[0].name, "Button")
    assert.equal(page.identities[0].decision, "shipped")
    assert.equal(page.identities[0].reason, "Preserve this reason.")
    assert.equal(page.identities[1].nodeId, "4:5")
    assert.equal(page.identities[1].inLibrary, false)
    assert.equal(page.identities[1].decision, "unpublished")
    assert.deepEqual(
      page.compositions,
      files["src/catalog/figma/page-surface.json"].pages[0].compositions,
    )
    assert.equal(result.added.length, 1)
    assert.equal(result.surface.readAt, "2026-02-02")
  } finally {
    fixture.dispose()
  }
})

test("surface sync locates the requested page in an exported page array", () => {
  const fixture = fixtureTree(files, "surface-sync-pages-")
  try {
    const result = planSurfaceSync(
      workspaceAt(fixture.root),
      "1:1",
      [{ id: "2:2", name: "Other page", type: "CANVAS", children: [] }, metadata],
      "2026-02-02",
    )
    assert.equal(result.page.pageId, "1:1")
    assert.deepEqual(
      result.page.identities.map((identity) => identity.nodeId),
      ["4:4", "4:5"],
    )
  } finally {
    fixture.dispose()
  }
})

test("surface sync checks the candidate and writes only when not dry-running", async () => {
  const fixture = fixtureTree(files, "surface-sync-write-")
  const workspace = workspaceAt(fixture.root)
  const checks = []
  try {
    const dryRun = await syncPageSurface(workspace, {
      pageId: "1:1",
      tree: metadata,
      now: "2026-02-02",
      dryRun: true,
      check: async (surface) => {
        checks.push(surface)
        return { exitCode: 0, out: ["catalogue: pass"], err: [] }
      },
    })
    assert.equal(dryRun.dryRun, true)
    assert.equal(checks.length, 1)
    assert.equal(checks[0].pages[0].identities.length, 2)
    assert.equal(
      JSON.parse(
        await (
          await import("node:fs/promises")
        ).readFile(`${fixture.root}/src/catalog/figma/page-surface.json`, "utf8"),
      ).pages[0].identities.length,
      1,
    )

    const live = await syncPageSurface(workspace, {
      pageId: "1:1",
      tree: metadata,
      now: "2026-02-02",
      dryRun: false,
      check: async () => ({ exitCode: 0, out: [], err: [] }),
    })
    assert.equal(live.dryRun, false)
    const written = JSON.parse(
      (await import("node:fs")).readFileSync(
        `${fixture.root}/src/catalog/figma/page-surface.json`,
        "utf8",
      ),
    )
    assert.equal(written.pages[0].identities.length, 2)
  } finally {
    fixture.dispose()
  }
})

test("surface sync discovers unrecorded composition candidates and flags stale compositions", () => {
  const devicePolicy = {
    axes: ["Device"],
    any: ["Any"],
    devices: {
      mobile: { canonicalWidth: 320, defaultLayoutScope: "viewport", aliases: ["Mobile"] },
      tablet: { canonicalWidth: 600, defaultLayoutScope: "viewport", aliases: ["Tablet"] },
      desktop: { canonicalWidth: 1200, defaultLayoutScope: "viewport", aliases: ["Desktop"] },
    },
  }
  const treeWithCompositions = {
    id: "1:1",
    name: "Components",
    type: "CANVAS",
    children: [
      { id: "4:4", name: "Button", type: "COMPONENT" },
      {
        id: "50:1",
        name: ".Regole",
        type: "INSTANCE",
        children: [{ id: "50:2", name: "Button", type: "INSTANCE", componentId: "4:4" }],
      },
      {
        id: "7:1",
        name: "Checkout section",
        type: "SECTION",
        children: [
          {
            id: "7:2",
            name: "Mobile checkout",
            type: "FRAME",
            absoluteBoundingBox: { x: 0, y: 0, width: 320, height: 640 },
            children: [
              { id: "7:3", name: "Primary CTA", type: "INSTANCE", componentId: "4:4" },
              { id: "7:4", name: "Secondary CTA", type: "INSTANCE", componentId: "4:4" },
            ],
          },
          {
            id: "7:5",
            name: "Wide board",
            type: "FRAME",
            absoluteBoundingBox: { x: 400, y: 0, width: 1280, height: 800 },
            children: [{ id: "7:6", name: "Header CTA", type: "INSTANCE", componentId: "4:4" }],
          },
        ],
      },
    ],
  }
  const fixture = fixtureTree(
    {
      ...files,
      "src/catalog/figma/device-policy.json": devicePolicy,
    },
    "surface-sync-compositions-",
  )
  try {
    const result = planSurfaceSync(
      workspaceAt(fixture.root),
      "1:1",
      treeWithCompositions,
      "2026-02-02",
    )
    // Recorded composition 6:6 is no longer in treeWithCompositions -> flagged stale.
    assert.deepEqual(
      result.staleCompositions.map((item) => item.nodeId),
      ["6:6"],
    )
    // .Regole is skipped; both frames inside SECTION are discovered with counts and devices.
    assert.deepEqual(result.compositionCandidates, [
      {
        nodeId: "7:2",
        name: "Mobile checkout",
        drawn: 2,
        width: 320,
        suggestedDevice: "mobile",
      },
      {
        nodeId: "7:5",
        name: "Wide board",
        drawn: 1,
        width: 1280,
        suggestedDevice: "desktop",
      },
    ])
    // Reviewed compositions remain untouched in page-surface.json (never auto-invented).
    assert.deepEqual(
      result.page.compositions,
      files["src/catalog/figma/page-surface.json"].pages[0].compositions,
    )
  } finally {
    fixture.dispose()
  }
})

test("selectSurfacePages and syncPagesSurface support --uncensused and --all multi-page batches", async () => {
  const multiFiles = {
    ...files,
    "src/catalog/figma/inventory.json": {
      fileKey: "file-key",
      syncedAt: "2026-01-01",
      components: [
        { nodeId: "4:4", name: "Button", type: "COMPONENT", pageId: "1:1", pageName: "Components" },
        { nodeId: "8:8", name: "Badge", type: "COMPONENT", pageId: "2:2", pageName: "Badges" },
      ],
    },
    "src/catalog/figma/registry.json": {
      entries: {
        ...files["src/catalog/figma/registry.json"].entries,
        "8:8": { status: "excluded", reason: "Fixture-only badge" },
      },
      bulkRules: [],
    },
  }
  const fixture = fixtureTree(multiFiles, "surface-sync-multi-")
  const workspace = workspaceAt(fixture.root)
  try {
    assert.deepEqual(selectSurfacePages(workspace, { uncensused: true }), ["2:2"])
    assert.deepEqual(selectSurfacePages(workspace, { all: true }), ["1:1", "2:2"])

    const badgePage = {
      id: "2:2",
      name: "Badges",
      type: "CANVAS",
      children: [
        { id: "8:8", name: "Badge", type: "COMPONENT" },
        { id: "8:9", name: "Draft badge", type: "COMPONENT" },
      ],
    }
    const result = await syncPagesSurface(workspace, {
      pageIds: ["1:1", "2:2"],
      trees: new Map([
        ["1:1", metadata],
        ["2:2", badgePage],
      ]),
      now: "2026-02-02",
      dryRun: false,
      check: async () => ({ exitCode: 0, out: [], err: [] }),
    })
    assert.equal(result.pages.length, 2)
    assert.equal(result.surface.pages.length, 2)
    assert.deepEqual(
      result.pages[1].added.map((identity) => [identity.nodeId, identity.decision]),
      [
        ["8:8", "excluded"],
        ["8:9", "unpublished"],
      ],
    )
    assert.deepEqual(selectSurfacePages(workspace, { uncensused: true }), [])
  } finally {
    fixture.dispose()
  }
})

test("surface sync keeps COMPONENT_SET variants out of identities and skips wrappers of recorded compositions", () => {
  const tree = {
    id: "1:1",
    name: "Components",
    type: "CANVAS",
    children: [
      {
        id: "4:4",
        name: "Button",
        type: "COMPONENT_SET",
        children: [{ id: "4:41", name: "Size=Medium", type: "COMPONENT" }],
      },
      {
        id: "4:5",
        name: ".Helper",
        type: "COMPONENT_SET",
        children: [{ id: "4:51", name: "Variant=A", type: "COMPONENT" }],
      },
      {
        id: "9:1",
        name: "Page screen wrapper",
        type: "FRAME",
        absoluteBoundingBox: { x: 0, y: 0, width: 1200, height: 800 },
        children: [
          {
            id: "6:6",
            name: "Example",
            type: "FRAME",
            absoluteBoundingBox: { x: 0, y: 0, width: 1200, height: 200 },
            children: [{ id: "6:61", name: "Button", type: "INSTANCE", componentId: "4:41" }],
          },
        ],
      },
      {
        id: "9:2",
        name: "New mobile frame",
        type: "FRAME",
        absoluteBoundingBox: { x: 0, y: 900, width: 320, height: 500 },
        children: [{ id: "9:21", name: "Button", type: "INSTANCE", componentId: "4:41" }],
      },
    ],
  }
  const setFiles = {
    ...files,
    "src/catalog/figma/inventory.json": {
      fileKey: "file-key",
      syncedAt: "2026-01-01",
      components: [
        {
          nodeId: "4:4",
          name: "Button",
          type: "COMPONENT_SET",
          pageId: "1:1",
          pageName: "Components",
        },
      ],
    },
  }
  const fixture = fixtureTree(setFiles, "surface-sync-variants-wrapper-")
  try {
    const result = planSurfaceSync(workspaceAt(fixture.root), "1:1", tree, "2026-02-02")
    // Variants 4:41 and 4:51 must NOT appear as separate identities.
    assert.deepEqual(
      result.page.identities.map((identity) => [identity.nodeId, identity.kind]),
      [
        ["4:4", "COMPONENT_SET"],
        ["4:5", "COMPONENT_SET"],
      ],
    )
    // Wrapper 9:1 only contains already-recorded composition 6:6 -> not re-flagged.
    // Unrecorded frame 9:2 referencing variant 4:41 -> still discovered.
    assert.deepEqual(result.compositionCandidates, [
      {
        nodeId: "9:2",
        name: "New mobile frame",
        drawn: 1,
        width: 320,
      },
    ])
    assert.deepEqual(result.staleCompositions, [])
  } finally {
    fixture.dispose()
  }
})
