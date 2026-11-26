// The scheduled drift job is the one place both halves of the design source are
// read and compared with the repository. These are the properties the ticket
// fixes: the weekly cadence the docs state, the manual door, and the single
// command that reports components and tokens in the same run.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { load } from "js-yaml"

const repository = fileURLToPath(new URL("../../../../", import.meta.url))
const read = (file) => fs.readFileSync(path.join(repository, file), "utf8")

const workflow = load(read(".github/workflows/figma-drift.yml"))
const handoff = read("docs/figma-drift-handoff.md")

function steps() {
  return Object.values(workflow.jobs).flatMap((job) => job.steps ?? [])
}

test("the drift run is weekly, on the cadence the handoff document states", () => {
  assert.equal(workflow.on.schedule.length, 1)
  const cron = workflow.on.schedule[0].cron
  const [minute, hour, , , weekday] = cron.split(" ")
  assert.deepEqual([minute, hour, weekday], ["0", "4", "1"], cron)
  assert.match(handoff, /weekly, Monday 04:00 UTC/)
})

test("the drift run keeps its manual door", () => {
  assert.ok(Object.hasOwn(workflow.on, "workflow_dispatch"))
})

test("one step reports component drift and token drift together", () => {
  const detect = steps().filter((step) => step.run?.includes("update inventory"))
  assert.equal(detect.length, 1)
  const [step] = detect
  assert.match(step.run, /--pr-body \.figma\/pr-body\.md/)
  assert.match(step.run, /--tokens/)
  assert.match(step.run, /--token-drift docs\/figma-parity\/token-drift\.json/)
  assert.equal(step.env.FIGMA_TOKEN, "${{ secrets.FIGMA_TOKEN }}")
  // One job: no second, parallel drift detection to keep in step.
  assert.deepEqual(Object.keys(workflow.jobs), ["drift"])
})

// Criterion: a run that finds only token drift still opens the review change.
// The body is the gate every later step shares, and the token record is what
// the branch commits when the components did not move.
test("a token-only drift still reaches the pull request", () => {
  const open = steps().find((step) => step.run?.includes("gh pr create"))
  assert.match(open.if, /\.figma\/pr-body\.md/)
  assert.match(open.run, /git add[\s\S]*docs\/figma-parity/)
})
