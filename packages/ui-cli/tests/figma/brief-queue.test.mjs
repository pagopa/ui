import assert from "node:assert/strict"
import { test } from "node:test"
import { fixtureTree, runCli } from "../helpers/cli.mjs"

const devicePolicy = {
  axes: [],
  any: ["Any", "Default"],
  devices: {
    mobile: { canonicalWidth: 320, defaultLayoutScope: "viewport", aliases: ["Mobile"] },
    desktop: { canonicalWidth: 1200, defaultLayoutScope: "viewport", aliases: ["Desktop"] },
  },
}

const control = (nodeId, name, size = "Small") => ({
  nodeId,
  name,
  type: "COMPONENT",
  pageId: "1:0",
  pageName: "Controls",
  properties: {
    Size: { type: "VARIANT", defaultValue: size, variantOptions: ["Small", "Large"] },
  },
  dependencies: [],
})

// The inventory and the pinned snapshot differ on three identities: 1:1 has
// new properties, 1:2 is new, 1:3 was renamed. 1:4 and 1:5 are untouched.
const committed = [
  control("1:1", "Control"),
  control("1:3", "Control Three"),
  control("1:4", "Control Four"),
  control("1:5", "Control Five"),
]
const live = [
  control("1:1", "Control", "Large"),
  control("1:2", "Control Two"),
  control("1:3", "Control 3"),
  control("1:4", "Control Four"),
  control("1:5", "Control Five"),
]

const pending = (nodeId) => [nodeId, { status: "pending" }]

const files = (components, snapshot, entries) => ({
  "src/catalog/figma/device-policy.json": devicePolicy,
  "src/catalog/figma/inventory.json": {
    fileKey: "fixture",
    syncedAt: "2026-01-01",
    components,
  },
  "src/catalog/figma/registry.json": { bulkRules: [], entries: Object.fromEntries(entries) },
  ".figma/live-rest.json": { fileKey: "fixture", components: snapshot },
})

const deltaFiles = files(committed, live, [
  pending("1:1"),
  pending("1:2"),
  pending("1:3"),
  pending("1:4"),
  pending("1:5"),
])

test("brief queue reads the delta and names the omitted count", async () => {
  const fixture = fixtureTree(deltaFiles, "brief-queue-delta-")
  try {
    const result = await runCli(["figma", "brief", "--queue"], { root: fixture.root })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /^implementationOrder 1:1, 1:2, 1:3$/m)
    for (const nodeId of ["1:1", "1:2", "1:3"]) {
      assert.match(result.stdout, new RegExp(`^node       ${nodeId}\\b`, "m"))
    }
    assert.doesNotMatch(result.stdout, /^node       1:4/m)
    assert.match(result.stdout, /^2 more pending node\(s\) outside this delta, not read$/m)
    // The scoped read is the point of #121: never advertise the widening that
    // replaces it, or a session takes it and loses the count it must report.
    assert.doesNotMatch(result.stdout, /--full/)
  } finally {
    fixture.dispose()
  }
})

test("brief queue --full reproduces the whole pending queue", async () => {
  const fixture = fixtureTree(deltaFiles, "brief-queue-full-")
  try {
    const result = await runCli(["figma", "brief", "--queue", "--full"], { root: fixture.root })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /^implementationOrder 1:1, 1:2, 1:3, 1:4, 1:5$/m)
    for (const nodeId of ["1:1", "1:2", "1:3", "1:4", "1:5"]) {
      assert.match(result.stdout, new RegExp(`^node       ${nodeId}\\b`, "m"))
    }
    assert.doesNotMatch(result.stdout, /not shown/)
  } finally {
    fixture.dispose()
  }
})

