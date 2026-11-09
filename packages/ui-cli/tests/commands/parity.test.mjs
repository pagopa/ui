import assert from "node:assert/strict"
import { test } from "node:test"
import { runCli, fixtureTree } from "../helpers/cli.mjs"

test("the parity gate is a hermetic check, not a parity subcommand", async () => {
  const fixture = fixtureTree({
    "src/catalog/figma/registry.json": { fileKey: "fixture", entries: {}, bulkRules: [] },
    "src/catalog/figma/inventory.json": { fileKey: "fixture", components: [], componentSets: [] },
    "src/catalog/figma/device-policy.json": {
      schemaVersion: 1,
      devices: {},
      layoutScopes: ["viewport", "container"],
    },
  })
  try {
    const run = await runCli(["check", "parity", "--help"], { root: fixture.root })
    assert.equal(run.status, 0)
    assert.match(run.stdout, /parity/)
    const missing = await runCli(["parity", "check"], { root: fixture.root })
    assert.equal(missing.status, 2)
    assert.match(missing.stderr, /requires --node/)
  } finally {
    fixture.dispose()
  }
})

function emptyFixture() {
  return fixtureTree({
    "src/catalog/figma/registry.json": { entries: {}, bulkRules: [] },
    "src/catalog/figma/inventory.json": {
      fileKey: "fixture",
      syncedAt: "2026-10-21",
      components: [],
    },
    "src/catalog/figma/device-policy.json": {
      axes: ["Device"],
      any: [],
      devices: {
        desktop: { canonicalWidth: 1200, defaultLayoutScope: "viewport", aliases: ["Desktop"] },
      },
    },
    "src/catalog/figma/parity-cases.json": [],
  })
}

test("queue's JSON contract retains its ordinary shape", async () => {
  const f = emptyFixture()
  try {
    const result = await runCli(["parity", "queue", "--json"], { root: f.root })
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), {
      cases: [],
      missing: [],
      corpus: `${f.root}/src/catalog/figma/parity-cases.json`,
      mapped: 0,
    })
    assert.equal(result.stderr, "")
  } finally {
    f.dispose()
  }
})

for (const [name, args, message] of [
  ["align", ["--node", "9:9"], /9:9 is not in inventory/],
  ["capture", ["--saved"], /--saved requires one --node/],
  ["report", [], /missing: run capture first/],
  ["render", [], /render needs --story/],
]) {
  test(`${name} reports missing input through the new command adapter`, async () => {
    const f = emptyFixture()
    try {
      const result = await runCli(["parity", name, ...args], { root: f.root })
      assert.equal(result.status, 2, result.stderr)
      assert.match(result.stderr, message)
      assert.equal(result.stdout, "")
    } finally {
      f.dispose()
    }
  })
}

test("cases dry-run returns the literal empty proposal report", async () => {
  const f = emptyFixture()
  try {
    const result = await runCli(["parity", "cases", "--sync", "--dry-run"], { root: f.root })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(
      result.stdout,
      "0 device + 0 state/property proposal(s) · 0 skip(s) · 0 device case(s) missing before this run",
    )
  } finally {
    f.dispose()
  }
})

test("source reads a supplied pinned file through the in-process adapter", async () => {
  const f = emptyFixture()
  try {
    const input = new URL("../fixtures/figma-parity/snapshot-slice.json", import.meta.url).pathname
    const result = await runCli(["parity", "source", "529:6123", "--input", input, "--json"], {
      root: f.root,
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).spec.nodeId, "529:6123")
    assert.equal(result.stderr, `source: ${input} (input)`)
  } finally {
    f.dispose()
  }
})

test("update evidence reports a missing source without writing", async () => {
  const f = emptyFixture()
  try {
    const result = await runCli(["update", "evidence", "--input", "missing.json"], { root: f.root })
    assert.equal(result.status, 2, result.stderr)
    assert.match(result.stderr, /missing.*run the live export first/)
    assert.equal(result.stdout, "")
  } finally {
    f.dispose()
  }
})

test("optional comparison values and repeated interactions retain citty argument contracts", async () => {
  const f = emptyFixture()
  try {
    for (const args of [
      ["--compare-box"],
      ["--compare-box", "height"],
      ["--compare-box", "full"],
      ["--compare-offset"],
      ["--compare-offset", ".origin"],
      ["--compare-box", "full", "--compare-offset", ".origin"],
      [
        "--subject",
        "field=input",
        "--subject",
        "label=label",
        "--fill",
        "input=a",
        "--fill",
        "textarea=b",
        "--focus",
        "input",
        "--focus",
        "textarea",
      ],
    ]) {
      const result = await runCli(["parity", "check", ...args], { root: f.root })
      assert.equal(result.status, 2)
      assert.match(result.stderr, /requires --node <id> or --case/)
    }
    const invalid = await runCli(["parity", "check", "--compare-box", "invalid"], { root: f.root })
    assert.equal(invalid.status, 2)
    assert.match(invalid.stderr, /expects "height" or "full"/)
  } finally {
    f.dispose()
  }
})
