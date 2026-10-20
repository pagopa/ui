#!/usr/bin/env node
// Changed-only Vitest runs — the local iteration loop.
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { z } from "zod"

import { enterRoot } from "../lib/paths.ts"

const MARKER_DIRECTORY = path.join("node_modules", ".cache", "pagopa-ui")
const MARKERS = {
  fast: "vitest-changed.json",
  coverage: "vitest-coverage-changed.json",
} as const

type PassKind = keyof typeof MARKERS

const OUTSIDE_GRAPH_PREFIXES = [".storybook/"]
const OUTSIDE_GRAPH_DIRECTORIES = [".storybook"]
const OUTSIDE_GRAPH_SUFFIXES = [".css"]

function isOutsideGraph(file: string): boolean {
  const segments = file.split("/")
  return (
    OUTSIDE_GRAPH_PREFIXES.some((prefix) => file.startsWith(prefix)) ||
    OUTSIDE_GRAPH_DIRECTORIES.some((directory) => segments.includes(directory)) ||
    OUTSIDE_GRAPH_SUFFIXES.some((suffix) => file.endsWith(suffix))
  )
}

const USAGE = `usage: ui-cli test changed [--coverage] [--all] [--since <ref>] [-- <vitest args>]

Runs only the test files affected by the sources changed since the last
successful run of the same pass (Vitest \`--changed\`). A successful run records
the current HEAD as the baseline of that pass.

  --coverage     the Chromium/v8 coverage pass instead of the fast pass
  --all          ignore the recorded baseline: run every test file, then record
  --since <ref>  use an explicit git ref as the window; record nothing

Exit codes: 0, the Vitest exit code, 2 on invalid input.`

function fail(message: string): number {
  console.error(`error: ${message}`)
  return 2
}

