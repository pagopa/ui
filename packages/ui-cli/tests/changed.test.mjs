import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../src/lib/paths.ts"

const script = fileURLToPath(new URL("../src/cli.ts", import.meta.url))
const fakeVitest = fileURLToPath(
  new URL("./fixtures/vitest-changed/fake-vitest.mjs", import.meta.url),
)
const OUTPUT_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-vitest-changed-out-"))
const COVERAGE_ARGUMENTS = [
  "--coverage",
  "--mode",
  "coverage",
  "--coverage.thresholds.statements=0",
  "--coverage.thresholds.branches=0",
  "--coverage.thresholds.functions=0",
  "--coverage.thresholds.lines=0",
]

let sequence = 0

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

function commit(root, message) {
  git(root, ["add", "-A"])
  git(root, [
    "-c",
    "user.email=fixture@example.com",
    "-c",
    "user.name=Fixture",
    "commit",
    "-q",
    "-m",
    message,
  ])
  return git(root, ["rev-parse", "HEAD"])
}

// A repository with one commit and the real `.gitignore` shape: the baseline
// marker must stay invisible to the changed set it is measured against.
function repository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-vitest-changed-"))
  git(root, ["init", "-q"])
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  fs.writeFileSync(path.join(root, ".gitignore"), "node_modules\n")
  fs.writeFileSync(path.join(root, "package.json"), '{ "name": "fixture", "private": true }\n')
  commit(root, "base")
  return root
}

