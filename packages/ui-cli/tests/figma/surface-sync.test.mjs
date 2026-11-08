import assert from "node:assert/strict"
import { test } from "node:test"
import { fixtureTree, workspaceAt } from "../helpers/cli.mjs"
import { planSurfaceSync, syncPageSurface } from "../../src/figma/surface-sync.ts"

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