test("brief queue --json carries the scope, the omitted count and the cap", async () => {
  const fixture = fixtureTree(deltaFiles, "brief-queue-json-")
  try {
    const scoped = await runCli(["figma", "brief", "--queue", "--json"], { root: fixture.root })
    assert.equal(scoped.status, 0, scoped.stderr)
    const queue = JSON.parse(scoped.stdout)
    assert.deepEqual(queue.scope, { kind: "delta", omitted: 2, truncated: 0, lineCap: 60 })
    assert.deepEqual(queue.implementationOrder, ["1:1", "1:2", "1:3"])
    assert.deepEqual(
      queue.items.map((item) => item.nodeId),
      ["1:1", "1:2", "1:3"],
    )

    const full = await runCli(["figma", "brief", "--queue", "--full", "--json"], {
      root: fixture.root,
    })
    assert.equal(full.status, 0, full.stderr)
    const whole = JSON.parse(full.stdout)
    assert.deepEqual(whole.scope, { kind: "all", omitted: 0, truncated: 0, lineCap: null })
    assert.deepEqual(whole.implementationOrder, ["1:1", "1:2", "1:3", "1:4", "1:5"])
  } finally {
    fixture.dispose()
  }
})

// A node the delta added has no record in the pinned inventory yet, and the
// scoped read exists to name exactly those: resolving it as an inventory node
// threw, so the queue failed on the nodes it was asked to show.
test("the queue reads a node the pinned inventory has not absorbed", async () => {
  const ledger = {
    schemaVersion: 1,
    fileKey: "fixture",
    cards: {
      "I9:9;9:1": {
        pageId: "1:0",
        page: "Controls",
        container: "9:9",
        section: "Da commentare",
        status: "Da fare",
        title: "Spaziatura",
        sourceHash: "0123456789abcdef",
        targets: ["1:2"],
        scope: "component",
        disposition: "pending",
      },
    },
  }
  const fixture = fixtureTree(
    { ...deltaFiles, "src/catalog/figma/rules.json": ledger },
    "brief-queue-live-only-",
  )
  try {
    const result = await runCli(["figma", "brief", "--queue"], { root: fixture.root })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /^implementationOrder 1:1, 1:2, 1:3$/m)
    // The pinned inventory has no name or page for it yet, and the brief says
    // so rather than borrowing the live file's.
    assert.match(result.stdout, /^node       1:2$/m)
    // The node's rules are read too: scoping to the node itself still finds the
    // card that targets it, which is what the brief must not lose.
    assert.match(result.stdout, /^rules      1 \(1 pending\)$/m)
    assert.match(result.stdout, /^ {2}pending +Spaziatura$/m)
  } finally {
    fixture.dispose()
  }
})

const many = Array.from({ length: 30 }, (_, index) => control(`2:${index + 1}`, `Control ${index}`))
const oversizedFiles = files([], many, [])

test("brief queue caps an oversized delta and says it was capped", async () => {
  const fixture = fixtureTree(oversizedFiles, "brief-queue-cap-")
  try {
    const result = await runCli(["figma", "brief", "--queue"], { root: fixture.root })
    assert.equal(result.status, 0, result.stderr)
    const lines = result.stdout.split("\n")
    assert.ok(lines.length <= 60, `expected at most 60 lines, got ${lines.length}`)
    assert.match(
      result.stdout,
      /^truncated at 60 lines: \d+ more node\(s\) in scope not shown — raise --limit to read them$/m,
    )
    assert.doesNotMatch(result.stdout, /more pending node\(s\) outside this delta/)

    const raised = await runCli(["figma", "brief", "--queue", "--limit", "400"], {
      root: fixture.root,
    })
    assert.equal(raised.status, 0, raised.stderr)
    assert.doesNotMatch(raised.stdout, /truncated at/)
    assert.match(raised.stdout, /^node       2:30$/m)
  } finally {
    fixture.dispose()
  }
})

// The cap bounds what a session reads, so the header and the notices it renders
// are paid before the first node: counting only the nodes let the rendered read
// run past --limit by exactly the lines around them.
test("the line cap pays for the header and the notices", async () => {
  const fixture = fixtureTree(oversizedFiles, "brief-queue-cap-fixed-")
  try {
    for (const limit of [20, 60]) {
      const result = await runCli(["figma", "brief", "--queue", "--limit", String(limit)], {
        root: fixture.root,
      })
      assert.equal(result.status, 0, result.stderr)
      const lines = result.stdout.replace(/\n$/, "").split("\n")
      assert.ok(lines.length <= limit, `--limit ${limit} rendered ${lines.length} lines`)
      assert.match(result.stdout, /^implementationOrder /m)
      assert.match(result.stdout, new RegExp(`^truncated at ${limit} lines: `, "m"))
    }
  } finally {
    fixture.dispose()
  }
})

