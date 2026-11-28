import assert from "node:assert/strict"
import { test } from "node:test"
import { fixtureTree, runCli } from "../helpers/cli.mjs"

// A retirement answers before it reads the tree, so the fixture only has to
// exist for the workspace root to resolve.
const files = {
  "src/catalog/figma/inventory.json": { fileKey: "file", syncedAt: "2026-01-01", components: [] },
}

const RETIRED = [
  {
    argv: ["figma", "registry", "set", "4:4", "--status", "pending"],
    replacement: "pnpm ui-cli record <nodeId> --status <status>",
  },
  { argv: ["figma", "devices"], replacement: "pnpm ui-cli check devices" },
]

// A retired spelling that printed a bare "unknown command" left the reader to
// find the replacement; the pointer is the whole reason the node still exists.
test("a retired command names the command that replaced it, on stderr", async () => {
  const fixture = fixtureTree(files, "retired-")
  try {
    for (const { argv, replacement } of RETIRED) {
      const result = await runCli(argv, { root: fixture.root })
      assert.equal(result.status, 2, result.stderr)
      assert.equal(result.stdout, "")
      assert.match(result.stderr, /is retired: run /)
      assert.ok(result.stderr.includes(replacement), result.stderr)
    }
  } finally {
    fixture.dispose()
  }
})

test("the retired nodes stay in the tree so the usage text can explain them", async () => {
  const fixture = fixtureTree(files, "retired-help-")
  try {
    const result = await runCli(["figma", "registry", "--help"], { root: fixture.root })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Retired: use pnpm ui-cli record/)
  } finally {
    fixture.dispose()
  }
})

// `update inventory` used to accept `--triage`, which forwarded a flag the run
// already decided: the queueing read has its own command.
test("update inventory carries no --triage flag", async () => {
  const fixture = fixtureTree(files, "retired-triage-")
  try {
    const result = await runCli(["update", "inventory", "--help"], { root: fixture.root })
    assert.equal(result.status, 0, result.stderr)
    assert.doesNotMatch(result.stdout, /--triage/)
    assert.match(result.stdout, /--prBody/)
  } finally {
    fixture.dispose()
  }
})
