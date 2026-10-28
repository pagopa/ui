import assert from "node:assert/strict"
import { test } from "node:test"

import {
  checkPageSurface,
  formatSurfaceLine,
  surfacePending,
  surfaceSummary,
  surfaceUncensused,
  surfaceUnmirrored,
} from "../../src/figma/surface.ts"

const FILE_KEY = "pvhsJpPGQbEwNLiyP7BOIw"
const PAGE = "1326:5181"

function inventory(
  nodeId,
  { name = "TimelineElement", type = "COMPONENT_SET", pageId = PAGE } = {},
) {
  return { nodeId, name, type, pageId }
}

function surface({ identities = [], compositions = [], pageId = PAGE } = {}) {
  return {
    fileKey: FILE_KEY,
    readAt: "2026-10-28",
    note: "fixture",
    pages: [{ pageId, pageName: "• Timeline", identities, compositions }],
  }
}

function identity(nodeId, decision, extra = {}) {
  return {
    nodeId,
    name: "TimelineElement",
    kind: "COMPONENT_SET",
    inLibrary: true,
    decision,
    ...extra,
  }
}

function composition(nodeId, extra = {}) {
  return { nodeId, name: "Frame", device: "desktop", drawn: 1, mirrors: [], ...extra }
}

function run(
  data,
  {
    nodes = [],
    entries = {},
    bulkRules = [],
    cases = [],
    devices = ["mobile", "tablet", "desktop"],
  } = {},
) {
  return checkPageSurface(data, {
    nodes,
    registry: { entries, bulkRules },
    cases,
    fileKey: FILE_KEY,
    devices,
  })
}

test("a census that mirrors the inventory passes", () => {
  const result = run(
    surface({
      identities: [
        identity("12812:16248", "shipped"),
        identity("1333:16408", "pending", { reason: "a design request is open" }),
      ],
      compositions: [composition("10981:11318", { device: "desktop", mirrors: ["case-1"] })],
    }),
    {
      nodes: [inventory("12812:16248"), inventory("1333:16408", { name: "TimelineElement" })],
      entries: { "12812:16248": { status: "implemented" }, "1333:16408": { status: "pending" } },
      cases: [{ id: "case-1", nodeId: "12812:16248", device: "desktop" }],
    },
  )
  assert.deepEqual(result.errors, [])
  assert.equal(result.stats.identities, 2)
  assert.equal(result.stats.inLibrary, 2)
  assert.equal(result.stats.pending, 1)
  assert.equal(result.stats.mirrored, 1)
})

test("an unpublished drawing is out of scope and needs no reason", () => {
  const result = run(
    surface({ identities: [identity("12808:14459", "unpublished", { inLibrary: false })] }),
  )
  assert.deepEqual(result.errors, [])
  assert.equal(result.stats.unpublished, 1)
  assert.equal(result.stats.pending, 0)
})

test("an unpublished drawing that the library now publishes fails the mirror", () => {
  const result = run(
    surface({ identities: [identity("12808:14459", "unpublished", { inLibrary: false })] }),
    {
      nodes: [inventory("12808:14459")],
    },
  )
  assert.equal(result.errors.length, 1)
  assert.match(result.errors[0], /marked as unpublished but the library export publishes it/)
})

test("a published identity the decision calls unpublished fails", () => {
  const result = run(surface({ identities: [identity("12812:16248", "unpublished")] }), {
    nodes: [inventory("12812:16248")],
  })
  assert.equal(result.errors.length, 1)
  assert.match(result.errors[0], /is published and cannot be called unpublished/)
})

test("shipped needs the library and an implemented registry entry", () => {
  const unpublished = run(
    surface({ identities: [identity("1:1", "shipped", { inLibrary: false })] }),
  )
  assert.match(unpublished.errors[0], /is shipped but not in the library/)
  const pending = run(surface({ identities: [identity("1:1", "shipped")] }), {
    nodes: [inventory("1:1")],
    entries: { "1:1": { status: "pending" } },
  })
  assert.match(pending.errors[0], /is shipped but the registry says "pending"/)
})

