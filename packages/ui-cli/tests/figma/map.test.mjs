import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))
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
}

// The type declarations are not things to render, so the map must not index
// them even though the report lists them.
const report = [
  "// @public",
  "export const Button: (props: Props) => string;",
  "// @public",
  "export function Card(): string;",
  "// @public",
  "export type Props = { label: string };",
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-figma-map-"))
  for (const [file, source] of Object.entries(files)) {
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, source)
  }
  return root
}

function run(args, files) {
  const root = materialize(files)
  try {
    return spawnSync(process.execPath, [script, "figma", "map", ...args], {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnv(root),
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

// The whole artifact, generated once: the assertions below read it rather than
// rebuilding the expectations by hand.
function generate(files = tree()) {
  const root = materialize(files)
  try {
    const result = spawnSync(process.execPath, [script, "figma", "map", "--write"], {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnv(root),
    })
    assert.equal(result.status, 0, result.stderr)
    const text = fs.readFileSync(path.join(root, MAP), "utf8")
    return { files: { ...files, [MAP]: text }, map: JSON.parse(text) }
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("--write maps each node to its export, its story and the file it names", () => {
  const { map } = generate()
  assert.equal(map.schemaVersion, 1)
  assert.equal(map.fileKey, "FILEKEY")
  assert.deepEqual(map.nodes["1:2"], {
    figma: "Button",
    page: "Components",
    type: "COMPONENT_SET",
    status: "implemented",
    exports: ["Button", "IconButton"],
    story: "components-button--playground",
  })
  assert.deepEqual(map.nodes["1:3"], {
    status: "excluded",
    exports: [],
    reason: "A decoration no component draws",
  })
})

test("the reverse index covers the public surface, including what no node renders", () => {
  const { map } = generate()
  assert.deepEqual(map.exports, { Button: ["1:2"], Card: [], IconButton: ["1:2"] })
})

test("a second run reproduces the artifact and reports its size", () => {
  const { files } = generate()
  const result = run([], files)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /2 nodes, 2\/3 exports mapped/)
})

test("a hand edit to the committed map is stale", () => {
  const { files, map } = generate()
  const edited = {
    ...files,
    [MAP]: `${JSON.stringify({ ...map, syncedAt: "2026-01-01" }, null, 2)}\n`,
  }
  const result = run([], edited)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /figma-map\.json is stale/)
})

test("a missing map names the target that writes it", () => {
  const result = run([], tree())
  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing figma-map\.json/)
  assert.match(result.stderr, /figma:map/)
})

test("a committed map that does not parse is reported by the schema", () => {
  const { files } = generate()
  const broken = { ...files, [MAP]: JSON.stringify({ schemaVersion: 2 }) }
  const result = run([], broken)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /schemaVersion/)
})

test("an implemented node the inventory lost is a problem", () => {
  const { files } = generate()
  const lost = JSON.stringify({ ...inventory, components: [] })
  const result = run([], { ...files, "src/catalog/figma/inventory.json": lost })
  assert.equal(result.status, 1)
  assert.match(
    result.stderr,
    /1:2 is implemented but missing from src\/catalog\/figma\/inventory\.json/,
  )
})
