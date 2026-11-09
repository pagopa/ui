import assert from "node:assert/strict"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  checkContextBudget,
  CONTEXT_BUDGET_LIMITS,
  measureContextBudget,
} from "../../src/checks/context-budget.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

const SKILL = ".agents/skills/figma-to-code"
const ROOT = `${SKILL}/SKILL.md`
const reference = (name) => `${SKILL}/references/${name}.md`

// The fixture holds the measured trees and the baseline only: the check reads
// the workspace the fixture builds, so a route declaration and a rendered
// context are passed in exactly as the command declares them.
function budget(files, options = {}) {
  const tree = fixtureTree({ "data/baseline.json": baseline(0), ...files })
  try {
    const result = checkContextBudget(workspaceAt(tree.root), {
      baselineFile: path.join(tree.root, "data/baseline.json"),
      routes: [],
      contexts: [],
      ...options,
    })
    return result
  } finally {
    tree.dispose()
  }
}

function baseline(overBudget, ceilings = CONTEXT_BUDGET_LIMITS) {
  return { ceilings, overBudget, note: "fixture" }
}

const problems = (result) => result.problems.join("\n")
const bytes = (count) => "x".repeat(count)

function route(files, name = "fixture route") {
  return { name, root: ROOT, files }
}

test("a skill file over its ceiling fails and names it", () => {
  const result = budget({
    [ROOT]: "entry",
    [reference("big")]: bytes(CONTEXT_BUDGET_LIMITS.file + 1024),
  })
  assert.match(
    problems(result),
    /file \.agents\/skills\/figma-to-code\/references\/big\.md: 5\.0 KB over the 4\.0 KB ceiling/,
  )
})

test("a skill file of exactly the ceiling is not over it", () => {
  const result = budget({
    [ROOT]: "entry",
    [reference("exact")]: bytes(CONTEXT_BUDGET_LIMITS.file),
  })
  assert.deepEqual(result.problems, [])
})

test("a skill entry over its ceiling fails and names it", () => {
  const result = budget({ [ROOT]: bytes(CONTEXT_BUDGET_LIMITS.entry + 1) })
  assert.match(
    problems(result),
    /entry \.agents\/skills\/figma-to-code\/SKILL\.md: 1\.5 KB over the 1\.5 KB ceiling/,
  )
})

test("a route over its ceiling fails even when every file in it is under", () => {
  const files = [ROOT, reference("a"), reference("b")]
  const result = budget(
    {
      [ROOT]: `[a](references/a.md) [b](references/b.md)${bytes(960)}`,
      [reference("a")]: bytes(4000),
      [reference("b")]: bytes(4000),
    },
    { routes: [route(files)], baseline: undefined },
  )
  assert.match(
    problems(result),
    /route "fixture route": 8\.8 KB over the 8\.0 KB ceiling \(3 files\)/,
  )
})

test("a file reachable from the route root but not declared fails", () => {
  const result = budget(
    {
      [ROOT]: "[a](references/a.md) [b](references/b.md)",
      [reference("a")]: "a",
      [reference("b")]: "b",
    },
    { routes: [route([ROOT, reference("a")])] },
  )
  assert.match(
    problems(result),
    /route "fixture route": \.agents\/skills\/figma-to-code\/references\/b\.md is reachable from \.agents\/skills\/figma-to-code\/SKILL\.md but not declared/,
  )
})

test("a declared file the links do not reach fails", () => {
  const result = budget(
    {
      [ROOT]: "[a](references/a.md)",
      [reference("a")]: "a",
      [reference("c")]: "c",
    },
    { routes: [route([ROOT, reference("a"), reference("c")])] },
  )
  assert.match(
    problems(result),
    /route "fixture route": \.agents\/skills\/figma-to-code\/references\/c\.md is declared but not reachable from \.agents\/skills\/figma-to-code\/SKILL\.md/,
  )
})

