// The ephemeral numeric-parity diagnostic (ADR-0015).
//
// One registry target, its numeric source and its render, compared in a single
// run. The run reports to the person who asked for it and returns: no case, no
// evidence bundle, no queue entry — the tree it ran in is the tree it leaves.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { check } from "../../src/parity/check.ts"
import { loadExport, nodeSpec } from "../../src/parity/source.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

const REPOSITORY = path.resolve(import.meta.dirname, "../../../..")

const source = {
  id: "1:1",
  name: "Fixture",
  type: "COMPONENT",
  absoluteBoundingBox: { x: 0, y: 0, width: 320, height: 48 },
  layoutMode: "VERTICAL",
  itemSpacing: 8,
  paddingTop: 12,
  paddingRight: 16,
  paddingBottom: 12,
  paddingLeft: 16,
  cornerRadius: 8,
  fills: [{ type: "SOLID", visible: true, color: { r: 1, g: 1, b: 1 } }],
  children: [
    {
      id: "1:2",
      name: "Label",
      type: "TEXT",
      characters: "Fixture",
      absoluteBoundingBox: { x: 16, y: 12, width: 120, height: 20 },
      style: { fontSize: 16, lineHeightPx: 20, fontWeight: 400 },
      fills: [{ type: "SOLID", visible: true, color: { r: 0, g: 0, b: 0 } }],
    },
  ],
}

function fixture() {
  return fixtureTree({
    "src/figma.generated.css": ":root {\n  --text-body-small: 0.875rem;\n}\n",
    "src/manifest.json": { variables: {} },
    "src/catalog/figma/registry.json": {
      bulkRules: [],
      entries: {
        "1:1": {
          status: "implemented",
          target: {
            module: "src/components/fixture.tsx",
            export: "Fixture",
            story: "src/stories/Fixture.stories.tsx",
            storyExports: ["Playground"],
          },
        },
      },
    },
    "src/catalog/figma/inventory.json": {
      fileKey: "fixture",
      syncedAt: "2026-01-01",
      components: [
        { nodeId: "1:1", name: "Fixture", type: "COMPONENT", pageId: "1:0", pageName: "Page" },
      ],
    },
    "src/stories/Fixture.stories.tsx": [
      'export default { title: "Fixture" }',
      "export const Playground = {}",
      "",
    ].join("\n"),
    "src/catalog/figma/device-policy.json": {
      axes: ["Device"],
      any: ["any"],
      devices: {
        desktop: { aliases: ["Desktop"], canonicalWidth: 1024, defaultLayoutScope: "viewport" },
      },
    },
    ".figma/live-rest.json": {
      meta: {
        components: [
          {
            node_id: "1:1",
            name: "Fixture",
            type: "COMPONENT",
            containing_frame: { pageId: "1:0", pageName: "Page" },
          },
        ],
        component_sets: [],
      },
      nodes: { "1:1": { document: source } },
    },
  })
}

function workspaceOf(tree) {
  return workspaceAt(tree.root, { PAGOPA_UI_TOKENS_ROOT: tree.root })
}

// The render the diagnostic compares against: the probe reads the same numbers
// the source declares, so a run that reports nothing is a run that found the
// render and the source agree. `layout` in the source becomes the computed
// `padding`/`gap` the DOM reports.
function probe(tree, edit = (render) => render) {
  const project = loadExport(workspaceOf(tree))
  const spec = nodeSpec(project.raw.nodes["1:1"].document, { depth: 1 })
  const render = {
    ...spec,
    padding: [...(spec.layout?.padding ?? [])],
    gap: spec.layout?.gap,
    rowGap: spec.layout?.gap,
    childCount: spec.children?.length ?? 0,
  }
  return { storyId: "fixture--playground", subjects: { field: edit(render) } }
}

function snapshot(root) {
  const entries = []
  const walk = (directory) => {
    for (const name of fs.readdirSync(directory).sort()) {
      const absolute = path.join(directory, name)
      if (fs.statSync(absolute).isDirectory()) walk(absolute)
      else entries.push(`${path.relative(root, absolute)}\0${fs.readFileSync(absolute, "utf8")}`)
    }
  }
  walk(root)
  return entries
}

test("a render that matches the source passes and writes no state", async () => {
  const tree = fixture()
  try {
    const before = snapshot(tree.root)
    const result = await check(
      workspaceOf(tree),
      { nodeId: "1:1", notes: true },
      {
        capture: async () => probe(tree),
      },
    )
    assert.equal(result.code, 0, result.out.join("\n"))
    assert.match(result.out.join("\n"), /snapshot/)
    assert.match(result.out.join("\n"), /fixture--playground/)
    assert.match(result.out.join("\n"), /note field\.padding\.top: 12px/)
    assert.deepEqual(snapshot(tree.root), before, "the diagnostic left the tree as it found it")
  } finally {
    tree.dispose()
  }
})

test("a numeric difference is reported and exits for reconciliation", async () => {
  const tree = fixture()
  try {
    const before = snapshot(tree.root)
    const result = await check(
      workspaceOf(tree),
      { nodeId: "1:1", notes: true },
      {
        capture: async () =>
          probe(tree, (render) => ({
            // The story rendered 0 where the source declares 12: the one number a
            // person aligning this component has to fix.
            ...render,
            padding: [0, ...render.padding.slice(1)],
          })),
      },
    )
    const out = result.out.join("\n")
    assert.equal(result.code, 3, out)
    assert.match(out, /field\.padding\.top/)
    assert.match(out, /12/)
    assert.match(out, /0/)
    assert.deepEqual(snapshot(tree.root), before, "a finding is reported, never accumulated")
  } finally {
    tree.dispose()
  }
})

test("a node the registry does not point at is a usage error, not an empty report", async () => {
  const tree = fixture()
  try {
    await assert.rejects(
      () => check(workspaceOf(tree), { nodeId: "9:9" }, { capture: async () => ({}) }),
      /9:9 has no registry target/,
    )
  } finally {
    tree.dispose()
  }
})

test("the parity command is a three-verb diagnostic and its check needs a node", async () => {
  const tree = fixture()
  try {
    const help = await runCli(["parity", "--help"], { root: tree.root })
    assert.equal(help.status, 0)
    for (const verb of ["check", "source", "render"]) assert.match(help.stdout, new RegExp(verb))
    for (const retired of ["align", "cases", "queue", "capture", "report"])
      assert.doesNotMatch(help.stdout, new RegExp(`\\b${retired}\\b`))
    const missing = await runCli(["parity", "check"], { root: tree.root })
    assert.equal(missing.status, 2, missing.stdout)
    assert.match(missing.stderr, /requires --node/)
  } finally {
    tree.dispose()
  }
})

test("the repository carries no committed case corpus and no evidence bundle", () => {
  assert.equal(
    fs.existsSync(path.join(REPOSITORY, "packages/pagopa-ui/src/catalog/figma/parity-cases.json")),
    false,
  )
  assert.equal(fs.existsSync(path.join(REPOSITORY, "docs/figma-parity")), false)
})