test("a decision other than shipped carries a reason and agrees with the registry", () => {
  const noReason = run(surface({ identities: [identity("1:1", "excluded")] }), {
    nodes: [inventory("1:1")],
    entries: { "1:1": { status: "excluded" } },
  })
  assert.match(noReason.errors[0], /is excluded and requires a reason/)
  const disagreement = run(
    surface({ identities: [identity("1:1", "excluded", { reason: "why" })] }),
    {
      nodes: [inventory("1:1")],
      entries: { "1:1": { status: "implemented" } },
    },
  )
  assert.match(disagreement.errors[0], /is excluded but the registry says "implemented"/)
})

test("a mocked identity agrees with the registry and carries a reason", () => {
  const pass = run(
    surface({ identities: [identity("1:1", "mocked", { reason: "a facade renders it" })] }),
    {
      nodes: [inventory("1:1")],
      entries: { "1:1": { status: "mocked" } },
    },
  )
  assert.deepEqual(pass.errors, [])
  const noReason = run(
    surface({ identities: [identity("1:1", "mocked", { reason: "a facade renders it" })] }),
    {
      nodes: [inventory("1:1")],
      entries: { "1:1": { status: "implemented" } },
    },
  )
  assert.match(noReason.errors[0], /is mocked but the registry says "implemented"/)
})

test("a page bulk rule is the decision for a node with no entry of its own", () => {
  const shipped = run(
    surface({ identities: [identity("1:1", "shipped", { name: "SavingMoney" })] }),
    {
      nodes: [inventory("1:1", { name: "SavingMoney" })],
      bulkRules: [{ pageId: PAGE, status: "implemented" }],
    },
  )
  assert.deepEqual(shipped.errors, [])
  const excluded = run(
    surface({
      identities: [identity("1:2", "excluded", { name: "Scrollbar", reason: "native chrome" })],
    }),
    {
      nodes: [inventory("1:2", { name: "Scrollbar" })],
      bulkRules: [{ pageId: PAGE, status: "excluded" }],
    },
  )
  assert.deepEqual(excluded.errors, [])
  const owned = run(surface({ identities: [identity("1:1", "shipped")] }), {
    nodes: [inventory("1:1")],
    entries: { "1:1": { status: "pending" } },
    bulkRules: [{ pageId: PAGE, status: "implemented" }],
  })
  assert.match(owned.errors[0], /is shipped but the registry says "pending"/)
})

test("the in-library mirror runs both ways", () => {
  const notPublished = run(surface({ identities: [identity("1:1", "shipped")] }), {
    entries: { "1:1": { status: "implemented" } },
  })
  assert.match(
    notPublished.errors[0],
    /is marked in the library but the inventory does not publish it/,
  )
  const unrecorded = run(surface({ identities: [] }), { nodes: [inventory("2:2")] })
  assert.match(
    unrecorded.errors[0],
    /inventory node 2:2 TimelineElement is missing from the census/,
  )
})

test("the census names the file it was read from", () => {
  const elsewhere = surface()
  elsewhere.fileKey = "someOtherFileKey"
  const result = run(elsewhere)
  assert.match(result.errors[0], /is not the inventory file/)
})

test("a composition that measures nothing needs a written reason", () => {
  const unexcused = run(surface({ compositions: [composition("10981:11318", { drawn: 4 })] }))
  assert.match(unexcused.errors[0], /measures nothing and requires a reason/)
  const excused = run(
    surface({ compositions: [composition("10981:11318", { reason: "no case" })] }),
  )
  assert.deepEqual(excused.errors, [])
  assert.equal(surfaceUnmirrored(surface({ compositions: [composition("10981:11318")] })).length, 1)
})

