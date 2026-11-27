// The visual diff moved to Chromatic (ADR-0018): the workflow that runs it is
// opt-in through one secret, it compares what the event deserves and it reports
// rather than gates. These are the wiring properties a laptop cannot prove —
// that a missing token is green, that nothing spends the token before the probe
// read it, that the release pass covers the whole catalogue, and that the
// Playwright harness the decision retires is really gone.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { load } from "js-yaml"

const repository = fileURLToPath(new URL("../../../../", import.meta.url))
const read = (file) => fs.readFileSync(path.join(repository, file), "utf8")
const exists = (file) => fs.existsSync(path.join(repository, file))

const workflow = load(read(".github/workflows/chromatic.yml"))
const job = workflow.jobs.chromatic
const names = job.steps.map((candidate) => candidate.name)
const step = (name) => {
  const found = job.steps.find((candidate) => candidate.name === name)
  assert.ok(found, `no step named ${name}`)
  return found
}
const PROBE = "Check the project token"
const gated = job.steps.filter((candidate) => candidate.name !== PROBE)

test("a missing token leaves the run green and says so", () => {
  const probe = step(PROBE)
  assert.match(probe.run, /CHROMATIC_PROJECT_TOKEN/)
  assert.match(probe.run, /present=false/)
  assert.match(probe.run, /::notice::/)
  // The token reaches the probe through the environment, never as an argument.
  assert.equal(probe.env.CHROMATIC_PROJECT_TOKEN, "${{ secrets.CHROMATIC_PROJECT_TOKEN }}")
  assert.doesNotMatch(probe.run, /--project-token/)
})

test("the probe runs first, and every step that spends the token waits for it", () => {
  assert.equal(names[0], PROBE, `the probe is not the first step: ${names.join(", ")}`)
  for (const candidate of gated) {
    // The timing upload still runs when the build failed; everything else is
    // plain conditional.
    assert.match(
      candidate.if,
      /^(always\(\) && )?steps\.token\.outputs\.present == 'true'$/,
      `${candidate.name} does not wait for the probe`,
    )
  }
  // The token is only ever handed to the CLI, and only from the environment:
  // an argument is a token in the process list and in the run log.
  const ui = step("Chromatic")
  assert.equal(ui.env.CHROMATIC_PROJECT_TOKEN, "${{ secrets.CHROMATIC_PROJECT_TOKEN }}")
  assert.doesNotMatch(ui.run, /--project-token/)
})

test("the scope follows the event: an ordinary pull request asks for TurboSnap", () => {
  const scope = step("Resolve the scope")
  assert.match(scope.run, /nx-release\/\*/)
  assert.match(scope.run, /scope=all/)
  assert.match(scope.run, /scope=changed/)
  // The scheduled and the manual run carry no head ref: they are the whole
  // catalogue, like the release pull request.
  assert.match(scope.run, /nx-release\/\*\|""\)/)

  const ui = step("Chromatic")
  // `--only-changed` is the changed scope's flag and nothing else's.
  assert.match(ui.run, /flags=\(--ci\)/)
  assert.match(ui.run, /flags\+=\(--only-changed\)/)
  assert.equal((ui.run.match(/--only-changed/g) ?? []).length, 1)
  assert.match(ui.run, /flags\[@\]/)
  // The build precedes the upload: Chromatic uploads, it does not build.
  assert.ok(names.indexOf("Build the Storybook") < names.indexOf("Chromatic"))
})

test("the comparison reports, it does not gate", () => {
  // `exit-zero-on-changes` is pinned in the config the CLI reads, not passed by
  // the workflow, so a local run behaves like the CI one.
  const config = JSON.parse(read("apps/storybook/chromatic.config.json"))
  assert.equal(config.exitZeroOnChanges, true)
  assert.equal(config.storybookBuildDir, "dist")
  assert.equal(config.storybookBaseDir, "apps/storybook")
  const ui = step("Chromatic")
  assert.doesNotMatch(ui.run, /--exit-zero-on-changes/, "the flag is duplicated into the run")
  assert.doesNotMatch(ui.run, /--auto-accept-changes/)
})

test("the triggers are the pull request, the nightly and the manual run", () => {
  // `on` is a YAML 1.1 boolean: js-yaml may parse it under the boolean key.
  const on = workflow.on ?? workflow[true]
  assert.deepEqual(on.pull_request.types, ["opened", "synchronize", "reopened", "ready_for_review"])
  assert.equal(on.schedule?.[0]?.cron, "0 4 * * *")
  assert.ok("workflow_dispatch" in on)
  assert.equal(on.push, undefined, "a merge to main re-compares what the pull request did")
})

test("no fork, no draft and no review branch reaches the token", () => {
  assert.match(job.if, /github\.event\.pull_request\.draft == false/)
  assert.match(job.if, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/)
  assert.match(job.if, /github\.head_ref != 'feedback\/previews'/)
  // TurboSnap computes the changed files from the history a shallow clone
  // cannot see.
  assert.equal(step("Checkout").with["fetch-depth"], 0)
  assert.equal(step("Checkout").with["persist-credentials"], false)
})

test("the Storybook declares the widths Chromatic renders", () => {
  // ADR-0004's breakpoints, not Chromatic's default set.
  assert.match(read("apps/storybook/.storybook/preview.tsx"), /viewports:\s*\[320, 600, 1200\]/)
})

test("the catalogues that change with everything else are exempted by parameter", () => {
  for (const file of [
    "apps/storybook/src/Foundations.stories.tsx",
    "apps/storybook/src/FigmaInventory.stories.tsx",
  ]) {
    assert.match(
      read(file),
      /chromatic: \{ disableSnapshot: true \}/,
      `${file} is still snapshotted`,
    )
  }
  // The tag the retired runner read is gone: leaving it would read as if a
  // story were exempted from something.
  const root = path.join(repository, "apps/storybook/src")
  for (const file of fs.readdirSync(root)) {
    if (!/\.stories\.tsx?$/.test(file)) continue
    assert.doesNotMatch(read(path.join("apps/storybook/src", file)), /no-visual/, file)
  }
})

test("the Playwright harness the decision retires is gone", () => {
  assert.equal(exists(".github/workflows/visual.yml"), false)
  assert.equal(exists("apps/storybook/visual"), false)
  for (const retired of [
    "packages/ui-cli/src/testing/visual.ts",
    "packages/ui-cli/src/testing/visual-baselines.ts",
    "packages/ui-cli/src/testing/visual-cases.ts",
    "packages/ui-cli/tests/testing/visual-scope.test.mjs",
    "packages/ui-cli/tests/testing/visual-baselines.test.mjs",
    "packages/ui-cli/tests/workflows/visual-baselines.test.mjs",
  ]) {
    assert.equal(exists(retired), false, `${retired} survived the decision`)
  }
  // No target keeps a runner alive.
  for (const manifest of [
    "apps/storybook/package.json",
    "apps/storybook/project.json",
    "packages/ui-cli/package.json",
  ]) {
    assert.doesNotMatch(read(manifest), /test:visual/, manifest)
  }
  // The Chromatic target builds first and never caches: a snapshot is a
  // comparison against a service, so a cache hit would report a diff that was
  // never computed.
  const project = JSON.parse(read("apps/storybook/project.json"))
  assert.deepEqual(project.targets.chromatic, { dependsOn: ["build"], cache: false })
})