function withRepository(run) {
  const root = repository()
  try {
    return run(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

function markerPath(root, kind = "fast") {
  const name = kind === "coverage" ? "vitest-coverage-changed.json" : "vitest-changed.json"
  return path.join(root, "node_modules", ".cache", "pagopa-ui", name)
}

function readBaseline(root, kind = "fast") {
  try {
    return JSON.parse(fs.readFileSync(markerPath(root, kind), "utf8")).since
  } catch {
    return null
  }
}

function run(root, args = [], { cwd = root, exit = 0 } = {}) {
  sequence += 1
  const argumentsFile = path.join(OUTPUT_ROOT, `arguments-${sequence}.json`)
  const result = spawnSync(process.execPath, [script, "test", "changed", ...args], {
    cwd,
    encoding: "utf8",
    env: fixtureEnv(cwd, {
      PAGOPA_UI_VITEST_BIN: fakeVitest,
      FAKE_VITEST_ARGS_FILE: argumentsFile,
      FAKE_VITEST_EXIT: String(exit),
    }),
  })
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    vitest: fs.existsSync(argumentsFile)
      ? JSON.parse(fs.readFileSync(argumentsFile, "utf8"))
      : null,
  }
}

test("the first run has no baseline: every test file runs and HEAD is recorded", () => {
  withRepository((root) => {
    const status = git(root, ["status", "--porcelain"])
    const result = run(root, [], { cwd: path.join(root, "src") })

    assert.equal(result.status, 0)
    assert.deepEqual(result.vitest, ["--run"])
    assert.match(result.stdout, /no baseline: running every test file/)
    // The marker belongs to the repository, not to the directory of the call.
    assert.equal(readBaseline(root), git(root, ["rev-parse", "HEAD"]))
    assert.match(result.stdout, /baseline recorded: [0-9a-f]{7} \(fast pass\)/)
    // The tool only reads: no index entry, no worktree file was touched.
    assert.equal(git(root, ["status", "--porcelain"]), status)
  })
})

test("the next run hands the recorded baseline to Vitest", () => {
  withRepository((root) => {
    run(root)
    fs.writeFileSync(path.join(root, "src", "component.ts"), "export const value = 1\n")
    const result = run(root, [])

    assert.deepEqual(result.vitest, ["--run", "--changed", git(root, ["rev-parse", "HEAD"])])
    assert.match(result.stdout, /1 path\(s\) changed since [0-9a-f]{7}/)
  })
})

test("an empty window reports that no test file is affected", () => {
  withRepository((root) => {
    run(root)
    const result = run(root)

    assert.deepEqual(result.vitest, ["--run", "--changed", git(root, ["rev-parse", "HEAD"])])
    assert.match(result.stdout, /nothing changed since [0-9a-f]{7}: no test file is affected/)
  })
})

test("a commit after the baseline stays in the window", () => {
  withRepository((root) => {
    run(root)
    const baseline = readBaseline(root)
    fs.writeFileSync(path.join(root, "src", "component.ts"), "export const value = 1\n")
    const head = commit(root, "feat: add the component")

    const result = run(root)
    assert.deepEqual(result.vitest, ["--run", "--changed", baseline])
    assert.match(result.stdout, /1 path\(s\) changed since/)
    assert.equal(readBaseline(root), head)
  })
})

test("a failing run does not advance the baseline", () => {
  withRepository((root) => {
    run(root)
    const baseline = readBaseline(root)
    fs.writeFileSync(path.join(root, "src", "component.ts"), "export const value = 1\n")
    const head = commit(root, "feat: add the component")

    const failed = run(root, [], { exit: 1 })
    assert.equal(failed.status, 1)
    assert.equal(readBaseline(root), baseline)
    assert.doesNotMatch(failed.stdout, /baseline recorded/)

    run(root)
    assert.equal(readBaseline(root), head)
  })
})

test("every pass keeps its own baseline", () => {
  withRepository((root) => {
    run(root)
    assert.notEqual(readBaseline(root, "coverage"), git(root, ["rev-parse", "HEAD"]))

    const coverage = run(root, ["--coverage"])
    assert.deepEqual(coverage.vitest, ["--run", "--coverage", "--mode", "coverage"])
    assert.doesNotMatch(coverage.stdout, /coverage applies to the changed files only/)
    assert.equal(readBaseline(root, "coverage"), git(root, ["rev-parse", "HEAD"]))

    const again = run(root, ["--coverage"])
    assert.deepEqual(again.vitest, [
      "--run",
      "--changed",
      git(root, ["rev-parse", "HEAD"]),
      ...COVERAGE_ARGUMENTS,
    ])
    assert.match(again.stdout, /coverage applies to the changed files only/)
  })
})

test("a change outside the module graph runs every test file", () => {
  withRepository((root) => {
    run(root)
    fs.mkdirSync(path.join(root, ".storybook"), { recursive: true })
    fs.writeFileSync(path.join(root, ".storybook", "preview.tsx"), "export default {}\n")
    const storybook = run(root)

    assert.deepEqual(storybook.vitest, ["--run"])
    assert.match(storybook.stdout, /\.storybook\/preview\.tsx is outside the module graph/)
    assert.match(storybook.stdout, /running every test file/)

    assert.equal(readBaseline(root), git(root, ["rev-parse", "HEAD"]))
    fs.writeFileSync(path.join(root, "src", "index.css"), ":root { --probe: 1 }\n")
    const stylesheet = run(root)

    assert.deepEqual(stylesheet.vitest, ["--run"])
    assert.match(stylesheet.stdout, /src\/index\.css are outside the module graph/)
  })
})

test("a stale baseline falls back to the full suite", () => {
  withRepository((root) => {
    fs.mkdirSync(path.dirname(markerPath(root)), { recursive: true })
    fs.writeFileSync(
      markerPath(root),
      `${JSON.stringify({ since: "0".repeat(40), recordedAt: "2026-10-15T00:00:00.000Z" })}\n`,
    )

    const result = run(root)
    assert.equal(result.status, 0)
    assert.deepEqual(result.vitest, ["--run"])
    assert.match(result.stderr, /is not a commit of this repository: running the full suite/)
    assert.equal(readBaseline(root), git(root, ["rev-parse", "HEAD"]))
  })
})

test("--all ignores the baseline and records the new one", () => {
  withRepository((root) => {
    run(root)
    fs.writeFileSync(path.join(root, "src", "component.ts"), "export const value = 1\n")
    const head = commit(root, "feat: add the component")

    const result = run(root, ["--all"])
    assert.deepEqual(result.vitest, ["--run"])
    assert.match(result.stdout, /no baseline: running every test file/)
    assert.equal(readBaseline(root), head)
  })
})

test("--since uses an explicit ref and records nothing", () => {
  withRepository((root) => {
    const head = git(root, ["rev-parse", "HEAD"])
    const result = run(root, ["--since", "HEAD"])

    assert.deepEqual(result.vitest, ["--run", "--changed", head])
    assert.doesNotMatch(result.stdout, /baseline recorded/)
    assert.equal(readBaseline(root), null)
  })
})

test("arguments after -- reach Vitest unchanged", () => {
  withRepository((root) => {
    const result = run(root, ["--", "--reporter=verbose", "--bail=1"])
    assert.deepEqual(result.vitest, ["--run", "--reporter=verbose", "--bail=1"])
  })
})

test("invalid input fails with the usage and never runs Vitest", () => {
  withRepository((root) => {
    const unknown = run(root, ["--bogus"])
    assert.equal(unknown.status, 2)
    assert.match(unknown.stderr, /unknown option --bogus: pass Vitest arguments after --/)
    assert.equal(unknown.vitest, null)

    const missing = run(root, ["--since"])
    assert.equal(missing.status, 2)
    assert.match(missing.stderr, /--since needs a git ref/)

    const unreachable = run(root, ["--since", "no-such-ref"])
    assert.equal(unreachable.status, 2)
    assert.match(unreachable.stderr, /no-such-ref is not a commit of this repository/)

    const help = run(root, ["--help"])
    assert.equal(help.status, 0)
    assert.match(help.stdout, /test changed \[OPTIONS\]/)
  })
})