test("a composition's cases must exist, measure an identity on the page and share its device", () => {
  const identities = [identity("12812:16248", "shipped")]
  const entries = { "12812:16248": { status: "implemented" } }
  const nodes = [inventory("12812:16248")]

  const unknown = run(
    surface({ identities, compositions: [composition("f:1", { mirrors: ["nope"] })] }),
    {
      nodes,
      entries,
    },
  )
  assert.match(unknown.errors[0], /case nope is not in the case corpus/)

  const offPage = run(
    surface({ identities, compositions: [composition("f:1", { mirrors: ["c"] })] }),
    {
      nodes,
      entries,
      cases: [{ id: "c", nodeId: "999:999", device: "desktop" }],
    },
  )
  assert.match(offPage.errors[0], /measures 999:999, which is not an identity on page/)

  const wrongDevice = run(
    surface({
      identities,
      compositions: [composition("f:1", { device: "mobile", mirrors: ["c"] })],
    }),
    { nodes, entries, cases: [{ id: "c", nodeId: "12812:16248", device: "desktop" }] },
  )
  assert.match(wrongDevice.errors[0], /is a desktop case but the composition is drawn at mobile/)
})

test("a composition speaks the device vocabulary of the case corpus", () => {
  const result = run(
    surface({ compositions: [composition("f:1", { device: "phablet", reason: "x" })] }),
  )
  assert.match(result.errors[0], /device "phablet" is not declared/)
})

test("duplicates are refused on pages, identities and compositions", () => {
  const data = surface({
    identities: [
      identity("1:1", "unpublished", { inLibrary: false }),
      identity("1:1", "unpublished", { inLibrary: false }),
    ],
    compositions: [composition("f:1", { reason: "x" }), composition("f:1", { reason: "x" })],
  })
  const result = run(data)
  assert.equal(result.errors.filter((error) => /is listed twice/.test(error)).length, 2)
})

test("waiting work is the published node, never the unpublished drawing", () => {
  const data = surface({
    identities: [
      identity("b:2", "pending", { reason: "open design request" }),
      identity("a:1", "unpublished", { inLibrary: false, reason: "not published" }),
      identity("c:3", "shipped"),
    ],
  })
  assert.deepEqual(
    surfacePending(data).map((entry) => entry.nodeId),
    ["b:2"],
  )
})

test("a page the census never read is counted, not refused", () => {
  const result = run(surface(), {
    nodes: [
      inventory("12812:16248", { pageId: "392:5285" }),
      inventory("392:5292", { pageId: "1:0" }),
    ],
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.warnings.length, 1)
  assert.match(result.warnings[0], /2 page\(s\) with published nodes are not censused/)
  assert.equal(result.stats.pagesPublished, 2)
  assert.match(formatSurfaceLine(result.stats), /surface: 1\/2 page\(s\)/)
})

test("the burn-down names the densest uncensused page first", () => {
  const data = surface({ pageId: "1:1" })
  const nodes = [
    inventory("a", { pageId: "9:9" }),
    inventory("b", { pageId: "8:8" }),
    inventory("c", { pageId: "8:8" }),
    inventory("d", { pageId: "8:8" }),
    inventory("e", { pageId: "1:1" }),
  ]
  assert.deepEqual(
    surfaceUncensused(data, nodes).map((page) => [page.pageId, page.nodes]),
    [
      ["8:8", 3],
      ["9:9", 1],
    ],
  )
})

test("a censused page leaves nothing in the burn-down", () => {
  const result = run(surface({ identities: [identity("12812:16248", "shipped")] }), {
    nodes: [inventory("12812:16248")],
    entries: { "12812:16248": { status: "implemented" } },
  })
  assert.match(formatSurfaceLine(result.stats), /surface: 1\/1 page\(s\)/)
  assert.deepEqual(
    result.warnings.filter((warning) => /not censused/.test(warning)),
    [],
  )
})

test("the ratio is printed only when the inventory says how many pages publish", () => {
  const data = surface({ identities: [identity("12812:16248", "shipped")] })
  assert.match(formatSurfaceLine(surfaceSummary(data)), /^surface: 1 page\(s\) /)
})
