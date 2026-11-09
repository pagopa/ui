import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const source = fileURLToPath(new URL("../../../pagopa-ui/cli/pagopa-ui-map.mjs", import.meta.url))

const map = {
  schemaVersion: 1,
  fileKey: "FILEKEY",
  syncedAt: "2026-01-01T00:00:00.000Z",
  nodes: {
    "1:2": {
      figma: "Button",
      page: "Components",
      type: "COMPONENT_SET",
      status: "implemented",
      exports: ["Button"],
      // A name the registry uses for the row and the package keeps internal.
      unexported: ["IconButton"],
      story: "components-button--playground",
    },
    "1:3": { status: "excluded", exports: [], reason: "A decoration no component draws" },
  },
  exports: { Button: ["1:2"], Card: [] },
}

// The command resolves the map beside itself, so the fixture is the shipped
// layout: `cli/pagopa-ui-map.mjs` next to `figma-map.json`.
function run(args) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-ui-map-"))
  try {
    fs.mkdirSync(path.join(root, "cli"))
    fs.copyFileSync(source, path.join(root, "cli", "pagopa-ui-map.mjs"))
    fs.writeFileSync(path.join(root, "figma-map.json"), JSON.stringify(map, null, 2))
    return spawnSync(process.execPath, [path.join(root, "cli", "pagopa-ui-map.mjs"), ...args], {
      encoding: "utf8",
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("resolve answers with the exports, the status and the story of one node", () => {
  const result = run(["resolve", "1:2"])
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /1:2 {2}Button {2}\(COMPONENT_SET, Components\)/)
  assert.match(result.stdout, /exports: Button/)
  assert.match(result.stdout, /status: {2}implemented/)
  assert.match(result.stdout, /story: {3}components-button--playground/)
})

test("a name the package keeps internal is readable but marked so", () => {
  const result = run(["resolve", "1:2"])
  assert.match(result.stdout, /also: {4}IconButton — not importable/)
  assert.doesNotMatch(result.stdout, /exports: Button, IconButton/)
})

test("an internal name is still searchable, so a part can be recognised", () => {
  const result = run(["search", "iconbutton"])
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /^1:2 {2}Button {2}→ IconButton — not importable {2}\[implemented\]/)
})

test("a link to another file is refused instead of answered with a stranger's ids", () => {
  const result = run(["resolve", "https://www.figma.com/design/OTHERKEY/x?node-id=1-2"])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /node 1:2 belongs to another Figma file/)
  assert.match(result.stderr, /indexes FILEKEY only/)
  assert.equal(result.stdout, "")
})

test("the URL form and the hyphenated form reach the same row", () => {
  const url = run(["resolve", "https://www.figma.com/design/FILEKEY/x?node-id=1-2"])
  assert.equal(url.status, 0, url.stderr)
  assert.match(url.stdout, /^1:2 {2}Button/)
  assert.equal(run(["resolve", "1-2"]).stdout, run(["resolve", "1:2"]).stdout)
})

test("a node with no component says so instead of failing", () => {
  const result = run(["resolve", "1:3"])
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /exports: —/)
  assert.match(result.stdout, /excluded — A decoration no component draws/)
})

test("an unknown node fails and suggests the closest row", () => {
  const result = run(["resolve", "1:"])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /no node 1: in the map/)
  assert.match(result.stderr, /closest: 1:2 \(Button\)/)
})

test("a node id the map does not hold falls back to the page that does", () => {
  const result = run(["resolve", "1:99"])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /page 1: holds: 1:2 \(Button\)/)
})

test("search scores a name that starts the query above one that contains it", () => {
  const result = run(["search", "button"])
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /^1:2 {2}Button/)
  assert.equal(run(["search", "button", "--limit", "1"]).stdout.trim().split("\n").length, 1)
})

test("export lists the nodes one export renders, and answers an empty one", () => {
  const rendered = run(["export", "Button"])
  assert.equal(rendered.status, 0, rendered.stderr)
  assert.match(rendered.stdout, /^1:2 {2}Button/)
  const absent = run(["export", "Card"])
  assert.equal(absent.status, 0, absent.stderr)
  assert.match(absent.stdout, /Card has no Figma source/)
})

test("an export with no node answers --json with an empty list", () => {
  const result = run(["export", "card", "--json"])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), { name: "Card", nodes: [] })
})

test("a name the package keeps internal is not an export", () => {
  const result = run(["export", "IconButton"])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /"IconButton" is not an export of the package/)
})

test("an unknown export fails and names the near ones", () => {
  const result = run(["export", "Butto"])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /"Butto" is not an export of the package/)
  assert.match(result.stderr, /closest: Button/)
})

test("--json prints the row for a program to read", () => {
  const result = run(["resolve", "1:2", "--json"])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), { nodeId: "1:2", node: map.nodes["1:2"] })
})

test("no command prints the usage, an unknown one exits as a usage error", () => {
  assert.equal(run([]).status, 0)
  assert.match(run([]).stdout, /usage: pagopa-ui-map/)
  assert.equal(run(["deploy"]).status, 2)
  assert.equal(run(["resolve"]).status, 2)
})
