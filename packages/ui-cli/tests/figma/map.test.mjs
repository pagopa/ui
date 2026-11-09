import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { figmaMap, mapProblems, publicValues } from "../../src/figma/map.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

const MAP = "figma-map.json"

const inventory = {
  schemaVersion: 1,
  fileKey: "FILEKEY",
  syncedAt: "2026-01-01T00:00:00.000Z",
  components: [
    {
      nodeId: "1:2",
      name: "Button",
      type: "COMPONENT_SET",
      pageId: "0:1",
      pageName: "Components",
    },
    // A glyph on an artwork page, decided by the page rule rather than by an
    // entry of its own.
    {
      nodeId: "1:4",
      name: "SavingMoney",
      type: "COMPONENT_SET",
      pageId: "0:9",
      pageName: "Pictograms",
    },
    // A native page the registry excludes in bulk.
    {
      nodeId: "1:5",
      name: "Status bar",
      type: "COMPONENT",
      pageId: "0:10",
      pageName: "Native",
    },
  ],
}

const registry = {
  entries: {
    "1:2": {
      status: "implemented",
      target: {
        module: "src/components/button.tsx",
        export: "Button",
        story: "apps/storybook/src/Button.stories.tsx",
        storyExports: ["Playground"],
        additionalExports: ["IconButton"],
      },
    },
    "1:3": { status: "excluded", reason: "A decoration no component draws" },
  },
  bulkRules: [
    {
      pageId: "0:9",
      page: "Pictograms",
      status: "implemented",
      namesExport: "figmaPictogramNames",
    },
    {
      pageId: "0:10",
      page: "Native",
      status: "excluded",
      reason: "native OS chrome — not shipped by the library",
    },
  ],
}

// The type declarations are not things to render, so the map must not index
// them even though the report lists them. `Image` reaches the surface through an
// alias clause, which a scan of the declaration keywords would miss.
const report = [
  "// @public",
  "export const Button: (props: Props) => string;",
  "// @public",
  "export function Card(): string;",
  "// @public",
  "export function PagoPAIcon(props: IconProps): string;",
  "// @public",
  "export function PagoPAPictogram(props: IconProps): string;",
  "// @public",
  "export type Props = { label: string };",
  "",
  "// @public",
  "function Image_2(input: ImageProps): string;",
  "export { Image_2 as Image };",
  "",
].join("\n")

function tree(extra = {}) {
  return {
    "package.json": JSON.stringify({ name: "@pagopa/ui", version: "1.2.3" }),
    "etc/pagopa-ui.api.md": report,
    "src/catalog/figma/inventory.json": JSON.stringify(inventory),
    "src/catalog/figma/registry.json": JSON.stringify(registry),
    "src/catalog/figma/story-titles.json": JSON.stringify({
      "apps/storybook/src/Button.stories.tsx": "Components/Button",
    }),
    ...extra,
  }
}

function materialize(files) {
  return fixtureTree(files)
}

async function run(args, files) {
  const tree = materialize(files)
  try {
    return await runCli(["figma", "map", ...args], { root: tree.root })
  } finally {
    tree.dispose()
  }
}

// The whole artifact, generated once: the assertions below read it rather than
// rebuilding the expectations by hand.
async function generate(files = tree()) {
  const fixture = materialize(files)
  try {
    const result = await runCli(["figma", "map", "--write"], { root: fixture.root })
    assert.equal(result.status, 0, result.stderr)
    const text = fs.readFileSync(path.join(fixture.root, MAP), "utf8")
    return { files: { ...files, [MAP]: text }, map: JSON.parse(text) }
  } finally {
    fixture.dispose()
  }
}

test("--write maps each node to its export, its story and the file it names", async () => {
  const { map } = await generate()
  assert.equal(map.schemaVersion, 1)
  assert.equal(map.fileKey, "FILEKEY")
  assert.deepEqual(map.nodes["1:2"], {
    figma: "Button",
    page: "Components",
    type: "COMPONENT_SET",
    status: "implemented",
    exports: ["Button"],
    // The registry names it, the package does not export it: readable in the
    // row, never an import a consumer could write.
    unexported: ["IconButton"],
    story: "components-button--playground",
  })
  assert.deepEqual(map.nodes["1:3"], {
    status: "excluded",
    exports: [],
    reason: "A decoration no component draws",
  })
})

test("a node its page decided in bulk gets a row naming the renderer", async () => {
  const { map } = await generate()
  assert.deepEqual(map.nodes["1:4"], {
    figma: "SavingMoney",
    page: "Pictograms",
    type: "COMPONENT_SET",
    status: "implemented",
    exports: ["PagoPAPictogram"],
  })
  assert.deepEqual(map.nodes["1:5"], {
    figma: "Status bar",
    page: "Native",
    type: "COMPONENT",
    status: "excluded",
    exports: [],
    reason: "native OS chrome — not shipped by the library",
  })
})

