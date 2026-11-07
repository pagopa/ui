#!/usr/bin/env node
// The visual-regression scope of a change: the stories its diff can move.
//
// `visual.spec.ts` captures every story at three widths, so a review that
// touches one component would pay for the whole catalogue. Here the built
// Storybook index names the stories and their files, and a walk of the imports
// each story reaches decides which of them a changed file can affect. The
// nightly run stays complete, so a change the walk cannot see is caught there.
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import type { TestingAdapters } from "../adapters/testing.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { readJson, writeJson } from "../lib/json.ts"
import { parseSource, sourceDependencies } from "../lib/source-modules.ts"
import { output, type ParityOutput } from "../parity/output.ts"
import {
  isVisualStory,
  selectedVisualStories,
  UNSTABLE_VISUAL_STORIES,
  VISUAL_WIDTHS,
  visualSnapshotName,
} from "./visual-cases.ts"

const DEFAULT_INDEX = "apps/storybook/dist/index.json"

// The files every story renders through: the preview and the stylesheet it
// loads. Their imports are followed like a story's own, so the design-system
// stylesheet and the shared accessibility contract count for every story.
const SHARED = [
  "apps/storybook/.storybook/main.ts",
  "apps/storybook/.storybook/preview.tsx",
  "apps/storybook/src/preview.css",
  "apps/storybook/vite.config.ts",
]

// A change here can move every screenshot without an import edge to follow: the
// generated tokens and artwork feed every component, the fonts are referenced
// from CSS, and a manifest or lockfile change re-resolves the whole build.
const EVERYTHING_FILES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "apps/storybook/package.json",
  "packages/pagopa-ui/package.json",
  "packages/ui-cli/src/testing/visual-cases.ts",
])
const EVERYTHING_DIRECTORIES = [
  "apps/storybook/.storybook/",
  // The harness, not the stories: a change to the spec or the server changes
  // how every screenshot is taken. The committed baselines are excluded below.
  "apps/storybook/visual/",
  "packages/artwork/",
  "packages/pagopa-ui/src/assets/",
  "packages/tokens/",
]

// A baseline image is the output of a capture, not an input: the update job
// commits it, and the verifying run must not widen its scope because of it. The
// built Storybook is an artifact of the same kind.
const IGNORED = ["apps/storybook/visual/__screenshots__/", "apps/storybook/dist/"]

