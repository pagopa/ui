#!/usr/bin/env node
// Changed-only Vitest runs — the local iteration loop.
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import type { TestingAdapters } from "../adapters/testing.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { output, type ParityOutput } from "../parity/output.ts"

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

function writeMarker(file: string, since: string, recordedAt: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify({ since, recordedAt: recordedAt }, null, 2)}\n`)
}

export type ChangedOptions = {
  coverage?: boolean
  all?: boolean
  since?: string
  passthrough?: string[]
}

export function runChanged(
  workspace: Workspace,
  options: ChangedOptions,
  adapters: TestingAdapters,
): ParityOutput {
  const out: string[] = []
  const err: string[] = []
  const cwd = workspace.root
  let root: string
  try {
    const top = git(adapters, cwd, ["rev-parse", "--show-toplevel"])
    if (!top) throw new Error("git returned no repository root")
    root = top
  } catch (error) {
    throw new UsageError(
      `the changed-only run needs a git repository: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const kind: PassKind = options.coverage ? "coverage" : "fast"
  const file = markerFile(root, kind)
  const label = options.coverage ? "coverage pass" : "fast pass"
  const recorded = readMarker(file)

  const { baseline, changed, outsideGraph } = changedSelection(
    root,
    options,
    adapters,
    recorded,
    err,
  )
  out.push(...changedSummary(label, baseline, changed, outsideGraph, options.coverage))
  const arguments_ = vitestArguments(options, baseline)
  const result = adapters.vitest(cwd, arguments_)
  if (result.stdout) out.push(result.stdout.replace(/\n$/, ""))
  if (result.stderr) err.push(result.stderr.replace(/\n$/, ""))
  if (result.error) throw new UsageError(result.error.message)
  const code = result.status ?? 1

  if (code === 0 && !options.since) {
    const head = resolveCommit(adapters, root, "HEAD")
    if (!head) err.push("[changed] HEAD is not a commit: no baseline recorded")
    else {
      writeMarker(file, head, adapters.now().toISOString())
      out.push(`[changed] baseline recorded: ${head.slice(0, 7)} (${label})`)
    }
  }
  return output(code, out, err)
}

export { isOutsideGraph }
function git(
  adapters: TestingAdapters,
  root: string,
  args: string[],
  { required = true }: { required?: boolean } = {},
): string | null {
  const result = adapters.git(root, args)
  if (result.status !== 0) {
    if (!required) return null
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`)
  }
  return result.stdout.trim()
}

function resolveCommit(adapters: TestingAdapters, root: string, ref: string): string | null {
  const resolved = git(adapters, root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
    required: false,
  })
  return resolved === "" ? null : resolved
}

function changedPaths(adapters: TestingAdapters, root: string, since: string): string[] | null {
  const committed = git(adapters, root, ["diff", "--name-only", `${since}...HEAD`], {
    required: false,
  })
  if (committed === null) return null
  const staged = git(adapters, root, ["diff", "--cached", "--name-only"], { required: false }) ?? ""
  const unstaged =
    git(adapters, root, ["ls-files", "--other", "--modified", "--exclude-standard"], {
      required: false,
    }) ?? ""
  const paths = [...committed.split("\n"), ...staged.split("\n"), ...unstaged.split("\n")]
  return [...new Set(paths.filter((entry) => entry !== ""))]
}

function changedSelection(
  root: string,
  options: ChangedOptions,
  adapters: TestingAdapters,
  recorded: string | null,
  err: string[],
) {
  let baseline: string | null = null
  if (options.since) {
    baseline = resolveCommit(adapters, root, options.since)
    if (!baseline)
      throw new UsageError(`--since ${options.since} is not a commit of this repository`)
  } else if (!options.all && recorded) {
    baseline = resolveCommit(adapters, root, recorded)
    if (!baseline) {
      err.push(
        `[changed] the recorded baseline ${recorded.slice(0, 7)} is not a commit of this repository: running the full suite`,
      )
    }
  }

  let changed: string[] | null = null
  let outsideGraph: string[] = []
  if (baseline) {
    changed = changedPaths(adapters, root, baseline)
    if (changed === null) {
      err.push(
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

  return { baseline, changed, outsideGraph }
}

function changedSummary(
  label: string,
  baseline: string | null,
  changed: string[] | null,
  outsideGraph: string[],
  coverage: boolean | undefined,
): string[] {
  const out: string[] = []
  if (!baseline && outsideGraph.length > 0) {
    out.push(
      `[changed] ${label} — ${outsideGraph.join(", ")} ${outsideGraph.length === 1 ? "is" : "are"} outside the module graph: running every test file`,
    )
  } else if (!baseline) out.push(`[changed] ${label} — no baseline: running every test file`)
  else if ((changed ?? []).length === 0) {
    out.push(
      `[changed] ${label} — nothing changed since ${baseline.slice(0, 7)}: no test file is affected`,
    )
  } else {
    out.push(
      `[changed] ${label} — ${(changed ?? []).length} path(s) changed since ${baseline.slice(0, 7)}: running the affected test files`,
    )
  }
  if (coverage && baseline) {
    out.push(
      "[changed] coverage applies to the changed files only: their per-file gates still apply, the global thresholds need `pnpm test:coverage`",
    )
  }

  return out
}

function vitestArguments(options: ChangedOptions, baseline: string | null): string[] {
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
  arguments_.push(...(options.passthrough ?? []))

  return arguments_
}