test("the reverse index is the public surface, including what no node renders", async () => {
  const { map } = await generate()
  assert.deepEqual(map.exports, {
    Button: ["1:2"],
    Card: [],
    Image: [],
    PagoPAIcon: [],
    PagoPAPictogram: ["1:4"],
  })
})

test("a second run reproduces the artifact and reports its size", async () => {
  const { files } = await generate()
  const result = await run([], files)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /4 nodes, 2\/5 exports mapped/)
})

test("a hand edit to the committed map is stale", async () => {
  const { files, map } = await generate()
  const edited = {
    ...files,
    [MAP]: `${JSON.stringify({ ...map, syncedAt: "2026-01-01" }, null, 2)}\n`,
  }
  const result = await run([], edited)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /figma-map\.json is stale/)
})

test("a missing map names the target that writes it", async () => {
  const result = await run([], tree())
  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing figma-map\.json/)
  assert.match(result.stderr, /figma:map/)
})

test("a committed map that does not parse is reported by the schema", async () => {
  const { files } = await generate()
  const broken = { ...files, [MAP]: JSON.stringify({ schemaVersion: 2 }) }
  const result = await run([], broken)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /schemaVersion/)
})

test("an implemented node the inventory lost is a problem", async () => {
  const { files } = await generate()
  const lost = JSON.stringify({ ...inventory, components: [] })
  const result = await run([], { ...files, "src/catalog/figma/inventory.json": lost })
  assert.equal(result.status, 1)
  assert.match(
    result.stderr,
    /1:2 is implemented but missing from src\/catalog\/figma\/inventory\.json/,
  )
})

test("a node no rule and no entry decided is a catalogue gap, not a guess", async () => {
  const files = tree({
    "src/catalog/figma/inventory.json": JSON.stringify({
      ...inventory,
      components: [
        ...inventory.components,
        { nodeId: "1:6", name: "Orphan", type: "COMPONENT", pageId: "0:11", pageName: "Other" },
      ],
    }),
  })
  const result = await run([], files)
  assert.equal(result.status, 2)
  assert.match(result.stderr, /1:6 has no registry decision/)
})

// The invariants guard the artifact a consumer reads, so each one is fed the
// broken map it exists to catch rather than a broken input the generator would
// have fixed.
const values = new Set(["Button", "Card", "Image", "PagoPAIcon", "PagoPAPictogram"])
const titles = { "apps/storybook/src/Button.stories.tsx": "Components/Button" }

function intactMap() {
  return figmaMap({ registry, inventory, titles, values })
}

function problemsAfter(mutate, listed = inventory) {
  const map = structuredClone(intactMap())
  mutate(map)
  return mapProblems(map, listed, values)
}

test("an intact map has no problem", () => {
  assert.deepEqual(mapProblems(intactMap(), inventory, values), [])
})

test("every invariant names the row it caught", () => {
  assert.deepEqual(
    problemsAfter((map) => {
      delete map.exports.Card
    }),
    ["Card is not indexed"],
  )
  assert.deepEqual(
    problemsAfter((map) => {
      map.nodes["1:2"].exports = ["Button", "Checkbox"]
    }),
    ["1:2 advertises Checkbox, which @pagopa/ui does not export"],
  )
  assert.deepEqual(
    problemsAfter((map) => {
      map.nodes["1:2"].unexported = ["IconButton", "Card"]
    }),
    ["1:2 marks Card unexported, but @pagopa/ui exports it"],
  )
  assert.deepEqual(
    problemsAfter((map) => {
      map.exports.Button = []
    }),
    ["1:2 renders Button, which omits it"],
  )
  assert.deepEqual(
    problemsAfter((map) => {
      map.exports.Ghost = []
    }),
    ["Ghost is indexed but not exported by @pagopa/ui"],
  )
  assert.deepEqual(
    problemsAfter((map) => {
      map.exports.Button = ["1:2", "9:9"]
    }),
    ["Button lists 9:9, which has no row"],
  )
  assert.deepEqual(
    problemsAfter(() => {}, { ...inventory, components: [] }),
    [
      "1:2 is implemented but missing from src/catalog/figma/inventory.json",
      "1:4 is implemented but missing from src/catalog/figma/inventory.json",
    ],
  )
})

test("the public surface is read from the report, aliases included", () => {
  const fixture = fixtureTree(tree())
  try {
    assert.deepEqual([...publicValues(workspaceAt(fixture.root))].sort(), [
      "Button",
      "Card",
      "Image",
      "PagoPAIcon",
      "PagoPAPictogram",
    ])
  } finally {
    fixture.dispose()
  }
})
