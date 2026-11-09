import assert from "node:assert/strict"
import { test } from "node:test"
import { refreshBriefSnapshots } from "../../src/figma/brief-workflow.ts"

test("brief refresh skips snapshots at the pinned version and refreshes both when stale", async () => {
  const calls = []
  const operations = {
    rules: async () => calls.push("rules"),
    comments: async () => calls.push("comments"),
  }
  await refreshBriefSnapshots("v1", "v1", "v1", operations)
  assert.deepEqual(calls, [])
  await refreshBriefSnapshots("v1", "v0", "v1", operations)
  assert.deepEqual(calls, ["rules", "comments"])
  calls.length = 0
  await refreshBriefSnapshots(undefined, "v1", "v1", operations)
  assert.deepEqual(calls, ["rules", "comments"])
})
