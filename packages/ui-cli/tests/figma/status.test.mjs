import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { nextCommand } from "../../src/figma/status.ts"
import { fixtureEnvironment, fixtureTree } from "../helpers/cli.mjs"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

function fixture(files, env = {}) {
  const tree = fixtureTree({}, "pagopa-figma-status-")
  const root = tree.root
  try {
    for (const [file, source] of Object.entries(files)) {
      const target = path.join(root, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, source)
    }
    return spawnSync(process.execPath, [script, "figma", "status", "--json"], {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnvironment(root, { PATH: "", FIGMA_TOKEN: "", ...env }),
    })
  } finally {
    tree.dispose()
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
          note: "Blocked by https://github.com/acme/ui/issues/42",
        },
      },
    }),
    ...overrides,
  }
}

test("the session report counts nodes, the pending queue and the requests it points at", () => {
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
      designRequests: ["https://github.com/acme/ui/issues/42"],
    },
  ])
  assert.deepEqual(report.requests.linked, ["https://github.com/acme/ui/issues/42"])
  assert.equal(report.requests.open, undefined, "the census belongs to `figma request list`")
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
          "9:9": { status: "pending", note: "Blocked by https://github.com/acme/ui/issues/43" },
        },
      }),
    }),
  )
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.equal(report.pending.length, 1)
  assert.equal(report.pending[0].name, null)
  assert.equal(report.pending[0].nodeId, "9:9")
  assert.deepEqual(report.pending[0].designRequests, ["https://github.com/acme/ui/issues/43"])
})

test("a missing inventory fails with its path", () => {
  const result = fixture({ "src/catalog/figma/registry.json": '{"bulkRules":[],"entries":{}}' })
  assert.equal(result.status, 1)
  assert.match(result.stdout, /inventory\.json/)
})

// The ladder is a pure read of the report's own counters, so it is tested on a
// hand-built report: a fixture write would only reach the same branches.
function state(overrides = {}) {
  const report = {
    config: "figma-to-code.yaml",
    token: { present: true, message: null, source: "env" },
    snapshot: {
      path: ".figma/live-rest.json",
      present: true,
      bytes: 1024,
      modifiedAt: "2026-10-10 10:00",
    },
    inventory: {
      path: "src/catalog/figma/inventory.json",
      syncedAt: "2026-10-10",
      fileVersion: "v1",
      lastModified: null,
      nodes: 3,
      components: 2,
      sets: 1,
      error: null,
    },
    registry: {
      path: "src/catalog/figma/registry.json",
      implemented: 3,
      mocked: 0,
      pending: 0,
      excluded: 0,
      unaccounted: 0,
      error: null,
    },
    rules: {
      path: "src/catalog/figma/rules.json",
      present: true,
      consolidated: 1,
      imported: 0,
      recorded: 1,
      pending: 0,
      stale: 0,
      error: null,
    },
    comments: {
      path: "src/catalog/figma/comments.json",
      present: true,
      threads: 0,
      open: 0,
      mappedOpen: 0,
      error: null,
    },
    pending: [],
    surface: {
      stats: {
        pages: 2,
        pagesPublished: 2,
        identities: 3,
        inLibrary: 3,
        unpublished: 0,
        pending: 0,
        compositions: 0,
        mirrored: 0,
      },
      uncensused: [],
      error: null,
    },
    requests: { linked: [] },
    live: { version: "v1", lastModified: "2026-10-09T10:00:00Z", changedSinceInventory: false },
  }
  for (const [key, value] of Object.entries(overrides))
    report[key] = Array.isArray(value) ? value : { ...report[key], ...value }
  return report
}

test("the ladder reaches nothing to align only when the counters are clear", () => {
  assert.match(nextCommand(state()), /^nothing to align/)
})

test("pending rules keep the ledger open even with the file unchanged", () => {
  const next = nextCommand(state({ rules: { pending: 2 } }))
  assert.match(next, /pnpm ui-cli figma rules mark/)
  assert.match(next, /2 rule\(s\) still carry a pending disposition/)
  assert.doesNotMatch(next, /nothing to align/)
})

test("stale rules outrank pending rules", () => {
  const next = nextCommand(state({ rules: { stale: 1, pending: 2 } }))
  assert.match(next, /trail the library export/)
})

test("a censused-only page does not ask for a census read", () => {
  // pages counts the census, pagesPublished the inventory: an extra censused
  // page makes the totals differ without any page missing.
  const next = nextCommand(state({ surface: { stats: { pages: 5, pagesPublished: 2 } } }))
  assert.match(next, /^nothing to align/)
})

test("a published page the census never read names that page", () => {
  const next = nextCommand(
    state({
      surface: {
        uncensused: [{ pageId: "3:0", pageName: "• Timeline", nodes: 4 }],
      },
    }),
  )
  assert.match(next, /figma surface sync --page/)
  assert.match(next, /Timeline/)
  assert.doesNotMatch(next, /figma:triage/)
})

test("a pending census identity asks for a catalogue decision, not triage", () => {
  const next = nextCommand(state({ registry: { pending: 1 }, surface: { stats: { pending: 1 } } }))
  assert.match(next, /pnpm ui-cli figma brief --queue/)
  assert.match(next, /pnpm ui-cli record <nodeId> --status <status>/)
  assert.match(next, /pnpm ui-cli figma triage preserves it/)
})

test("a design request a pending node points at outranks its pending identity", () => {
  const next = nextCommand(
    state({
      requests: { linked: ["https://github.com/acme/ui/issues/42"] },
      registry: { pending: 1 },
      surface: { stats: { pending: 1 } },
    }),
  )
  assert.match(next, /answer the 1 open design request/)
  assert.match(next, /https:\/\/github\.com\/acme\/ui\/issues\/42/)
})

// The deadlock this router had: 23 open records held the request rung while six
// pending nodes existed, so every session was told to answer debt that no node
// referenced and never reached the brief.
test("open debt no pending node points at never blocks the router", () => {
  const next = nextCommand(
    state({
      requests: { linked: [] },
      registry: { pending: 6 },
      surface: { stats: { pending: 6 } },
    }),
  )
  assert.match(next, /pnpm ui-cli figma brief --queue/)
  assert.doesNotMatch(next, /answer the \d+ open design request/)
})

test("the tracker's own debt never reaches the router", () => {
  const next = nextCommand(state())
  assert.match(next, /^nothing to align/)
  assert.doesNotMatch(next, /design request|request list/)
})

test("unaccounted-only work asks for a registry entry, not the brief queue", () => {
  const next = nextCommand(state({ registry: { unaccounted: 2 } }))
  assert.match(next, /pnpm ui-cli check catalogue/)
  assert.match(next, /2 unaccounted node\(s\)/)
  assert.match(next, /pnpm ui-cli record/)
  assert.doesNotMatch(next, /--queue/)
})

// One vocabulary: the router used to spell its rungs as Nx targets, which are a
// second name for the same command and explained nowhere near the report.
test("every rung is spelled as the command a person runs", () => {
  const rungs = [
    state({ rules: { pending: 2 } }),
    state({ surface: { uncensused: [{ pageId: "3:0", pageName: "Timeline", nodes: 4 }] } }),
    state({ registry: { pending: 1 }, surface: { stats: { pending: 1 } } }),
    state({ registry: { unaccounted: 2 } }),
    state({ live: { changedSinceInventory: true } }),
  ]
  for (const report of rungs) {
    const next = nextCommand(report)
    assert.doesNotMatch(next, /pagopa-ui-cli:/)
    assert.doesNotMatch(next, /figma:(brief|rules|plan|triage|comments)/)
  }
})
