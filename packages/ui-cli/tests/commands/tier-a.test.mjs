import assert from "node:assert/strict"
import { test } from "node:test"
import { fixtureTree, runCli } from "../helpers/cli.mjs"

const files = {
  "src/catalog/figma/inventory.json": {
    fileKey: "file",
    syncedAt: "2026-01-01",
    components: [
      { nodeId: "4:4", name: "Button", type: "COMPONENT", pageId: "1:1", pageName: "Page" },
    ],
  },
  "src/catalog/figma/registry.json": { entries: { "4:4": { status: "pending" } } },
}

test("status reports the token source but never its value", async () => {
  const fixture = fixtureTree(files, "tier-status-")
  try {
    const result = await runCli(["figma", "status", "--json"], {
      root: fixture.root,
      env: { FIGMA_TOKEN: "private-token-value" },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).token.source, "environment")
    assert.doesNotMatch(result.stdout, /private-token-value/)
  } finally {
    fixture.dispose()
  }
})

test("brief queue includes each pending brief in implementation order", async () => {
  const fixture = fixtureTree(files, "tier-queue-")
  try {
    const result = await runCli(["figma", "brief", "--queue", "--json"], { root: fixture.root })
    assert.equal(result.status, 0, result.stderr)
    const queue = JSON.parse(result.stdout)
    assert.deepEqual(queue.implementationOrder, ["4:4"])
    assert.equal(queue.items[0].brief.node, "4:4")
    assert.equal(queue.items[0].class, "pending")
    assert.deepEqual(queue.items[0].devices, [])
  } finally {
    fixture.dispose()
  }
})

test("require-token rejects an invalid token before a live command runs", async () => {
  const fixture = fixtureTree(files, "tier-token-")
  try {
    const result = await runCli(["figma", "status", "--require-token"], {
      root: fixture.root,
      env: { FIGMA_TOKEN: "invalid token" },
    })
    assert.equal(result.status, 2)
    assert.match(result.stderr, /FIGMA_TOKEN/)
    assert.doesNotMatch(result.stderr, /invalid token/)
  } finally {
    fixture.dispose()
  }
})

test("brief refresh requires a token before touching snapshots", async () => {
  const fixture = fixtureTree(files, "tier-brief-refresh-")
  try {
    const result = await runCli(
      ["figma", "brief", "--node", "4:4", "--refresh", "--require-token"],
      { root: fixture.root, env: { FIGMA_TOKEN: "invalid token" } },
    )
    assert.equal(result.status, 2)
    assert.match(result.stderr, /FIGMA_TOKEN/)
  } finally {
    fixture.dispose()
  }
})

test("token preflight covers live image commands", async () => {
  const fixture = fixtureTree(files, "tier-images-")
  try {
    for (const argv of [
      ["parity", "source", "4:4", "--png", "--require-token"],
      ["update", "evidence", "--require-token"],
    ]) {
      const result = await runCli(argv, {
        root: fixture.root,
        env: { FIGMA_TOKEN: "invalid token" },
      })
      assert.equal(result.status, 2, result.stderr)
      assert.match(result.stderr, /FIGMA_TOKEN/)
    }
  } finally {
    fixture.dispose()
  }
})

test("brief queue includes pending registry entries missing from the inventory", async () => {
  const fixture = fixtureTree(
    {
      ...files,
      "src/catalog/figma/registry.json": {
        entries: { "4:4": { status: "pending" }, "9:9": { status: "pending" } },
      },
    },
    "tier-queue-orphan-",
  )
  try {
    const result = await runCli(["figma", "brief", "--queue", "--json"], { root: fixture.root })
    assert.equal(result.status, 0, result.stderr)
    const queue = JSON.parse(result.stdout)
    assert.deepEqual(queue.implementationOrder, ["4:4", "9:9"])
    assert.equal(queue.items[1].brief.node, "9:9")
  } finally {
    fixture.dispose()
  }
})
