// An ordinary pull request proves the diff it carries. The visual gate captures
// the stories that diff can move, the story suite runs the story files it
// reaches, and a diff that moves no story passes with nothing to capture. The
// complete catalogue and the engine a pull request skips stay on the nightly and
// on the release pull request. These are the wiring properties; the commands
// themselves are run by the workflow, never here.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { load } from "js-yaml"

const repository = fileURLToPath(new URL("../../../../", import.meta.url))
const read = (file) => fs.readFileSync(path.join(repository, file), "utf8")

const visualWorkflow = load(read(".github/workflows/visual.yml"))
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

test("an ordinary pull request is what the visual gate runs for", () => {
  const job = jobRunning(visualWorkflow, "pagopa-ui-storybook:test:visual")

  // No opt-in label and no release branch: the gate belongs to every pull
  // request that is not the read-only review preview.
  assert.doesNotMatch(
    String(job.if),
    /visual:check/,
    "the visual gate still waits for the opt-in label",
  )
  assert.doesNotMatch(
    String(job.if),
    /nx-release/,
    "the visual gate named the release branch in its condition instead of its capture",
  )
  assert.match(String(job.if), /github\.head_ref != 'feedback\/previews'/)
})

test("the release pull request and the nightly keep the whole catalogue", () => {
  const job = jobRunning(visualWorkflow, "pagopa-ui-storybook:test:visual")
  const scope = stepRunning(job, "pagopa-ui-cli:test:visual")

  // The empty HEAD_REF is the scheduled and the dispatched run; `nx-release/*`
  // is the Version Packages pull request. Both capture everything.
  assert.match(scope.run, /nx-release\/\*\|""\)[\s\S]*?--all[^\n]*--check-baselines/)
  assert.match(scope.run, /--since "\$BASE"[^\n]*--check-baselines/)
  assert.equal(scope.env.BASE, "${{ github.event.pull_request.base.sha }}")
  assert.equal(scope.env.VISUAL_SCOPE, "apps/storybook/visual/scope.json")
})

test("a pull request that moves no story passes with nothing to capture", () => {
  const job = jobRunning(visualWorkflow, "pagopa-ui-storybook:test:visual")
  const capture = stepRunning(job, "pagopa-ui-storybook:test:visual")

  // An empty scope leaves no test behind: the flag is what keeps that a green
  // pass rather than a runner error, and the spec prints why.
  assert.match(capture.run, /--pass-with-no-tests/)
  assert.match(read("apps/storybook/visual/visual.spec.ts"), /nothing to capture/)
})

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
