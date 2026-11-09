import assert from "node:assert/strict"
import fs from "node:fs"
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

const totalOf = (entries) =>
  entries.reduce(
    (sum, entry) => sum + (entry.kind === "file" || entry.kind === "entry" ? entry.bytes : 0),
    0,
  )

// The fixture holds the measured trees and the baseline only: the check reads
// the workspace the fixture builds, so a route declaration and a rendered
// context are passed in exactly as the command declares them. The baseline is
// written from the measurement this tree produces, so a test states the ratchet
// state it is about instead of every byte the fixture happens to hold: zero
// offenders by default, the measured total, or what `options.baseline` says.
function budget(files, options = {}) {
  const tree = fixtureTree({ "data/baseline.json": {}, [ROOT]: "entry", ...files })
  try {
    const workspace = workspaceAt(tree.root)
    const { baseline: declared, ...measured } = { routes: [], contexts: [], ...options }
    const measurement = measureContextBudget(workspace, measured)
    const baselineFile = path.join(tree.root, "data/baseline.json")
    fs.writeFileSync(
      baselineFile,
      JSON.stringify(
        typeof declared === "function"
          ? declared(measurement)
          : (declared ?? { overBudget: 0, totalBytes: totalOf(measurement.entries) }),
      ),
    )
    return checkContextBudget(workspace, { ...measured, baselineFile })
  } finally {
    tree.dispose()
  }
}

const overCount = (measurement) => measurement.entries.filter((e) => e.bytes > e.ceiling).length

const problems = (result) => result.problems.join("\n")
const bytes = (count) => "x".repeat(count)

function route(files, name = "fixture route", boundaries = []) {
  return { name, root: ROOT, boundaries, files }
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

// Routes overlap where a session shares a file: the boundary is what stops the
// traversal, so the route that enters counts the bytes and this one does not.
test("a link across a boundary is allowed and not traversed", () => {
  const result = budget(
    {
      [ROOT]: "[a](references/a.md) [b](references/b.md)",
      [reference("a")]: "a",
      [reference("b")]: "b",
    },
    {
      routes: [
        {
          name: "entry route",
          root: ROOT,
          boundaries: [reference("b")],
          files: [ROOT, reference("a")],
        },
        { name: "branch route", root: reference("b"), boundaries: [], files: [reference("b")] },
      ],
    },
  )
  assert.deepEqual(result.problems, [])
  assert.match(result.details.join("\n"), /route\s+"entry route"\s+[\d.]+ KB\s+ok/)
})

test("a boundary that starts no route and no skill fails", () => {
  const result = budget(
    { [ROOT]: "[a](references/a.md)", [reference("a")]: "a" },
    { routes: [route([ROOT], "fixture route", [reference("a")])] },
  )
  assert.match(
    problems(result),
    /route "fixture route": \.agents\/skills\/figma-to-code\/references\/a\.md is declared as a boundary but is neither a route root nor a skill entry/,
  )
})

test("a count below the baseline asks to lower it", () => {
  const result = budget(
    { [ROOT]: "entry" },
    { baseline: (measurement) => ({ overBudget: 2, totalBytes: totalOf(measurement.entries) }) },
  )
  assert.match(
    problems(result),
    /data\/context-budget\.json: 0 entries are over budget, lower overBudget to 0 and run `pnpm nx run pagopa-ui-cli:check:context-budget`/,
  )
})

test("a count equal to the baseline passes", () => {
  const result = budget(
    { [ROOT]: "entry", [reference("big")]: bytes(CONTEXT_BUDGET_LIMITS.file + 1024) },
    {
      baseline: (measurement) => ({
        overBudget: overCount(measurement),
        totalBytes: totalOf(measurement.entries),
      }),
    },
  )
  assert.deepEqual(result.problems, [])
  assert.equal(result.details.length, 2)
})

// The ratchet has to be able to act at zero offenders too, or "lower the
// baseline" is prose nothing can reach: the total is what a byte added anywhere
// still fails.
test("a total above the baseline fails and names the gate", () => {
  const result = budget(
    { [ROOT]: "entry" },
    {
      baseline: (measurement) => ({ overBudget: 0, totalBytes: totalOf(measurement.entries) - 1 }),
    },
  )
  assert.match(
    problems(result),
    /data\/context-budget\.json: the measured context is 5 bytes, the baseline allows 4 — cut the context instead of raising the total, then run `pnpm nx run pagopa-ui-cli:check:context-budget`/,
  )
})

test("a total below the baseline asks to lower it", () => {
  const result = budget(
    { [ROOT]: "entry" },
    {
      baseline: (measurement) => ({ overBudget: 0, totalBytes: totalOf(measurement.entries) + 1 }),
    },
  )
  assert.match(
    problems(result),
    /data\/context-budget\.json: the measured context is 5 bytes, lower totalBytes to 5 and run `pnpm nx run pagopa-ui-cli:check:context-budget`/,
  )
})

test("the total a session reads only where the export exists is not in the ratchet", () => {
  const contexts = [
    { kind: "card", name: "node card", render: () => "clean" },
    {
      kind: "card",
      name: "node card with local comments and delta",
      render: () => "local delta",
      snapshot: true,
    },
  ]
  const result = budget(
    { [ROOT]: "entry" },
    { contexts, baseline: () => ({ overBudget: 0, totalBytes: "entry".length }) },
  )
  assert.deepEqual(result.problems, [])
  assert.match(result.summary, /3 entries, 0 over budget, 5 bytes/)
})

// The ceilings are code. This is what keeps them code: raising one has to edit
// this test, in a diff a reviewer reads, rather than a JSON file the check would
// agree with.
test("each ceiling is pinned to its specified number", () => {
  assert.equal(CONTEXT_BUDGET_LIMITS.entry, 1536, "a SKILL.md entry reads in 1.5 KB")
  assert.equal(CONTEXT_BUDGET_LIMITS.file, 4096, "a reference file reads in 4 KB")
  assert.equal(CONTEXT_BUDGET_LIMITS.route, 8192, "a route's whole read set reads in 8 KB")
  assert.equal(CONTEXT_BUDGET_LIMITS.card, 1536, "the node card reads in 1.5 KB")
  assert.equal(CONTEXT_BUDGET_LIMITS.preamble, 1024, "the workflow preamble reads in 1 KB")
})

test("the committed baseline holds the ratchet state and nothing else", () => {
  const tree = fixtureTree({
    "data/baseline.json": { overBudget: 0, totalBytes: 5, note: "a note is not ratchet state" },
    [ROOT]: "entry",
  })
  try {
    assert.throws(
      () =>
        checkContextBudget(workspaceAt(tree.root), {
          baselineFile: path.join(tree.root, "data/baseline.json"),
          routes: [],
          contexts: [],
        }),
      /data\/baseline\.json: unknown key "note"/,
    )
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
  assert.match(problems(result), /run `pnpm nx run pagopa-ui-cli:check:context-budget`/)
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
  assert.match(
    result.summary,
    /\d+ entries, \d+ over budget, \d+ bytes, the baseline allows \d+ over and \d+ bytes/,
  )
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
