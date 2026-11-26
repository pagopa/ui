// `record` — one node, one atomic write (ticket #187).
//
// A decision used to reach disk one document at a time, so a run that failed
// halfway left a tree no re-run repaired. The fixtures below are the three
// promises that replaced it: the run writes the whole set, a second run writes
// nothing new, and a step that fails puts back the bytes of every file the run
// had already touched — which is what makes the next run resumable.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { record } from "../../src/figma/record.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"
import { snapshot } from "../helpers/snapshot.mjs"

const STORIES_ROOT = "apps/storybook/src"
const ENV = { PAGOPA_UI_STORIES_ROOT: STORIES_ROOT }

const STORY = [
  'import { Control } from "../../../src/pagopa-ui"',
  "function figmaEmbedUrl(nodeId: string) {",
  '  return "https://www.figma.com/embed?node-id=" + nodeId',
  "}",
  'export default { title: "Components/Control" }',
  "export const Playground = {",
  '  parameters: { design: { type: "figma", url: figmaEmbedUrl("1:1") } },',
  "  render: () => <Control />,",
  "}",
  "",
].join("\n")

const TARGET = [
  "--status",
  "implemented",
  "--module",
  "src/components/Control.tsx",
  "--export",
  "Control",
  "--story",
  `${STORIES_ROOT}/Control.stories.tsx`,
  "--story-exports",
  "Playground",
]

// A workspace whose catalogue fails for one reason only: the page census says
// the node shipped and the registry has not caught up. That is the state
// `record` exists to close.
function baseFiles({ undecided = false } = {}) {
  return {
    "src/catalog/figma/inventory.json": {
      fileKey: "fixture",
      syncedAt: "2026-01-01",
      components: [
        {
          nodeId: "1:1",
          name: "Control",
          type: "COMPONENT_SET",
          pageId: "0:1",
          pageName: "Components",
          dependencies: [],
        },
        // A node every document sees and no registry entry decides: the map
        // generator refuses it, which is how a run stops after the writes.
        ...(undecided
          ? [
              {
                nodeId: "1:2",
                name: "Undecided",
                type: "COMPONENT",
                pageId: "0:1",
                pageName: "Components",
                dependencies: [],
              },
            ]
          : []),
      ],
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
      any: ["Any"],
      devices: {
        mobile: { canonicalWidth: 320, defaultLayoutScope: "viewport", aliases: ["Mobile"] },
      },
    },
    "src/catalog/figma/page-surface.json": {
      fileKey: "fixture",
      readAt: "2026-01-01",
      note: "Fixture census.",
      pages: [
        {
          pageId: "0:1",
          pageName: "Components",
          identities: [
            {
              nodeId: "1:1",
              name: "Control",
              kind: "COMPONENT_SET",
              inLibrary: true,
              decision: "shipped",
            },
            // The census decided this node too; only the registry has not been
            // told. Fixing that is the whole difference the resume makes.
            ...(undecided
              ? [
                  {
                    nodeId: "1:2",
                    name: "Undecided",
                    kind: "COMPONENT",
                    inLibrary: true,
                    decision: "excluded",
                    reason: "Fixture-only control",
                  },
                ]
              : []),
          ],
          compositions: [],
        },
      ],
    },
    "src/components/icons/figma-inventory.ts":
      "export const figmaIconNames = [] as const\nexport const figmaPictogramNames = [] as const",
    "src/components/Control.tsx": "export function Control() {\n  return <span />\n}\n",
    "src/pagopa-ui.ts": 'export { Control } from "./components/Control"\n',
    [`${STORIES_ROOT}/Control.stories.tsx`]: STORY,
    "etc/pagopa-ui.api.md":
      "## API Report File\n\n```ts\n\n// @public\nexport function Control(): Element\n\n```\n",
  }
}

function workspaceOf(tree) {
  return workspaceAt(tree.root, ENV)
}

function read(tree, file) {
  return fs.readFileSync(path.join(tree.root, file), "utf8")
}

