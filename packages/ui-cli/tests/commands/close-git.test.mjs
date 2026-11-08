import assert from "node:assert/strict"
import { test } from "node:test"
import { gitChanges } from "../../src/adapters/close-git.ts"
import { fixtureTree, workspaceAt } from "../helpers/cli.mjs"

test("git selection includes edited and deleted cases and registry entries", () => {
  const registry = "packages/pagopa-ui/src/catalog/figma/registry.json"
  const cases = "packages/pagopa-ui/src/catalog/figma/parity-cases.json"
  const fixture = fixtureTree(
    {
      [registry]: { entries: { "4:4": { status: "implemented" } } },
      [cases]: [{ id: "two", nodeId: "6:6" }],
    },
    "close-git-",
  )
  try {
    const run = (_workspace, args) => {
      if (args[0] === "merge-base") return "base-sha"
      if (args[0] === "diff") return `${registry}\n${cases}`
      if (args[1].endsWith(registry))
        return JSON.stringify({ entries: { "4:4": { status: "pending" } } })
      return JSON.stringify([{ id: "one", nodeId: "5:5" }])
    }
    const report = gitChanges(workspaceAt(fixture.root), undefined, run)
    assert.deepEqual(report.nodes, ["4:4", "5:5", "6:6"])
    assert.deepEqual(report.files, [registry, cases])
  } finally {
    fixture.dispose()
  }
})
