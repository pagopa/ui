// An ordinary pull request proves the diff it carries: the story suite runs the
// story files that diff reaches, and the complete catalogue and the engine a
// pull request skips stay on the nightly. The visual diff is Chromatic's
// (ADR-0018, `chromatic.test.mjs`): what is left here is the browser suites in
// `deep-checks.yml`.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { load } from "js-yaml"

const repository = fileURLToPath(new URL("../../../../", import.meta.url))
const read = (file) => fs.readFileSync(path.join(repository, file), "utf8")

const deepChecks = load(read(".github/workflows/deep-checks.yml"))

// A job is found by the command it runs, not by its display name.
function jobRunning(workflow, command) {
  const found = Object.entries(workflow.jobs).find(([, job]) =>
    (job.steps ?? []).some((step) => (step.run ?? "").includes(command)),
  )
  assert.ok(found, `no job runs ${command}`)
  return found[1]
}

function stepRunning(job, command) {
  const found = (job.steps ?? []).find((step) => (step.run ?? "").includes(command))
  assert.ok(found, `no step runs ${command}`)
  return found
}

test("an ordinary pull request runs only the story files its diff reaches", () => {
  const job = jobRunning(deepChecks, "affected -t test:webkit")
  const proven = stepRunning(job, "affected -t test:webkit")
  assert.equal(proven.if, "github.event_name == 'pull_request'")
  assert.equal(proven.env.BASE, "${{ github.event.pull_request.base.sha }}")
  // `--changed` is the selection: the project is the whole catalogue, so an
  // affected task alone would run the whole suite.
  assert.match(proven.run, /--changed="\$BASE"/)

  const complete = stepRunning(job, "pagopa-ui-storybook:test:stories")
  assert.equal(
    complete.if,
    "github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'",
  )
  assert.doesNotMatch(complete.run, /--changed/, "the complete pass is scoped to a diff")
})

test("the nightly keeps the engine a pull request does not run", () => {
  const job = jobRunning(deepChecks, "affected -t test:webkit")
  const engines = stepRunning(job, "browsers=")

  assert.match(engines.run, /pull_request[\s\S]*?browsers=webkit"/)
  assert.match(engines.run, /else[\s\S]*?browsers=firefox webkit/)
})