test("a count below the baseline asks to lower it", () => {
  const tree = fixtureTree({ "data/baseline.json": baseline(2), [ROOT]: "entry" })
  try {
    const result = checkContextBudget(workspaceAt(tree.root), {
      baselineFile: path.join(tree.root, "data/baseline.json"),
      routes: [],
      contexts: [],
    })
    assert.match(
      problems(result),
      /data\/context-budget\.json: 0 entries are over budget, lower overBudget to 0/,
    )
  } finally {
    tree.dispose()
  }
})

test("a count equal to the baseline passes", () => {
  const files = { [ROOT]: "entry", [reference("big")]: bytes(CONTEXT_BUDGET_LIMITS.file + 1024) }
  const tree = fixtureTree({ "data/baseline.json": baseline(1), ...files })
  try {
    const result = checkContextBudget(workspaceAt(tree.root), {
      baselineFile: path.join(tree.root, "data/baseline.json"),
      routes: [],
      contexts: [],
    })
    assert.deepEqual(result.problems, [])
    assert.equal(result.details.length, 2)
  } finally {
    tree.dispose()
  }
})

test("the baseline cannot loosen a ceiling", () => {
  const tree = fixtureTree({
    "data/baseline.json": baseline(0, { ...CONTEXT_BUDGET_LIMITS, file: 8 * 1024 }),
    [ROOT]: "entry",
  })
  try {
    const result = checkContextBudget(workspaceAt(tree.root), {
      baselineFile: path.join(tree.root, "data/baseline.json"),
      routes: [],
      contexts: [],
    })
    assert.match(problems(result), /the file ceiling is 8192, the limit is 4096/)
  } finally {
    tree.dispose()
  }
})

test("a rendered card over its ceiling fails and names it", () => {
  const result = budget(
    { [ROOT]: "entry" },
    {
      contexts: [
        { kind: "card", name: "node card", render: () => bytes(CONTEXT_BUDGET_LIMITS.card + 1) },
      ],
    },
  )
  assert.match(problems(result), /card "node card": 1\.5 KB over the 1\.5 KB ceiling/)
})

test("a rendered context that cannot be measured fails without a stack", () => {
  const result = budget(
    { [ROOT]: "entry" },
    {
      contexts: [
        {
          kind: "preamble",
          name: "workflow preamble",
          render: () => {
            throw new Error("missing template")
          },
        },
      ],
    },
  )
  assert.match(problems(result), /preamble "workflow preamble": missing template/)
})

const REPO = fileURLToPath(new URL("../../../../", import.meta.url))
const DESIGN_SYSTEM = path.join(REPO, "packages/pagopa-ui")

test("the measurement names every entry and its ceiling", () => {
  const measurement = measureContextBudget(workspaceAt(DESIGN_SYSTEM))
  assert.ok(measurement.entries.length > 0)
  for (const entry of measurement.entries) {
    assert.ok(entry.bytes > 0)
    assert.equal(entry.ceiling, CONTEXT_BUDGET_LIMITS[entry.kind])
  }
})

test("the committed declaration matches the links and the committed baseline", () => {
  const result = checkContextBudget(workspaceAt(DESIGN_SYSTEM))
  assert.deepEqual(result.problems, [])
  assert.match(result.summary, /over budget, the baseline allows \d+/)
})

test("--report never fails and prints the same rows", async () => {
  const files = {
    [ROOT]: "entry",
    [reference("big")]: bytes(CONTEXT_BUDGET_LIMITS.file + 1024),
  }
  const tree = fixtureTree(files)
  try {
    const failing = await runCli(["check", "context-budget"], { root: tree.root })
    const report = await runCli(["check", "context-budget", "--report"], { root: tree.root })
    const rows = (output) =>
      output.split("\n").filter((line) => /^(entry|file|route|card|preamble)\s/.test(line))
    assert.equal(failing.status, 1)
    assert.equal(report.status, 0)
    assert.deepEqual(rows(report.stdout), rows(failing.stdout))
    assert.match(
      rows(report.stdout)[0],
      /file\s+\.agents\/skills\/figma-to-code\/references\/big\.md/,
    )
  } finally {
    tree.dispose()
  }
})
