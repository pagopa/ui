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
  assert.equal(proven.if, "steps.engines.outputs.full == 'false'")
  assert.equal(proven.env.BASE, "${{ github.event.pull_request.base.sha }}")
  // `--changed` is the selection: the project is the whole catalogue, so an
  // affected task alone would run the whole suite.
  assert.match(proven.run, /--changed="\$BASE"/)

  const complete = stepRunning(job, "pagopa-ui-storybook:test:stories")
  assert.equal(complete.if, "steps.engines.outputs.full == 'true'")
  assert.doesNotMatch(complete.run, /--changed/, "the complete pass is scoped to a diff")
})

// The release pull request carries the version, not the work that produced it,
// so a diff-scoped run would prove almost nothing of what it publishes: the
// scope step is the event and the ref, and no job skips the ref any more.
test("the release pull request takes the scope and the engines of the nightly", () => {
  const guard =
    'if [ "$EVENT_NAME" = "pull_request" ] && [ "${HEAD_REF#nx-release/}" = "$HEAD_REF" ]; then'
  for (const command of [
    "affected -t test:webkit",
    "affected -t test:coverage",
    "affected -t library:check",
  ]) {
    const job = jobRunning(deepChecks, command)
    assert.doesNotMatch(job.if, /nx-release/, `${command} still skips the release pull request`)
    assert.ok(
      stepRunning(job, "full=false").run.includes(guard),
      `${command} scopes anything but an ordinary pull request to the full pass`,
    )
  }

  const job = jobRunning(deepChecks, "affected -t test:webkit")
  const engines = stepRunning(job, "browsers=")
  assert.ok(engines.run.includes(guard))
  assert.match(engines.run, /else[\s\S]*?browsers=firefox webkit/)
  assert.equal(
    job.strategy.matrix.shard,
    "${{ fromJSON((github.event_name == 'pull_request' && !startsWith(github.head_ref || '', 'nx-release/')) && '[1]' || '[1,2,3,4]') }}",
    "a release pull request runs every shard",
  )
})

test("the nightly keeps the engine a pull request does not run", () => {
  const job = jobRunning(deepChecks, "affected -t test:webkit")
  const engines = stepRunning(job, "browsers=")

  assert.match(engines.run, /pull_request[\s\S]*?browsers=webkit"/)
  assert.match(engines.run, /else[\s\S]*?browsers=firefox webkit/)
})
