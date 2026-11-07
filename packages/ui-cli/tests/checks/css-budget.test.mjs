import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import {
  checkCssBudget,
  measure,
  measureCss,
  updateCssBudget,
} from "../../src/checks/css-budget.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

const CSS = `.a{color:red}.b{display:flex}`.repeat(20)
const METRICS = measure(CSS)
const within = (delta) => ({
  raw: METRICS.raw + delta,
  gzip: METRICS.gzip + 200,
  brotli: METRICS.brotli + 200,
})

function fixture(budget) {
  const files = {
    "package.json": { name: "fixture", exports: { "./styles.css": "./dist/styles.css" } },
    "dist/styles.css": CSS,
    ...(budget === null ? {} : { "data/css-budget.json": budget }),
  }
  const tree = fixtureTree(files)
  const budgetFile = path.join(tree.root, "data/css-budget.json")
  return {
    ...tree,
    budgetFile,
    workspace: workspaceAt(tree.root),
    readBudget: () => JSON.parse(fs.readFileSync(budgetFile, "utf8")),
  }
}

test("a stylesheet at the ceiling passes", () => {
  const tree = fixture({ schemaVersion: 1, metrics: within(0) })
  try {
    const result = checkCssBudget(tree.workspace, { budgetFile: tree.budgetFile })
    assert.deepEqual(result.problems, [])
    assert.equal(result.name, "css budget")
  } finally {
    tree.dispose()
  }
})

test("growth past the margin fails on the metric that moved", () => {
  const tree = fixture({ schemaVersion: 1, metrics: within(-1) })
  try {
    const result = checkCssBudget(tree.workspace, { budgetFile: tree.budgetFile })
    assert.ok(
      result.problems.some((problem) => /raw: \d+ bytes, the ceiling is \d+ \(\+1\)/.test(problem)),
    )
    assert.ok(result.problems.every((problem) => !problem.includes("gzip:")))
  } finally {
    tree.dispose()
  }
})

test("a raise is a manual edit: the failure reports every measured size", () => {
  const tree = fixture({ schemaVersion: 1, metrics: within(-1) })
  try {
    const result = checkCssBudget(tree.workspace, { budgetFile: tree.budgetFile })
    assert.match(
      result.summary,
      new RegExp(`measured raw ${METRICS.raw} / gzip ${METRICS.gzip} / brotli ${METRICS.brotli}`),
    )
    assert.match(result.summary, /copy the sizes you accept into data\/css-budget\.json/)
  } finally {
    tree.dispose()
  }
})

test("measureCss returns current sizes without enforcing the ceiling", () => {
  const tree = fixture({ schemaVersion: 1, metrics: within(-5000) })
  try {
    assert.deepEqual(measureCss(tree.workspace), METRICS)
  } finally {
    tree.dispose()
  }
})

test("a ceiling with slack produces an informational note and still passes", () => {
  const tree = fixture({ schemaVersion: 1, metrics: within(5000) })
  try {
    const result = checkCssBudget(tree.workspace, { budgetFile: tree.budgetFile })
    assert.deepEqual(result.problems, [])
    assert.match(result.details[0], /^note: raw: \d+ bytes, the ceiling is \d+ \(-5000\)/)
    assert.match(result.details[0], /record the size you accept with/)
  } finally {
    tree.dispose()
  }
})

test("a budget without a metric is refused", () => {
  const tree = fixture({ schemaVersion: 1, metrics: { raw: METRICS.raw } })
  try {
    assert.ok(
      checkCssBudget(tree.workspace, { budgetFile: tree.budgetFile }).problems.some((problem) =>
        problem.includes('missing the "gzip" ceiling'),
      ),
    )
  } finally {
    tree.dispose()
  }
})

test("a missing budget asks to create it", () => {
  const tree = fixture(null)
  try {
    assert.ok(
      checkCssBudget(tree.workspace, { budgetFile: tree.budgetFile }).problems.some((problem) =>
        problem.includes("missing the budget"),
      ),
    )
  } finally {
    tree.dispose()
  }
})

test("updateCssBudget records current sizes and keeps the note", () => {
  const tree = fixture({ schemaVersion: 1, note: "why", metrics: within(5000) })
  try {
    assert.match(
      updateCssBudget(tree.workspace, { budgetFile: tree.budgetFile }),
      /css budget written/,
    )
    const budget = tree.readBudget()
    assert.deepEqual(budget.metrics, METRICS)
    assert.equal(budget.note, "why")
    assert.deepEqual(checkCssBudget(tree.workspace, { budgetFile: tree.budgetFile }).problems, [])
  } finally {
    tree.dispose()
  }
})

test("updateCssBudget never raises a ceiling", () => {
  const tree = fixture({ schemaVersion: 1, metrics: within(-1000) })
  try {
    assert.match(
      updateCssBudget(tree.workspace, { budgetFile: tree.budgetFile }),
      /kept the higher raw ceiling/,
    )
    const budget = tree.readBudget()
    assert.equal(budget.metrics.raw, METRICS.raw - 1000)
    assert.equal(budget.metrics.gzip, METRICS.gzip)
  } finally {
    tree.dispose()
  }
})

test("check css --measure and --budget use the specified budget", async () => {
  const tree = fixture({ schemaVersion: 1, metrics: within(0) })
  try {
    const measured = await runCli(["check", "css", "--measure"], { root: tree.root })
    assert.equal(measured.status, 0)
    assert.deepEqual(JSON.parse(measured.stdout), METRICS)
    const checked = await runCli(["check", "css", "--budget", tree.budgetFile], { root: tree.root })
    assert.equal(checked.status, 0)
    assert.match(checked.stdout, /^css budget: OK — raw /)
  } finally {
    tree.dispose()
  }
})

test("update css --budget writes the supplied budget file", async () => {
  const tree = fixture({ schemaVersion: 1, metrics: within(5000) })
  try {
    const result = await runCli(["update", "css", "--budget", tree.budgetFile], { root: tree.root })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /^css budget written: raw /)
    assert.deepEqual(tree.readBudget().metrics, METRICS)
  } finally {
    tree.dispose()
  }
})