const noSnapshotFiles = files(committed, live, [pending("1:1"), pending("1:4")])
delete noSnapshotFiles[".figma/live-rest.json"]

test("brief queue without a delta snapshot reads the pending queue and says so", async () => {
  const fixture = fixtureTree(noSnapshotFiles, "brief-queue-nosnapshot-")
  try {
    const result = await runCli(["figma", "brief", "--queue"], { root: fixture.root })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /^implementationOrder 1:1, 1:4$/m)
    // The fallback widens the read, so it says what it did not scope and which
    // command scopes it, and it still counts what it did not print.
    assert.match(
      result.stdout,
      /^no delta snapshot \(\.figma\/live-rest\.json\): this read is the unscoped pending queue, not the delta — run `pnpm ui-cli figma export` to scope it$/m,
    )
    assert.doesNotMatch(result.stdout, /more pending node\(s\) outside this delta/)

    const json = await runCli(["figma", "brief", "--queue", "--json"], { root: fixture.root })
    assert.equal(json.status, 0, json.stderr)
    assert.deepEqual(JSON.parse(json.stdout).scope, {
      kind: "pending",
      omitted: 0,
      truncated: 0,
      lineCap: 60,
    })
  } finally {
    fixture.dispose()
  }
})

const manyPendingFiles = files(
  [],
  many,
  many.map((node) => pending(node.nodeId)),
)
delete manyPendingFiles[".figma/live-rest.json"]

test("the unscoped fallback counts the pending nodes the cap dropped", async () => {
  const fixture = fixtureTree(manyPendingFiles, "brief-queue-nosnapshot-cap-")
  try {
    const json = await runCli(["figma", "brief", "--queue", "--json"], { root: fixture.root })
    assert.equal(json.status, 0, json.stderr)
    const queue = JSON.parse(json.stdout)
    assert.equal(queue.scope.kind, "pending")
    // Every pending node is in scope here, so nothing is omitted: the cap is
    // what left them out, and calling that "outside this delta" would be false.
    assert.equal(queue.scope.omitted, 0)
    assert.ok(queue.scope.truncated > 0, "the fallback says what it left out")
    assert.equal(queue.scope.truncated, many.length - queue.items.length)
    const text = await runCli(["figma", "brief", "--queue"], { root: fixture.root })
    assert.match(
      text.stdout,
      new RegExp(
        `^truncated at ${queue.scope.lineCap} lines: ${queue.scope.truncated} more node\\(s\\) in scope not shown — raise --limit to read them$`,
        "m",
      ),
    )
    assert.doesNotMatch(text.stdout, /more pending node\(s\) outside this delta/)
  } finally {
    fixture.dispose()
  }
})

test("brief queue --refresh still resolves the token before reading", async () => {
  const fixture = fixtureTree(deltaFiles, "brief-queue-refresh-")
  try {
    const result = await runCli(["figma", "brief", "--queue", "--refresh"], {
      root: fixture.root,
      env: { FIGMA_TOKEN: "invalid token" },
    })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /FIGMA_TOKEN contains whitespace/)
  } finally {
    fixture.dispose()
  }
})

test("brief queue rejects the full-queue flags without --queue", async () => {
  const fixture = fixtureTree(deltaFiles, "brief-queue-usage-")
  try {
    const full = await runCli(["figma", "brief", "--node", "1:1", "--full"], { root: fixture.root })
    assert.equal(full.status, 2)
    assert.match(full.stderr, /--full and --limit only apply to --queue/)

    const limit = await runCli(["figma", "brief", "--node", "1:1", "--limit", "10"], {
      root: fixture.root,
    })
    assert.equal(limit.status, 2)
    assert.match(limit.stderr, /--full and --limit only apply to --queue/)
  } finally {
    fixture.dispose()
  }
})
