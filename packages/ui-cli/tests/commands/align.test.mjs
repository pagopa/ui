// `align` — one node, one invocation (ticket #187).
//
// The preflight, the Storybook probe and the numeric diagnostic used to be three
// reads with two places to stop between them. The run below is the contract that
// replaced them: one call answers every preflight question, then compares, and
// writes nothing, so a second run on the same tree says the same thing.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { align } from "../../src/figma/align.ts"
import { check } from "../../src/parity/check.ts"
import { loadExport, nodeSpec } from "../../src/parity/source.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

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
        {
          nodeId: "1:1",
          name: "Fixture",
          type: "COMPONENT_SET",
          pageId: "1:0",
          pageName: "Components",
          variants: [
            {
              nodeId: "1:3",
              name: "Desktop",
              device: "desktop",
              designFingerprint: "a".repeat(64),
            },
          ],
        },
        {
          nodeId: "1:9",
          name: "Unmapped",
          type: "COMPONENT",
          pageId: "1:0",
          pageName: "Components",
        },
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
            type: "COMPONENT_SET",
            containing_frame: { pageId: "1:0", pageName: "Components" },
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

// The render the diagnostic compares against: the probe reads the numbers the
// source declares, so a plan that reports nothing is a plan whose source and
// render agree.
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

// The real diagnostic with its capture injected, which is the composition the
// command performs against a live Storybook.
function diagnoseWith(tree, edit) {
  return (workspace, options) =>
    check(workspace, options, { capture: async () => probe(tree, edit) })
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

test("one invocation answers the preflight and the comparison, and writes nothing", async () => {
  const tree = fixture()
  try {
    const before = snapshot(tree.root)
    const result = await align(
      workspaceOf(tree),
      { nodeId: "1:1", notes: true },
      {
        diagnose: diagnoseWith(tree),
      },
    )
    const out = result.out.join("\n")
    assert.equal(result.code, 0, out)
    assert.deepEqual(result.plan, {
      nodeId: "1:1",
      name: "Fixture",
      page: "Components",
      status: "implemented",
      storyId: "fixture--playground",
      export: "Fixture",
      devices: ["desktop"],
    })
    assert.match(out, /1:1 "Fixture" · Components · implemented/)
    assert.match(out, /story fixture--playground · Fixture/)
    assert.match(out, /devices desktop \(1 declared\)/)
    assert.match(out, /note field\.padding\.top: 12px/)
    assert.deepEqual(snapshot(tree.root), before, "align left the tree as it found it")
  } finally {
    tree.dispose()
  }
})

test("a second run on the unchanged tree says exactly what the first said", async () => {
  const tree = fixture()
  try {
    const first = await align(
      workspaceOf(tree),
      { nodeId: "1:1" },
      { diagnose: diagnoseWith(tree) },
    )
    const second = await align(
      workspaceOf(tree),
      { nodeId: "1:1" },
      { diagnose: diagnoseWith(tree) },
    )
    assert.equal(second.code, first.code)
    assert.deepEqual(second.plan, first.plan)
    assert.deepEqual(second.out, first.out)
  } finally {
    tree.dispose()
  }
})

test("a difference is reported as drift, and is still not written down", async () => {
  const tree = fixture()
  try {
    const before = snapshot(tree.root)
    const result = await align(
      workspaceOf(tree),
      { nodeId: "1:1", notes: true },
      {
        diagnose: diagnoseWith(tree, (render) => ({
          ...render,
          padding: [0, ...render.padding.slice(1)],
        })),
      },
    )
    const out = result.out.join("\n")
    assert.equal(result.code, 3, out)
    assert.equal(result.diagnostic.data.report.deltas.length > 0, true)
    assert.match(out, /field\.padding\.top/)
    assert.deepEqual(snapshot(tree.root), before, "a finding is reported, never accumulated")
  } finally {
    tree.dispose()
  }
})

test("a node the inventory does not hold fails before the capture, naming the refresh", async () => {
  const tree = fixture()
  try {
    await assert.rejects(
      () =>
        align(
          workspaceOf(tree),
          { nodeId: "9:9" },
          { diagnose: async () => assert.fail("no capture") },
        ),
      /9:9 is not in the inventory — refresh it with "pnpm ui-cli update inventory --triage"/,
    )
  } finally {
    tree.dispose()
  }
})

test("a node with no registry target fails before the capture too", async () => {
  const tree = fixture()
  try {
    await assert.rejects(
      () =>
        align(
          workspaceOf(tree),
          { nodeId: "1:9" },
          { diagnose: async () => assert.fail("no capture") },
        ),
      /1:9 has no registry target with a story/,
    )
  } finally {
    tree.dispose()
  }
})

test("the storybook probe runs in the same invocation, and a silent one stops the run", async () => {
  const tree = fixture()
  try {
    const answered = await align(
      workspaceOf(tree),
      { nodeId: "1:1" },
      {
        storybookUrl: "http://localhost:6006",
        storybook: async () => true,
        diagnose: diagnoseWith(tree),
      },
    )
    assert.equal(answered.storybook?.answers, true)
    assert.match(answered.out.join("\n"), /storybook http:\/\/localhost:6006 answers/)

    let captured = false
    await assert.rejects(
      () =>
        align(
          workspaceOf(tree),
          { nodeId: "1:1" },
          {
            storybookUrl: "http://localhost:6006",
            storybook: async () => false,
            diagnose: async () => {
              captured = true
              assert.fail("unreachable")
            },
          },
        ),
      /localhost:6006 does not answer — start Storybook, then rerun align/,
    )
    assert.equal(captured, false, "a silent Storybook costs a message, not a browser session")
  } finally {
    tree.dispose()
  }
})

test("the command is one positional node and reports a usage error for anything else", async () => {
  const tree = fixture()
  try {
    const help = await runCli(["align", "--help"], { root: tree.root })
    assert.equal(help.status, 0)
    assert.match(help.stdout, /Preflight, capture and diagnose one node/)
    for (const flag of ["--story", "--export", "--device", "--notes", "--json"])
      assert.match(help.stdout, new RegExp(flag))

    const missing = await runCli(["align"], { root: tree.root })
    assert.equal(missing.status, 2, missing.stdout + missing.stderr)

    const unknown = await runCli(["align", "9:9"], { root: tree.root })
    assert.equal(unknown.status, 2, unknown.stdout)
    assert.match(unknown.stderr, /9:9 is not in the inventory/)
  } finally {
    tree.dispose()
  }
})
