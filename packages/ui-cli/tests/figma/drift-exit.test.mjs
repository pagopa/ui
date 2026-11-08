import assert from "node:assert/strict"
import { test } from "node:test"
import { formatCatalogueDrift } from "../../src/figma/catalogue/drift.ts"

test("a variant-only delta is still reported as drift", () => {
  const delta = {
    added: [],
    removed: [],
    changed: [],
    renamed: [],
    moved: [],
    affected: [],
    baseline: [],
    changedVariants: [{ nodeId: "4:5", device: "mobile", class: "renamed" }],
  }
  const result = formatCatalogueDrift(
    delta,
    [{ nodeId: "4:4", name: "Control", variants: [{ nodeId: "4:5", device: "mobile" }] }],
    false,
    undefined,
    true,
    true,
  )
  assert.match(result.errors.join("\n"), /4:5/)
})

import { compareSnapshots } from "../../src/figma/snapshot.ts"

test("removing the final variant is a drift", () => {
  const node = {
    nodeId: "4:4",
    name: "Control",
    type: "COMPONENT_SET",
    pageId: "1:1",
    pageName: "Page",
  }
  const previous = {
    ...node,
    variants: [{ nodeId: "4:5", name: "Mobile", device: "mobile", designFingerprint: null }],
  }
  assert.deepEqual(
    compareSnapshots([previous], [{ ...node, variants: [] }]).changedVariants.map(
      (entry) => entry.nodeId,
    ),
    ["4:5"],
  )
})

test("a variant-only delta queues its parent for review", () => {
  const node = {
    nodeId: "4:4",
    name: "Control",
    type: "COMPONENT_SET",
    pageId: "1:1",
    pageName: "Page",
  }
  const previous = {
    ...node,
    variants: [{ nodeId: "4:5", name: "Old", device: "mobile", designFingerprint: null }],
  }
  const current = {
    ...node,
    variants: [{ nodeId: "4:5", name: "New", device: "mobile", designFingerprint: null }],
  }
  assert.deepEqual(
    compareSnapshots([previous], [current]).changed.map((entry) => entry.nodeId),
    ["4:4"],
  )
})

import { catalogueExitCode } from "../../src/figma/catalogue/finish.ts"

test("validation failures take precedence over drift", () => {
  assert.equal(catalogueExitCode(["drift"], [], ["drift"]), 3)
  assert.equal(catalogueExitCode(["drift"], ["invalid registry"], ["drift"]), 1)
  assert.equal(catalogueExitCode(["invalid input", "drift"], [], ["drift"]), 1)
})
