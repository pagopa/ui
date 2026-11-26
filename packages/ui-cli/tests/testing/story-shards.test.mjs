import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import yaml from "js-yaml"

const WORKSPACE = path.resolve(import.meta.dirname, "../../../..")
const STORYBOOK = path.join(WORKSPACE, "apps", "storybook")
const VITEST = path.join(STORYBOOK, "node_modules", "vitest", "vitest.mjs")
const WORKFLOW = path.join(WORKSPACE, ".github", "workflows", "deep-checks.yml")
const SELECTOR = "--shard=${{ matrix.shard }}/${{ strategy.job-total }}"

// `list --filesOnly` loads the app's Vitest config, so it answers for the
// selector the way the run resolves it: a selector the configuration accepts
// exits clean, one it cannot honour exits non-zero.
function listStories({ mode, shard }) {
  const args = ["list", "--filesOnly", "--json", `--shard=${shard}`]
  if (mode) args.push("--mode", mode)
  return spawnSync(process.execPath, [VITEST, ...args], {
    cwd: STORYBOOK,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
}

function storyJob() {
  const workflow = yaml.load(fs.readFileSync(WORKFLOW, "utf8"))
  const found = Object.entries(workflow.jobs).find(([, job]) =>
    (job.steps ?? []).some((step) => (step.run ?? "").includes("pagopa-ui-storybook:test:stories")),
  )
  assert.ok(found, "deep-checks.yml has no job running the full story pass")
  return found[1]
}

test("the full, the WebKit and the coverage story runs accept a shard selector", () => {
  for (const mode of [null, "webkit", "coverage"]) {
    const run = listStories({ mode, shard: "2/4" })
    assert.equal(run.status, 0, `${mode ?? "full"} run rejected --shard=2/4:\n${run.stderr}`)
  }
})

test("a story run rejects a shard past its count instead of ignoring the selector", () => {
  const run = listStories({ mode: "webkit", shard: "5/4" })
  assert.notEqual(run.status, 0, "the runner accepted 5/4: it does not honour the selector")
  assert.match(run.stderr, /--shard/)
})

test("the full story pass is spread across parallel runners", () => {
  const job = storyJob()
  const matrix = job.strategy?.matrix
  assert.ok(matrix, "the full story job has no matrix: its run is one runner")
  const lists = [...String(matrix.shard).matchAll(/'(\[[^\]]*\])'/g)].map((match) =>
    JSON.parse(match[1]),
  )
  assert.match(String(matrix.shard), /fromJSON\(/)
  assert.equal(
    lists.length,
    2,
    `the matrix names no pull-request and full shard lists: ${matrix.shard}`,
  )
  const [proven, full] = lists
  assert.deepEqual(proven, [1], "a pull request proves its files on one shard")
  assert.deepEqual(
    full,
    full.map((_, index) => index + 1),
    `the full shard list is not 1..n: ${full}`,
  )
  assert.ok(full.length > 1, `the full pass is not sharded: ${full}`)

  const runs = (job.steps ?? []).filter((step) =>
    /pagopa-ui-storybook:test:(stories|webkit)/.test(step.run ?? ""),
  )
  assert.ok(runs.length > 0, "the story job runs no story target")
  for (const step of runs) {
    assert.ok(step.run.includes(SELECTOR), `${step.name} does not hand its shard to the runner`)
  }
})

test("every shard records its timings under its own artifact", () => {
  const uploads = (storyJob().steps ?? []).filter((step) =>
    String(step.uses ?? "").startsWith("actions/upload-artifact"),
  )
  assert.ok(uploads.length > 0, "the story job records no artifact")
  for (const upload of uploads) {
    assert.match(
      String(upload.with?.name),
      /\$\{\{ matrix\.shard \}\}/,
      `${upload.name} is shared by every shard`,
    )
  }
})