function git(
  root: string,
  args: string[],
  { required = true }: { required?: boolean } = {},
): string | null {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" })
  if (result.status !== 0) {
    if (!required) return null
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`)
  }
  return result.stdout.trim()
}

function resolveCommit(root: string, ref: string): string | null {
  const resolved = git(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
    required: false,
  })
  return resolved === "" ? null : resolved
}

function changedPaths(root: string, since: string): string[] | null {
  const committed = git(root, ["diff", "--name-only", `${since}...HEAD`], { required: false })
  if (committed === null) return null
  const staged = git(root, ["diff", "--cached", "--name-only"], { required: false }) ?? ""
  const unstaged =
    git(root, ["ls-files", "--other", "--modified", "--exclude-standard"], { required: false }) ??
    ""
  const paths = [...committed.split("\n"), ...staged.split("\n"), ...unstaged.split("\n")]
  return [...new Set(paths.filter((entry) => entry !== ""))]
}

function markerFile(root: string, kind: PassKind): string {
  return path.join(root, MARKER_DIRECTORY, MARKERS[kind])
}

function readMarker(file: string): string | null {
  try {
    const recorded = z
      .looseObject({ since: z.string().optional() })
      .safeParse(JSON.parse(fs.readFileSync(file, "utf8")))
    return recorded.success && recorded.data.since ? recorded.data.since : null
  } catch {
    return null
  }
}

function writeMarker(file: string, since: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(
    file,
    `${JSON.stringify({ since, recordedAt: new Date().toISOString() }, null, 2)}\n`,
  )
}

function vitestBinary(): string {
  const override = process.env.PAGOPA_UI_VITEST_BIN
  if (override) return override
  const require = createRequire(path.join(process.cwd(), "package.json"))
  const manifest = z
    .looseObject({ bin: z.looseObject({ vitest: z.string().optional() }).optional() })
    .parse(require("vitest/package.json"))
  const binary = manifest.bin?.vitest
  if (!binary) throw new Error("vitest does not expose a CLI binary")
  return path.join(path.dirname(require.resolve("vitest/package.json")), binary)
}

export type ChangedOptions = {
  coverage: boolean
  all: boolean
  since: string | null
  passthrough: string[]
  help: boolean
}

export function parseArguments(argv: string[]): ChangedOptions {
  const options: ChangedOptions = {
    coverage: false,
    all: false,
    since: null,
    passthrough: [],
    help: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--help" || arg === "-h") options.help = true
    else if (arg === "--coverage") options.coverage = true
    else if (arg === "--all") options.all = true
    else if (arg === "--since") {
      index += 1
      const value = argv[index]
      if (!value) throw new Error("--since needs a git ref")
      options.since = value
    } else if (arg === "--") {
      options.passthrough = argv.slice(index + 1)
      break
    } else throw new Error(`unknown option ${arg}: pass Vitest arguments after --`)
  }
  return options
}

export function runChanged(argv: string[] = process.argv.slice(2)): number {
  let options: ChangedOptions
  try {
    options = parseArguments(argv)
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error))
  }
  if (options.help) {
    console.log(USAGE)
    return 0
  }

  enterRoot()
  const cwd = process.cwd()
  let root: string
  try {
    const top = git(cwd, ["rev-parse", "--show-toplevel"])
    if (!top) throw new Error("git returned no repository root")
    root = top
  } catch (error) {
    return fail(
      `the changed-only run needs a git repository: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const kind: PassKind = options.coverage ? "coverage" : "fast"
  const file = markerFile(root, kind)
  const label = options.coverage ? "coverage pass" : "fast pass"
  const recorded = readMarker(file)

  let baseline: string | null = null
  if (options.since) {
    baseline = resolveCommit(root, options.since)
    if (!baseline) return fail(`--since ${options.since} is not a commit of this repository`)
  } else if (!options.all && recorded) {
    baseline = resolveCommit(root, recorded)
    if (!baseline) {
      console.warn(
        `[changed] the recorded baseline ${recorded.slice(0, 7)} is not a commit of this repository: running the full suite`,
      )
    }
  }

  let changed: string[] | null = null
  let outsideGraph: string[] = []
  if (baseline) {
    changed = changedPaths(root, baseline)
    if (changed === null) {
      console.warn(
        `[changed] git cannot compare ${baseline.slice(0, 7)} with HEAD: running the full suite`,
      )
      baseline = null
    } else {
      outsideGraph = changed.filter(isOutsideGraph)
      if (outsideGraph.length > 0) {
        baseline = null
        changed = null
      }
    }
  }

  if (!baseline && outsideGraph.length > 0) {
    console.log(
      `[changed] ${label} — ${outsideGraph.join(", ")} ${outsideGraph.length === 1 ? "is" : "are"} outside the module graph: running every test file`,
    )
  } else if (!baseline) console.log(`[changed] ${label} — no baseline: running every test file`)
  else if ((changed ?? []).length === 0) {
    console.log(
      `[changed] ${label} — nothing changed since ${baseline.slice(0, 7)}: no test file is affected`,
    )
  } else {
    console.log(
      `[changed] ${label} — ${(changed ?? []).length} path(s) changed since ${baseline.slice(0, 7)}: running the affected test files`,
    )
  }
  if (options.coverage && baseline) {
    console.log(
      "[changed] coverage applies to the changed files only: their per-file gates still apply, the global thresholds need `pnpm test:coverage`",
    )
  }

  const arguments_: string[] = ["--run"]
  if (baseline) arguments_.push("--changed", baseline)
  if (options.coverage) {
    arguments_.push("--coverage", "--mode", "coverage")
    if (baseline) {
      arguments_.push(
        "--coverage.thresholds.statements=0",
        "--coverage.thresholds.branches=0",
        "--coverage.thresholds.functions=0",
        "--coverage.thresholds.lines=0",
      )
    }
  }
  arguments_.push(...options.passthrough)

  const result = spawnSync(process.execPath, [vitestBinary(), ...arguments_], {
    cwd,
    stdio: "inherit",
  })
  if (result.error) return fail(result.error.message)
  const code = result.status ?? 1

  if (code === 0 && !options.since) {
    const head = resolveCommit(root, "HEAD")
    if (!head) console.warn("[changed] HEAD is not a commit: no baseline recorded")
    else {
      writeMarker(file, head)
      console.log(`[changed] baseline recorded: ${head.slice(0, 7)} (${label})`)
    }
  }
  return code
}

export { changedPaths, isOutsideGraph, markerFile, readMarker, writeMarker }
