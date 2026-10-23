import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

function fixture(files, env = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-figma-status-"))
  try {
    for (const [file, source] of Object.entries(files)) {
      const target = path.join(root, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, source)
    }
    return spawnSync(process.execPath, [script, "figma", "status", "--json"], {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnv(root, { FIGMA_TOKEN: "", ...env }),
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

const node = (id, type, pageId, name) => ({ nodeId: id, name, type, pageId, pageName: "Page" })

function tree(overrides = {}) {
  return {
    "figma-to-code.yaml": "figma:\n  snapshot: .figma/live-rest.json\n",
    ".figma/live-rest.json": "{}",
    "src/catalog/figma/inventory.json": JSON.stringify({
      fileKey: "fixture",
      syncedAt: "2026-10-10",
      fileVersion: "v1",
      lastModified: "2026-10-09T10:00:00Z",
      components: [
        node("1:1", "COMPONENT", "1:0", "Control"),
        node("1:2", "COMPONENT_SET", "1:0", "Field"),
        node("2:1", "COMPONENT", "2:0", "mail"),
      ],
    }),
    "src/catalog/figma/registry.json": JSON.stringify({
      bulkRules: [{ pageId: "2:0", status: "implemented" }],
      entries: {
        "1:1": { status: "implemented", target: { module: "src/control.tsx", export: "Control" } },
        "1:2": {
          status: "pending",
          target: { module: "src/field.tsx", export: "Field" },
          note: "Blocked by docs/design-requests/2026-10-21-field.md",
        },
      },
    }),
    "docs/design-requests/2026-10-21-field.md": "- Status: open — waiting\n",
    "docs/design-requests/2026-10-12-old.md": "- Status: answered — done\n",
    ...overrides,
  }
}

test("the session report counts nodes, the pending queue and the open requests", () => {
  const result = fixture(tree())
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.equal(report.inventory.nodes, 3)
  assert.equal(report.inventory.components, 2)
  assert.equal(report.inventory.sets, 1)
  assert.equal(report.inventory.fileVersion, "v1")
  assert.equal(report.registry.implemented, 2, "the page bulk rule covers the icon")
  assert.equal(report.registry.pending, 1)
  assert.equal(report.registry.unaccounted, 0)
  assert.deepEqual(report.pending, [
    {
      nodeId: "1:2",
      name: "Field",
      target: "Field",
      designRequests: ["docs/design-requests/2026-10-21-field.md"],
    },
  ])
  assert.equal(report.requests.open, 1)
  assert.equal(report.requests.answered, 1)
  assert.equal(report.token.present, false)
  assert.equal(report.live, null)
  assert.match(report.next, /FIGMA_TOKEN/)
})

test("the pending queue also reports a registry entry the inventory no longer carries", () => {
  const result = fixture(
    tree({
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": { status: "implemented" },
          "9:9": { status: "pending", note: "Blocked by docs/design-requests/2026-10-21-gone.md" },
        },
      }),
    }),
  )
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.equal(report.pending.length, 1)
  assert.equal(report.pending[0].name, null)
  assert.equal(report.pending[0].nodeId, "9:9")
  assert.deepEqual(report.pending[0].designRequests, ["docs/design-requests/2026-10-21-gone.md"])
})

test("a missing inventory fails with its path", () => {
  const result = fixture({ "src/catalog/figma/registry.json": '{"bulkRules":[],"entries":{}}' })
  assert.equal(result.status, 1)
  assert.match(result.stdout, /inventory\.json/)
})
