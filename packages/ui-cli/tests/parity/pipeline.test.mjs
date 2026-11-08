import assert from "node:assert/strict"
import { test } from "node:test"
import { check } from "../../src/parity/check.ts"
import { queue } from "../../src/parity/queue.ts"
import { fixtureTree, workspaceAt } from "../helpers/cli.mjs"

function fixture() {
  return fixtureTree({
    "src/catalog/figma/registry.json": {
      entries: {
        "9:9": { status: "pending", target: { module: "src/control.ts", export: "Control" } },
        "8:8": { status: "pending", target: { module: "src/other.ts", export: "Other" } },
      },
      bulkRules: [],
    },
    "src/catalog/figma/inventory.json": {
      fileKey: "fixture",
      syncedAt: "2026-10-21",
      components: [
        {
          nodeId: "9:9",
          name: "Control",
          type: "COMPONENT_SET",
          pageId: "1:1",
          pageName: "Fixture",
          dependencies: [{ nodeId: "8:8", external: false }],
          properties: {
            Device: {
              type: "VARIANT",
              defaultValue: "Desktop",
              variantOptions: ["Desktop", "Mobile"],
            },
          },
        },
        { nodeId: "8:8", name: "Other", type: "COMPONENT", pageId: "1:1", pageName: "Fixture" },
      ],
    },
    "src/catalog/figma/device-policy.json": {
      axes: ["Device"],
      any: [],
      devices: {
        desktop: { canonicalWidth: 1200, defaultLayoutScope: "viewport", aliases: ["Desktop"] },
        mobile: { canonicalWidth: 320, defaultLayoutScope: "viewport", aliases: ["Mobile"] },
      },
    },
    "src/catalog/figma/parity-cases.json": [
      {
        id: "desktop-empty",
        nodeId: "9:9",
        export: "Control",
        storyId: "control--empty",
        device: "desktop",
      },
      {
        id: "desktop-filled",
        nodeId: "9:9",
        export: "Control",
        storyId: "control--filled",
        device: "desktop",
      },
      {
        id: "mobile-empty",
        nodeId: "9:9",
        export: "Control",
        storyId: "control--mobile",
        device: "mobile",
      },
    ],
  })
}

test("execution failures outrank drift while all saved cases are evaluated", async () => {
  const f = fixture()
  const seen = []
  try {
    const result = await check(
      workspaceAt(f.root),
      {
        nodeId: "9:9",
        saved: true,
        json: true,
        input: new URL("../fixtures/figma-parity/snapshot-slice.json", import.meta.url).pathname,
      },
      {
        evaluate: async (_workspace, spec) => {
          seen.push(spec.id)
          if (spec.id === "desktop-empty") throw new Error("browser evaluation failed")
          return {
            report: {
              nodeId: spec.nodeId,
              variant: "1:1",
              variantName: "Fixture",
              storyId: spec.storyId,
              device: spec.device,
              verdict: "drift",
              deltas: [{ path: "root.width", expected: 100, actual: 110 }],
              advisories: [],
              residues: [],
              notes: [],
            },
            probe: {},
            mapping: [],
            err: [],
          }
        },
      },
    )
    assert.equal(result.code, 1)
    assert.deepEqual(seen, ["desktop-empty", "desktop-filled", "mobile-empty"])
    assert.equal(result.data.cases.length, 3)
    assert.match(result.err.join("\n"), /browser evaluation failed/)
  } finally {
    f.dispose()
  }
})

test("next selects a bounded dependency-first wave without changing the ordinary queue", () => {
  const f = fixture()
  try {
    const result = queue(workspaceAt(f.root), { next: true, size: 1, json: true })
    const data = JSON.parse(result.out[0])
    assert.deepEqual(data.implementationOrder, ["8:8"])
    assert.deepEqual(
      data.cases.map((item) => item.nodeId),
      ["8:8"],
    )
    assert.equal(JSON.parse(queue(workspaceAt(f.root), { json: true }).out[0]).cases.length, 2)
    assert.throws(() => queue(workspaceAt(f.root), { next: true, size: 0 }), /positive integer/)
  } finally {
    f.dispose()
  }
})

test("saved checks every state, including multiple states on the same declared device", async () => {
  const f = fixture()
  const seen = []
  try {
    const result = await check(
      workspaceAt(f.root),
      {
        nodeId: "9:9",
        saved: true,
        json: true,
        input: new URL("../fixtures/figma-parity/snapshot-slice.json", import.meta.url).pathname,
      },
      {
        evaluate: async (_workspace, spec) => {
          seen.push(spec.id)
          return {
            report: {
              nodeId: spec.nodeId,
              variant: "1:1",
              variantName: "Fixture",
              storyId: spec.storyId,
              device: spec.device,
              verdict: "verified",
              deltas: [],
              advisories: [],
              residues: [],
              notes: [],
            },
            probe: {},
            mapping: [],
            err: [],
          }
        },
      },
    )
    assert.equal(result.code, 0)
    assert.deepEqual(seen, ["desktop-empty", "desktop-filled", "mobile-empty"])
    assert.equal(result.data.cases.length, 3)
    assert.deepEqual(result.data.missingDevices, [])
  } finally {
    f.dispose()
  }
})

test("a missing story on one saved state does not hide the remaining states", async () => {
  const f = fixture()
  const seen = []
  f.write({
    "src/catalog/figma/parity-cases.json": [
      { id: "desktop-empty", nodeId: "9:9", export: "Control", device: "desktop" },
      {
        id: "desktop-filled",
        nodeId: "9:9",
        export: "Control",
        storyId: "control--filled",
        device: "desktop",
      },
      {
        id: "mobile-empty",
        nodeId: "9:9",
        export: "Control",
        storyId: "control--mobile",
        device: "mobile",
      },
    ],
  })
  try {
    const result = await check(
      workspaceAt(f.root),
      {
        nodeId: "9:9",
        saved: true,
        input: new URL("../fixtures/figma-parity/snapshot-slice.json", import.meta.url).pathname,
      },
      {
        evaluate: async (_workspace, spec) => {
          seen.push(spec.id)
          return {
            report: {
              nodeId: spec.nodeId,
              variant: "1:1",
              variantName: "Fixture",
              storyId: spec.storyId,
              device: spec.device,
              verdict: "verified",
              deltas: [],
              advisories: [],
              residues: [],
              notes: [],
            },
            probe: {},
            mapping: [],
            err: [],
          }
        },
      },
    )
    assert.equal(result.code, 2)
    assert.deepEqual(seen, ["desktop-filled", "mobile-empty"])
    assert.equal(result.data.cases.length, 3)
    assert.match(result.err.join("\n"), /desktop-empty.*declares no storyId/)
  } finally {
    f.dispose()
  }
})