test("one run writes the registry, the surface, the titles and the map", async () => {
  const tree = fixtureTree(baseFiles())
  try {
    assert.equal((await runCli(["check", "catalogue"], { root: tree.root, env: ENV })).status, 1)
    const result = await runCli(["record", "1:1", ...TARGET], { root: tree.root, env: ENV })
    const out = result.stdout
    assert.equal(result.status, 0, out + result.stderr)
    assert.match(out, /^updated: 1:1 excluded → implemented/m)
    for (const file of [
      "src/catalog/figma/registry.json",
      "src/catalog/figma/page-surface.json",
      "src/catalog/figma/story-titles.json",
      "figma-map.json",
    ])
      assert.match(out, new RegExp(`wrote ${file}`))
    assert.match(out, /catalogue: pass \(0\)/)

    const registry = JSON.parse(read(tree, "src/catalog/figma/registry.json"))
    assert.equal(registry.entries["1:1"].status, "implemented")
    assert.deepEqual(registry.entries["1:1"].target, {
      module: "src/components/Control.tsx",
      export: "Control",
      story: `${STORIES_ROOT}/Control.stories.tsx`,
      storyExports: ["Playground"],
    })
    const titles = JSON.parse(read(tree, "src/catalog/figma/story-titles.json"))
    assert.equal(titles[`${STORIES_ROOT}/Control.stories.tsx`], "Components/Control")
    const map = JSON.parse(read(tree, "figma-map.json"))
    assert.equal(map.nodes["1:1"].status, "implemented")
    assert.deepEqual(map.exports.Control, ["1:1"])

    const after = await runCli(["check", "catalogue"], { root: tree.root, env: ENV })
    assert.equal(after.status, 0, after.stderr)
  } finally {
    tree.dispose()
  }
})

test("re-running on the unchanged tree changes nothing", async () => {
  const tree = fixtureTree(baseFiles())
  try {
    const first = await runCli(["record", "1:1", ...TARGET], { root: tree.root, env: ENV })
    assert.equal(first.status, 0, first.stderr)
    const before = snapshot(tree.root)

    const second = await runCli(["record", "1:1", ...TARGET], { root: tree.root, env: ENV })
    assert.equal(second.status, 0, second.stderr)
    assert.match(second.stdout, /^unchanged: 1:1 implemented → implemented/m)
    assert.deepEqual(snapshot(tree.root), before, "the second run wrote the same bytes")
  } finally {
    tree.dispose()
  }
})

test("a dry run reports the decision and writes none of it", async () => {
  const tree = fixtureTree(baseFiles())
  try {
    const before = snapshot(tree.root)
    const result = await runCli(["record", "1:1", ...TARGET, "--dry-run"], {
      root: tree.root,
      env: ENV,
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /^dry run: 1:1 excluded → implemented/m)
    assert.deepEqual(snapshot(tree.root), before, "a dry run is a read")

    const real = await runCli(["record", "1:1", ...TARGET], { root: tree.root, env: ENV })
    assert.equal(real.status, 0, real.stderr)
  } finally {
    tree.dispose()
  }
})

test("a step that fails puts back every file the run had written", async () => {
  const pristine = fixtureTree(baseFiles({ undecided: true }))
  const tree = fixtureTree(baseFiles({ undecided: true }))
  try {
    const untouched = snapshot(pristine.root)
    await assert.rejects(
      () => record(workspaceOf(tree), { nodeId: "1:1", ...options() }),
      /1:2 has no registry decision/,
    )
    assert.deepEqual(
      snapshot(tree.root),
      untouched,
      "a failed record leaves the tree as a tree that never ran it",
    )

    // The next run starts from that same place: closing the node the map
    // refused is the only change, and one run then applies the whole set.
    tree.write({
      "src/catalog/figma/registry.json": {
        entries: {
          "1:1": { status: "excluded", reason: "Fixture-only control" },
          "1:2": { status: "excluded", reason: "Fixture-only control" },
        },
        bulkRules: [],
      },
    })
    const resumed = await runCli(["record", "1:1", ...TARGET], { root: tree.root, env: ENV })
    assert.equal(resumed.status, 0, resumed.stdout + resumed.stderr)
    assert.match(resumed.stdout, /^updated: 1:1 excluded → implemented/m)
  } finally {
    tree.dispose()
    pristine.dispose()
  }
})

test("a rejected entry is a usage error and writes nothing at all", async () => {
  const tree = fixtureTree(baseFiles())
  try {
    const before = snapshot(tree.root)
    const result = await runCli(["record", "1:1", "--status", "implemented"], {
      root: tree.root,
      env: ENV,
    })
    assert.equal(result.status, 2, result.stdout)
    assert.match(
      result.stderr,
      /implemented requires module, export, story and explicit storyExports/,
    )
    assert.deepEqual(snapshot(tree.root), before, "the preflight rejected it before the writes")
  } finally {
    tree.dispose()
  }
})

// The flags of the recording above, as the domain call takes them.
function options() {
  return {
    status: "implemented",
    module: "src/components/Control.tsx",
    export: "Control",
    story: `${STORIES_ROOT}/Control.stories.tsx`,
    storyExports: "Playground",
  }
}
