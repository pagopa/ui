// The visual baselines live outside git: a dedicated storage repository, read
// shallowly, keyed by the built index, the engine and the pinned image. These
// are the wiring properties the runner cannot prove from a laptop — a checkout
// that carries no image, a fetch that feeds the preflight, and no job that
// writes an image back. The commands themselves are run by the workflow.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { load } from "js-yaml"

const repository = fileURLToPath(new URL("../../../../", import.meta.url))
const read = (file) => fs.readFileSync(path.join(repository, file), "utf8")
const exists = (file) => fs.existsSync(path.join(repository, file))
const git = (...args) =>
  execFileSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })

const visualWorkflow = load(read(".github/workflows/visual.yml"))
const job = visualWorkflow.jobs.visual
const step = (name) => {
  const found = (job.steps ?? []).find((candidate) => candidate.name === name)
  assert.ok(found, `no step named ${name}`)
  return found
}

test("the baselines are not tracked, and a clone cannot fetch them", () => {
  const tracked = git("ls-files", "--", "apps/storybook/visual/__screenshots__")
  assert.equal(tracked.trim(), "", "the visual baselines are still tracked in git")
  // The suite writes a mismatch under the same directory on a failed run: the
  // path stays ignored so a local capture never becomes a commit.
  assert.match(read(".gitignore"), /^apps\/storybook\/visual\/__screenshots__\/$/m)
  assert.equal(
    git("check-ignore", "apps/storybook/visual/__screenshots__/components-card--plain.png").trim(),
    "apps/storybook/visual/__screenshots__/components-card--plain.png",
  )
})

test("the run fetches the set its key names before it checks anything", () => {
  const names = (job.steps ?? []).map((candidate) => candidate.name)
  const fetched = names.indexOf("Fetch the visual baselines")
  const scope = names.indexOf("Scope the run")
  const capture = names.indexOf("Visual regression")

  assert.ok(fetched >= 0, "the workflow never fetches the baselines")
  assert.ok(fetched < scope && scope < capture, `the fetch runs out of order: ${names.join(", ")}`)
  // The preflight asserts the scoped images are present; it reads the fetched
  // set, and the fetch is what makes its absence actionable.
  assert.match(step("Scope the run").run, /--check-baselines/)
  // The index the key hashes is built before the fetch reads it.
  assert.ok(names.indexOf("Build the Storybook") < fetched)
})

test("the fetch reads the storage repository with the run's token", () => {
  const fetched = step("Fetch the visual baselines")

  assert.match(
    fetched.run,
    /pagopa-ui-cli:test:visual -- --fetch-baselines/,
    "the fetch does not go through the one runner",
  )
  assert.equal(fetched.env.GITHUB_TOKEN, "${{ secrets.GITHUB_TOKEN }}")
  // Shallow: the storage repository is read for one key's images, never for its
  // history, and it lands outside every package.
  assert.match(job.env.VISUAL_SNAPSHOT_DIR, /\.nx\/visual-baselines\/snapshots$/)
})

test("the key names the image the job actually renders in", () => {
  const container = String(job.container.image)
  const digest = container.split("@")[1]

  assert.ok(digest?.startsWith("sha256:"), `the container image is not pinned: ${container}`)
  assert.ok(
    String(job.env.VISUAL_BASELINE_IMAGE).endsWith(`@${digest}`),
    "the baseline key names an image other than the container's",
  )
  assert.match(
    String(job.container.image),
    /^mcr\.microsoft\.com\/playwright:v[\d.]+-noble@sha256:/,
  )
})

test("no job writes a baseline back into the checkout", () => {
  assert.equal(
    visualWorkflow.jobs["visual-update"],
    undefined,
    "the visual-update job still exists",
  )
  assert.deepEqual(visualWorkflow.on.pull_request.types, ["opened", "synchronize", "reopened"])

  const workflow = read(".github/workflows/visual.yml")
  assert.doesNotMatch(
    workflow,
    /__screenshots__/,
    "the workflow still names the committed baselines",
  )
  assert.doesNotMatch(workflow, /git push/, "a step still pushes to the checkout")
  assert.doesNotMatch(
    workflow,
    /test:visual:update/,
    "a step still writes baselines in the checkout",
  )
  assert.doesNotMatch(workflow, /contents: write/, "the job still holds write access")
  // The labels went with the job that answered them.
  assert.doesNotMatch(workflow, /visual:update|visual:check/)
})

test("one runner owns the visual diff", () => {
  assert.equal(
    exists(".github/workflows/chromatic.yml"),
    false,
    "the Chromatic workflow still exists",
  )
  assert.equal(
    exists("apps/storybook/chromatic.config.json"),
    false,
    "the Chromatic config still exists",
  )

  const pkg = JSON.parse(read("apps/storybook/package.json"))
  assert.equal(
    Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).includes(
      "@chromatic-com/storybook",
    ),
    false,
    "the Chromatic addon is still a dependency",
  )
  assert.doesNotMatch(read("apps/storybook/.storybook/main.ts"), /chromatic/)

  const workflows = fs.readdirSync(path.join(repository, ".github/workflows"))
  for (const file of workflows) {
    assert.doesNotMatch(
      read(path.join(".github/workflows", file)),
      /chromaui/,
      `${file} still runs Chromatic`,
    )
  }
  assert.doesNotMatch(read("docs/figma-drift-secrets.md"), /CHROMATIC_PROJECT_TOKEN/)
})