// The trees the build and the stories read. A path that disappeared from one of
// them can no longer be followed — its importer now resolves to nothing, and the
// edge the walk would have seen is gone — so the run widens instead of assuming
// no story noticed.
const IMPORTABLE = /^(?:apps|packages)\//

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".css"]
const INDEX_EXTENSIONS = ["index.ts", "index.tsx", "index.js", "index.jsx"]
const CSS_IMPORT = /@import\s+(?:url\(\s*)?["']([^"']+)["']/g

const StoryIndexSchema = z.looseObject({
  entries: z.record(
    z.string(),
    z.looseObject({
      id: z.string().optional(),
      type: z.string(),
      importPath: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  ),
})

type StoryIndex = z.infer<typeof StoryIndexSchema>
export type VisualScope = {
  mode: "all" | "stories"
  // The stories to capture; only `stories` mode names any.
  stories?: string[]
  // Every path the walk looked at, for the run log.
  changed: string[]
  // The path that widened the scope to every story, if one did.
  reason?: string
}

export type VisualOptions = {
  since?: string
  all?: boolean
  index?: string
  out?: string
  json?: boolean
  checkBaselines?: boolean
}

function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile()
  } catch {
    return false
  }
}

function identityOf(file: string, workspace: string): string {
  return path.relative(workspace, file).split(path.sep).join("/")
}

function resolveImport(specifier: string, from: string, designSystem: string): string | null {
  // Vite suffixes (`?raw`, `?url`, `?no-inline`) name the same module.
  const clean = specifier.replace(/[?#].*$/, "")
  let target: string | null = null
  if (clean.startsWith("@/")) target = path.join(designSystem, clean.slice(2))
  else if (clean.startsWith("./") || clean.startsWith("../")) {
    target = path.resolve(path.dirname(from), clean)
  }
  // Bare specifiers name packages: a workspace package that feeds the build is
  // named in EVERYTHING_FILES/DIRECTORIES instead of being walked.
  if (!target) return null
  const candidates = [
    target,
    ...SOURCE_EXTENSIONS.map((extension) => `${target}${extension}`),
    ...INDEX_EXTENSIONS.map((name) => path.join(target, name)),
  ]
  return candidates.find(isFile) ?? null
}

// The modules a file reaches, or throws when a source cannot be parsed: an
// unreadable file could hide any dependency, so the caller widens to every
// story instead of guessing.
function importsOf(
  file: string,
  designSystem: string,
  workspace: string,
  cache: Map<string, string[]>,
): string[] {
  const cached = cache.get(file)
  if (cached) return cached
  let resolved: string[] = []
  if (file.endsWith(".css")) {
    const source = fs.readFileSync(file, "utf8")
    resolved = [...source.matchAll(CSS_IMPORT)].flatMap((match) => {
      const dependency = resolveImport(match[1], file, designSystem)
      return dependency ? [dependency] : []
    })
  } else if (/\.[cm]?[jt]sx?$/.test(file)) {
    const parsed = parseSource(path.resolve(workspace, file))
    resolved = sourceDependencies(file, parsed).flatMap((dependency) =>
      // A type-only import is erased: it cannot move a screenshot.
      dependency.runtime ? (resolveImport(dependency.specifier, file, designSystem) ?? []) : [],
    )
  }
  cache.set(file, resolved)
  return resolved
}

function reachable(
  roots: string[],
  designSystem: string,
  workspace: string,
  cache: Map<string, string[]>,
): Set<string> {
  const seen = new Set<string>()
  const queue = [...roots]
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    if (seen.has(file)) continue
    seen.add(file)
    queue.push(...importsOf(file, designSystem, workspace, cache))
  }
  return seen
}

function isEverything(file: string): boolean {
  return (
    EVERYTHING_FILES.has(file) ||
    EVERYTHING_DIRECTORIES.some((directory) => file.startsWith(directory))
  )
}

// The stories of the index, keyed by their file, without the ones the gate
// never captures.
function visualStories(index: StoryIndex, storiesRoot: string): Map<string, string[]> {
  const byFile = new Map<string, string[]>()
  for (const [key, entry] of Object.entries(index.entries)) {
    if (!isVisualStory(entry) || !entry.importPath) continue
    const id = entry.id ?? key
    const file = path.resolve(storiesRoot, entry.importPath)
    const ids = byFile.get(file) ?? []
    ids.push(id)
    byFile.set(file, ids)
  }
  return byFile
}

export function visualScope(
  changed: string[],
  index: StoryIndex,
  {
    storiesRoot,
    designSystem,
    workspace,
  }: { storiesRoot: string; designSystem: string; workspace: string },
): VisualScope {
  const paths = changed
    .map((file) => file.split(path.sep).join("/"))
    .filter((file) => file !== "" && !IGNORED.some((prefix) => file.startsWith(prefix)))
  const everything = paths.filter(isEverything)
  if (everything.length > 0) {
    return { mode: "all", changed: paths, reason: everything[0] }
  }

  const deleted = paths.filter(
    (file) => IMPORTABLE.test(file) && !isFile(path.resolve(workspace, file)),
  )
  if (deleted.length > 0) {
    return { mode: "all", changed: paths, reason: `deleted ${deleted[0]}` }
  }

  try {
    const cache = new Map<string, string[]>()
    const shared = SHARED.map((file) => path.resolve(workspace, file)).filter(isFile)
    const sharedFiles = reachable(shared, designSystem, workspace, cache)

    const stories = new Set<string>()
    for (const [file, ids] of visualStories(index, storiesRoot)) {
      if (!isFile(file)) continue
      const files = reachable([file], designSystem, workspace, cache)
      const moves = (changedFile: string) => {
        const target = path.resolve(workspace, changedFile)
        return files.has(target) || sharedFiles.has(target)
      }
      if (paths.some(moves)) {
        for (const id of ids) stories.add(id)
      }
    }
    return { mode: "stories", stories: [...stories].sort(), changed: paths }
  } catch (error) {
    // A source the walk cannot read could reach any story: keep the gate
    // honest rather than naming the stories it happened to parse.
    return {
      mode: "all",
      changed: paths,
      reason: `cannot analyse the change: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function requiredVisualBaselines(
  index: StoryIndex,
  scope: VisualScope,
  storiesRoot: string,
): string[] {
  const selected = scope.mode === "stories" ? new Set(scope.stories ?? []) : null
  const directory = path.join(storiesRoot, "visual", "__screenshots__")
  return selectedVisualStories(index.entries, selected)
    .filter((id) => !UNSTABLE_VISUAL_STORIES.has(id))
    .flatMap((id) =>
      VISUAL_WIDTHS.map((width) => path.join(directory, visualSnapshotName(id, width))),
    )
}

export function missingVisualBaselines(
  index: StoryIndex,
  scope: VisualScope,
  storiesRoot: string,
): string[] {
  return requiredVisualBaselines(index, scope, storiesRoot).filter(baselineMissing)
}

function baselineMissing(file: string): boolean {
  return !fs.statSync(file, { throwIfNoEntry: false })?.isFile()
}

function git(adapters: TestingAdapters, args: string[], workspace: string): string[] | null {
  const result = adapters.git(workspace, args)
  if (result.status !== 0) return null
  return result.stdout
    .split("\n")
    .map((file) => file.trim())
    .filter((file) => file !== "")
}

function untrackedBaselines(
  adapters: TestingAdapters,
  files: string[],
  workspace: string,
  storiesRoot: string,
): string[] {
  if (!files.length) return []
  const directory = identityOf(path.join(storiesRoot, "visual", "__screenshots__"), workspace)
  const result = adapters.git(workspace, ["ls-files", "--cached", "-z", "--", directory])
  if (result.status !== 0) {
    throw new Error(`cannot inspect tracked visual baselines: ${result.stderr.trim()}`)
  }
  const tracked = new Set(result.stdout.split("\0"))
  return files.filter((file) => !tracked.has(identityOf(file, workspace)))
}

function changedPaths(
  adapters: TestingAdapters,
  since: string,
  workspace: string,
): string[] | null {
  const resolved = adapters.git(workspace, [
    "rev-parse",
    "--verify",
    "--quiet",
    `${since}^{commit}`,
  ])
  if (resolved.status !== 0) return null
  const committed = git(
    adapters,
    ["diff", "--name-only", "--no-renames", `${since}...HEAD`],
    workspace,
  )
  if (committed === null) return null
  // The local run sees the working tree too, like `test changed`: the CI
  // checkout is clean, a developer's diff against `main` is not.
  const staged = git(adapters, ["diff", "--cached", "--name-only"], workspace) ?? []
  const unstaged =
    git(adapters, ["ls-files", "--other", "--modified", "--exclude-standard"], workspace) ?? []
  return [...new Set([...committed, ...staged, ...unstaged])]
}

export function runVisual(
  tree: Workspace,
  options: VisualOptions,
  adapters: TestingAdapters,
): ParityOutput {
  const out: string[] = []
  const err: string[] = []
  if (!options.all && !options.since) throw new UsageError("pass --since <ref> or --all")
  const workspace = tree.workspaceRoot
  const designSystem = tree.path("src")
  const storiesRoot = tree.storiesRoot
  const indexFile = path.resolve(workspace, options.index ?? DEFAULT_INDEX)
  if (!isFile(indexFile)) {
    err.push(
      `error: missing ${identityOf(indexFile, workspace)}: build the Storybook first (\`pagopa-ui-storybook:build\`)`,
    )
    return output(2, out, err)
  }
  const index = readJson(indexFile, StoryIndexSchema)

  let scope: VisualScope
  if (options.all) {
    scope = { mode: "all", changed: [] }
  } else {
    const since: string = options.since ?? ""
    const changed = changedPaths(adapters, since, workspace)
    if (changed === null) {
      err.push(`error: cannot diff ${since} against HEAD`)
      return output(2, out, err)
    }
    scope = visualScope(changed, index, { storiesRoot, designSystem, workspace })
  }

  if (options.out) {
    writeJson(path.resolve(workspace, options.out), scope)
  }
  if (options.json) {
    out.push(JSON.stringify(scope, null, 2))
  } else if (scope.mode === "all") {
    const why = scope.reason ? ` (${scope.reason})` : ""
    out.push(`[visual] every story${why}: the change can move any screenshot`)
  } else {
    const total = [...visualStories(index, storiesRoot).values()].reduce(
      (count, ids) => count + ids.length,
      0,
    )
    out.push(
      `[visual] ${scope.stories?.length ?? 0} of ${total} stories are affected by ${scope.changed.length} changed path(s)`,
    )
  }
  if (options.checkBaselines) {
    const required = requiredVisualBaselines(index, scope, storiesRoot)
    const missing = required.filter(baselineMissing)
    const missingSet = new Set(missing)
    const untracked = untrackedBaselines(
      adapters,
      required.filter((file) => !missingSet.has(file)),
      workspace,
      storiesRoot,
    )
    if (missing.length || untracked.length) {
      if (missing.length) {
        err.push(`[visual] ${missing.length} scoped baseline(s) missing:`)
        for (const file of missing) err.push(`  ${identityOf(file, workspace)}`)
      }
      if (untracked.length) {
        err.push(`[visual] ${untracked.length} scoped baseline(s) exist but are not tracked:`)
        for (const file of untracked) err.push(`  ${identityOf(file, workspace)}`)
        err.push("[visual] Stage and commit Linux baselines before pushing.")
      }
      err.push(
        "[visual] For a pull request, use the visual:update label to create Linux baselines, review them, then remove the label and re-run the check.",
      )
      return output(1, out, err)
    }
    if (!options.json) out.push("[visual] scoped Linux baselines are present")
  }
  return output(0, out, err, scope)
}

export { visualStories }
