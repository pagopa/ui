import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { measure } from "../../src/checks/css-budget.ts"
import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))
const CSS = `.a{color:red}.b{display:flex}`.repeat(20)
const METRICS = measure(CSS)
const within = (delta) => ({
  raw: METRICS.raw + delta,
  gzip: METRICS.gzip + 200,
  brotli: METRICS.brotli + 200,
})

// Every test cleans up its fixture root in its own finally.
function fixture(budget) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-css-budget-"))
  const budgetPath = path.join(root, "data/css-budget.json")
  const files = {
    "package.json": JSON.stringify({
      name: "fixture",
      exports: { "./styles.css": "./dist/styles.css" },
    }),
    "dist/styles.css": CSS,
    ...(budget === null ? {} : { "data/css-budget.json": JSON.stringify(budget) }),
  }
  for (const [file, source] of Object.entries(files)) {
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, source)
  }
  return {
    root,
    run: (...args) =>
      spawnSync(process.execPath, [script, "check", "css", ...args], {
        cwd: root,
        encoding: "utf8",
        env: fixtureEnv(root, { PAGOPA_UI_CSS_BUDGET: budgetPath }),
      }),
    budget: () => JSON.parse(fs.readFileSync(budgetPath, "utf8")),
  }
}

test("a stylesheet at the ceiling passes", () => {
  const { root, run } = fixture({ schemaVersion: 1, metrics: within(0) })
  try {
    const result = run()
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /css budget OK/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("growth past the margin fails on the metric that moved", () => {
  const { root, run } = fixture({ schemaVersion: 1, metrics: within(-1) })
  try {
    const result = run()
    assert.equal(result.status, 1)
    assert.match(result.stderr, /raw: \d+ bytes, the ceiling is \d+ \(\+1\)/)
    assert.doesNotMatch(result.stderr, /gzip:/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a raise is a manual edit: the failure prints every measured size", () => {
  const { root, run } = fixture({ schemaVersion: 1, metrics: within(-1) })
  try {
    const result = run()
    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      new RegExp(`measured: raw ${METRICS.raw} / gzip ${METRICS.gzip} / brotli ${METRICS.brotli}`),
    )
    assert.match(result.stderr, /data\/css-budget\.json/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("--measure prints the current sizes and enforces nothing", () => {
  const { root, run } = fixture({ schemaVersion: 1, metrics: within(-5000) })
  try {
    const result = run("--measure")
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), METRICS)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a ceiling with slack warns and still passes", () => {
  const { root, run } = fixture({ schemaVersion: 1, metrics: within(5000) })
  try {
    const result = run()
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /^note: raw: \d+ bytes, the ceiling is \d+ \(-5000\)/m)
    assert.match(result.stdout, /record the size you accept with/)
    assert.match(result.stdout, /css budget OK/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a budget without a metric is refused", () => {
  const { root, run } = fixture({ schemaVersion: 1, metrics: { raw: METRICS.raw } })
  try {
    const result = run()
    assert.equal(result.status, 1)
    assert.match(result.stderr, /missing the "gzip" ceiling/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a missing budget tells how to create it", () => {
  const { root, run } = fixture(null)
  try {
    const result = run()
    assert.equal(result.status, 1)
    assert.match(result.stderr, /missing the budget/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("--write records the current sizes and keeps the note", () => {
  const { root, run, budget } = fixture({ schemaVersion: 1, note: "why", metrics: within(5000) })
  try {
    const result = run("--write")
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(budget().metrics, METRICS)
    assert.equal(budget().note, "why")
    assert.equal(run().status, 0)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("--write never raises a ceiling", () => {
  const { root, run, budget } = fixture({ schemaVersion: 1, metrics: within(-1000) })
  try {
    const result = run("--write")
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /kept the higher raw ceiling/)
    assert.equal(budget().metrics.raw, METRICS.raw - 1000)
    assert.equal(budget().metrics.gzip, METRICS.gzip)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
