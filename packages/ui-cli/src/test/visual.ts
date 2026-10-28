#!/usr/bin/env node
// The visual-regression scope of a change: the stories its diff can move.
//
// `visual.spec.ts` captures every story at three widths, so a review that
// touches one component would pay for the whole catalogue. Here the built
// Storybook index names the stories and their files, and a walk of the imports
// each story reaches decides which of them a changed file can affect. The
// nightly run stays complete, so a change the walk cannot see is caught there.
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { readJson, writeJson } from "../lib/json.ts"
import { resolveRoot, resolveStoriesRoot, resolveWorkspaceRoot } from "../lib/paths.ts"
import { parseSource, sourceDependencies } from "../lib/source-modules.ts"

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

const USAGE = `usage: ui-cli test visual --since <ref> [--index <file>] [--out <file>] [--json]
       ui-cli test visual --all [--index <file>] [--out <file>] [--json]

Writes the stories a change can affect: the built Storybook index supplies the
stories and their files, and the imports each story reaches decide whether a
changed file is visible to it. \`--all\` skips the walk and names no story, so
the runner executes the complete catalogue. The command needs the built index:
run it after \`pagopa-ui-storybook:build\`.

  --since <ref>  the git ref the change is measured against (merge-base diff)
  --index <file> the built Storybook index (default: ${DEFAULT_INDEX})
  --out <file>   write the scope as JSON, for VISUAL_SCOPE to read
  --json         print the scope instead of the summary line

Exit codes: 0, 2 on invalid input.`

type Options = {
  since: string | null
  all: boolean
  index: string
  out: string | null
  json: boolean
  help: boolean
}

function parseArguments(argv: string[]): Options {
  const options: Options = {
    since: null,
    all: false,
    index: DEFAULT_INDEX,
    out: null,
    json: false,
    help: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--help" || argument === "-h") options.help = true
    else if (argument === "--all") options.all = true
    else if (argument === "--json") options.json = true
    else if (argument === "--since" || argument === "--index" || argument === "--out") {
      const value = argv[index + 1]
      if (!value || value.startsWith("--")) throw new Error(`${argument} needs a value`)
      index += 1
      if (argument === "--since") options.since = value
      else if (argument === "--index") options.index = value
      else options.out = value
    } else {
      throw new Error(`unknown option ${argument}`)
    }
  }
  if (!options.help && !options.all && !options.since) {
    throw new Error("pass --since <ref> or --all")
  }
  return options
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
    const identity = identityOf(file, workspace)
    const parsed = parseSource(identity)
    resolved = sourceDependencies(identity, parsed).flatMap((dependency) =>
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
    if (entry.type !== "story" || !entry.importPath) continue
    if ((entry.tags ?? []).includes("no-visual")) continue
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

function git(args: string[], workspace: string): string[] | null {
  const result = spawnSync("git", args, { cwd: workspace, encoding: "utf8" })
  if (result.status !== 0) return null
  return result.stdout
    .split("\n")
    .map((file) => file.trim())
    .filter((file) => file !== "")
}

function changedPaths(since: string, workspace: string): string[] | null {
  const resolved = spawnSync("git", ["rev-parse", "--verify", "--quiet", `${since}^{commit}`], {
    cwd: workspace,
    encoding: "utf8",
  })
  if (resolved.status !== 0) return null
  const committed = git(["diff", "--name-only", "--no-renames", `${since}...HEAD`], workspace)
  if (committed === null) return null
  // The local run sees the working tree too, like `test changed`: the CI
  // checkout is clean, a developer's diff against `main` is not.
  const staged = git(["diff", "--cached", "--name-only"], workspace) ?? []
  const unstaged = git(["ls-files", "--other", "--modified", "--exclude-standard"], workspace) ?? []
  return [...new Set([...committed, ...staged, ...unstaged])]
}

export function runVisual(argv: string[] = process.argv.slice(2)): number {
  let options: Options
  try {
    options = parseArguments(argv)
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`)
    return 2
  }
  if (options.help) {
    console.log(USAGE)
    return 0
  }

  const workspace = resolveWorkspaceRoot()
  const designSystem = path.join(resolveRoot(), "src")
  const storiesRoot = resolveStoriesRoot()
  const indexFile = path.resolve(workspace, options.index)
  if (!isFile(indexFile)) {
    console.error(
      `error: missing ${identityOf(indexFile, workspace)}: build the Storybook first (\`pagopa-ui-storybook:build\`)`,
    )
    return 2
  }
  const index = readJson(indexFile, StoryIndexSchema)

  let scope: VisualScope
  if (options.all) {
    scope = { mode: "all", changed: [] }
  } else {
    const since: string = options.since ?? ""
    const changed = changedPaths(since, workspace)
    if (changed === null) {
      console.error(`error: cannot diff ${since} against HEAD`)
      return 2
    }
    scope = visualScope(changed, index, { storiesRoot, designSystem, workspace })
  }

  if (options.out) {
    writeJson(path.resolve(workspace, options.out), scope)
  }
  if (options.json) {
    console.log(JSON.stringify(scope, null, 2))
  } else if (scope.mode === "all") {
    const why = scope.reason ? ` (${scope.reason})` : ""
    console.log(`[visual] every story${why}: the change can move any screenshot`)
  } else {
    const total = [...visualStories(index, storiesRoot).values()].reduce(
      (count, ids) => count + ids.length,
      0,
    )
    console.log(
      `[visual] ${scope.stories?.length ?? 0} of ${total} stories are affected by ${scope.changed.length} changed path(s)`,
    )
  }
  return 0
}

export { changedPaths, visualStories }
