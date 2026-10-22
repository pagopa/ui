import assert from "node:assert/strict"
import { test } from "node:test"

import {
  cssWeight,
  documentIndex,
  formatSpecTree,
  hexOf,
  loadExport,
  namedLeaves,
  nodeSpec,
  pickVariant,
  sourceNode,
  variantsOf,
} from "../../src/parity/source.ts"
import { toolingPath } from "../../src/lib/paths.ts"

const FIXTURE = toolingPath("tests/fixtures/figma-parity/snapshot-slice.json")

test("the pinned slice loads through the shared live normalizer", () => {
  const project = loadExport(FIXTURE)
  assert.deepEqual(project.catalogue.map((node) => node.nodeId).sort(), [
    "529:6110",
    "529:6123",
    "749:5867",
  ])
  assert.equal(documentIndex(project).size, 61)
})

test("the source spec carries the geometry, layout and type a diff needs", () => {
  const project = loadExport(FIXTURE)
  const variant = sourceNode(project, "749:5865")
  const spec = nodeSpec(variant, { depth: 3 })
  assert.equal(spec.box.width, 320)
  assert.equal(spec.box.height, 488)
  assert.deepEqual(spec.layout, {
    mode: "VERTICAL",
    gap: 24,
    padding: [64, 24, 64, 24],
    align: "CENTER",
    counterAlign: "CENTER",
  })
  assert.equal(spec.fills[0], "#f4f5f8")
  const titles = namedLeaves(spec, "Title")
  assert.equal(titles.length, 1)
  assert.equal(titles[0].text.fontSize, 24)
  assert.equal(titles[0].text.lineHeight, 36)
  assert.equal(titles[0].text.cssWeight, 700)
  assert.equal(titles[0].text.styleName, "Titillio-Bold")
  assert.equal(titles[0].text.color, "#0e0f13")
})

// The two review-only facts the diff skips: a hidden layer the tree still
// lists, and the hug/fill sizing of each axis.
test("the spec carries visibility and per-axis sizing", () => {
  const project = loadExport(FIXTURE)
  const variant = nodeSpec(sourceNode(project, "749:5865"), { depth: 1 })
  assert.deepEqual(variant.sizing, { horizontal: "FIXED", vertical: "HUG" })
  assert.equal(variant.visible, undefined)
  const hidden = nodeSpec(sourceNode(project, "529:6130"), { depth: 0 })
  assert.equal(hidden.visible, false)
})

// `--compact`: one line per node, derived from the same spec the diff reads.
test("the compact tree prints the anatomy a review reads", () => {
  const project = loadExport(FIXTURE)
  const lines = formatSpecTree(nodeSpec(sourceNode(project, "749:5865"), { depth: 1 }))
  assert.equal(
    lines[0],
    '- 749:5865 | COMPONENT | "Device=Mobile" | fill=#f4f5f8 | 320x488 | @0,0 | VERTICAL gap=24 pad=64/24/64/24 align=CENTER/CENTER sizing=FIXED/HUG',
  )
  assert.match(lines[1], /^ {2}- 749:5829 \| FRAME \| "Content" \| 272x240 \| @24,64 \|/)
  const hidden = formatSpecTree(nodeSpec(sourceNode(project, "529:6130"), { depth: 0 }))[0]
  assert.match(hidden, /\| hidden$/)
  assert.match(hidden, /sizing=FIXED\/HUG/)
})

test("the variant picker resolves by id and by declared state", () => {
  const project = loadExport(FIXTURE)
  const set = sourceNode(project, "749:5867")
  assert.equal(variantsOf(set).length, 2)
  assert.equal(pickVariant(set, { state: "desktop" }).nodeId, "749:5866")
  assert.equal(pickVariant(set, { variant: "749:5865" }).nodeId, "749:5865")
  assert.equal(pickVariant(set, {}).nodeId, "749:5865")
  assert.throws(() => pickVariant(set, { variant: "1:1" }), /not a variant/)
})

// A published node without variants (a plain `COMPONENT`) is its own single
// variant: the review compares the node against itself, so `--state` only names
// the case and `--variant` has to be the node.
test("the variant picker accepts a node without variants as its own variant", () => {
  const project = loadExport(FIXTURE)
  const component = sourceNode(project, "529:6123")
  assert.equal(variantsOf(component).length, 0)
  const picked = pickVariant(component, { state: "Panel" })
  assert.equal(picked.nodeId, "529:6123")
  assert.equal(picked.name, "Status=Enabled, Filled=False, * Required=True")
  assert.deepEqual(picked.state, {})
  assert.deepEqual(picked.box, { width: 274, height: 48 })
  assert.equal(pickVariant(component, { variant: "529:6123" }).nodeId, "529:6123")
  assert.equal(pickVariant(component, {}).nodeId, "529:6123")
  assert.throws(() => pickVariant(component, { variant: "1:1" }), /no variants/)
})

test("the weight law and the paint reader stay in one place", () => {
  assert.equal(cssWeight(500), 600)
  assert.equal(cssWeight(600), 700)
  assert.equal(cssWeight(400), 400)
  assert.equal(
    hexOf({
      type: "SOLID",
      color: { r: 0.043137254901960784, g: 0.24313725490196078, b: 0.8901960784313725 },
    }),
    "#0b3ee3",
  )
  assert.equal(hexOf({ type: "IMAGE" }), undefined)
})

test("the mapping gaps name the padded frames a root-only case does not compare", async () => {
  const { mappingGaps } = await import("../../src/parity/cli.ts")
  const tree = {
    nodeId: "1:1",
    name: "Root",
    type: "COMPONENT",
    layout: { mode: "VERTICAL", gap: 8, padding: [0, 0, 0, 0] },
    children: [
      {
        nodeId: "1:2",
        name: "Header",
        type: "FRAME",
        layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0] },
        children: [
          {
            nodeId: "1:3",
            name: "Row",
            type: "FRAME",
            layout: { mode: "HORIZONTAL", gap: 0, padding: [16, 16, 8, 16] },
          },
        ],
      },
      {
        nodeId: "1:4",
        name: "Dates",
        type: "FRAME",
        layout: { mode: "VERTICAL", gap: 2, padding: [8, 8, 8, 8] },
      },
      {
        nodeId: "1:5",
        name: "Calendar",
        type: "FRAME",
        layout: { mode: "VERTICAL", gap: 8, padding: [0, 0, 0, 0] },
      },
      { nodeId: "1:6", name: "Divider", type: "INSTANCE" },
    ],
  }
  assert.deepEqual(mappingGaps(tree, []), ["Row (1:3)", "Dates (1:4)"])
  assert.deepEqual(mappingGaps(tree, ["Dates"]), ["Row (1:3)"])
})
