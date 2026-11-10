import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"
import type { Workspace } from "../adapters/workspace.ts"
import { runGh, runGit, type ExternalCommand } from "../adapters/handoff.ts"
import type { MediaCaptureInput, MediaCaptureResult } from "../adapters/handoff-media.ts"
import { captureHandoffFrame } from "../adapters/handoff-media.ts"
import type { RegistryEntry } from "../schemas/catalogue.ts"
import { committedFile, readCases, readInventory, readRegistry } from "../records/committed.ts"
import { corpusPath } from "../parity/context.ts"
import type { ParityCase } from "../schemas/parity.ts"
import { UsageError } from "../lib/command.ts"

export type HandoffMediaAdapters = {
  git: ExternalCommand
  gh: ExternalCommand
  capture(input: MediaCaptureInput): Promise<MediaCaptureResult>
  storybook(url: string): Promise<boolean>
}

export const handoffMediaAdapters: HandoffMediaAdapters = {
  git: runGit,
  gh: runGh,
  capture: captureHandoffFrame,
  storybook: async (url) => {
    try {
      return (await fetch(`${url}/iframe.html`, { signal: AbortSignal.timeout(3000) })).ok
    } catch {
      return false
    }
  },
}

type ChangedSource = { path: string; base: string | null; head: string | null }
type PlannedCase = {
  nodeId: string
  entry: RegistryEntry | undefined
  parity: ParityCase
  before: string
  after: string
}

function githubRepo(remote: string): string {
  const match = remote.match(/(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/)
  if (!match) throw new UsageError(`cannot resolve GitHub owner/repository from origin ${remote}`)
  return match[1]
}

function sourceFile(file: string): boolean {
  return /^(?:packages\/pagopa-ui\/src|apps\/storybook\/src)\/.+\.(?:[cm]?[jt]sx?|css|json)$/.test(
    file,
  )
}

function changedSources(workspace: Workspace, base: string, git: ExternalCommand): ChangedSource[] {
  if (base.startsWith("-")) throw new UsageError("--base must be a Git ref, not an option")
  const status = git(["status", "--porcelain", "--untracked-files=all"], workspace.workspaceRoot)
  if (status)
    throw new UsageError(
      "handoff media requires a clean working tree so source restoration cannot overwrite edits",
    )
  const names = git(
    ["diff", "--name-only", base, "HEAD", "--", "packages/pagopa-ui/src", "apps/storybook/src"],
    workspace.workspaceRoot,
  )
    .split("\n")
    .filter((file) => file && sourceFile(file))
  return names.map((file) => ({
    path: file,
    base: readRevision(workspace, git, base, file),
    head: readRevision(workspace, git, "HEAD", file),
  }))
}

function readRevision(
  workspace: Workspace,
  git: ExternalCommand,
  ref: string,
  file: string,
): string | null {
  try {
    return git(["show", `${ref}:${file}`], workspace.workspaceRoot)
  } catch {
    return null
  }
}

function planCases(
  workspace: Workspace,
  base: string,
  git: ExternalCommand,
  sourcePaths: Set<string>,
): PlannedCase[] {
  const registry = readRegistry(committedFile("registry", workspace.root))
  const inventory = readInventory(committedFile("inventory", workspace.root))
  const cases = readCases(corpusPath(workspace)) ?? []
  const nodes = changedNodeIds(workspace, base, git, sourcePaths)
  const relevant = nodes.flatMap((nodeId) => {
    if (!inventory.components.some((node) => node.nodeId === nodeId)) return []
    const saved = cases.filter((entry) => entry.nodeId === nodeId && entry.storyId)
    return saved.map((parity) => ({
      nodeId,
      entry: registry.entries[nodeId],
      parity,
      before: "",
      after: "",
    }))
  })
  if (!relevant.length)
    throw new UsageError("changed source has no matching node with a saved story case")
  return relevant
}

function changedNodeIds(
  workspace: Workspace,
  base: string,
  git: ExternalCommand,
  sourcePaths: Set<string>,
): string[] {
  const cwd = workspace.workspaceRoot
  // The base side comes from a git object, so it is named at the workspace
  // layout; the current side is a committed record and reads as one.
  const registryObject = "packages/pagopa-ui/src/catalog/figma/registry.json"
  const casesObject = "packages/pagopa-ui/src/catalog/figma/parity-cases.json"
  const oldRegistry = objectJson(git(["show", `${base}:${registryObject}`], cwd))
  const oldEntries = objectJson(oldRegistry?.entries)
  const currentRegistry = readRegistry(committedFile("registry", workspace.root))
  const currentEntries = objectJson(objectJson(currentRegistry)?.entries)
  const ids = new Set([...Object.keys(oldEntries ?? {}), ...Object.keys(currentEntries ?? {})])
  const changed = new Set<string>()
  for (const id of ids) {
    const before = oldEntries?.[id]
    const after = currentEntries?.[id]
    if (JSON.stringify(before) !== JSON.stringify(after)) changed.add(id)
    for (const value of [before, after]) {
      const target = objectJson(objectJson(value)?.target)
      for (const rawPath of [target?.module, target?.story]) {
        if (typeof rawPath !== "string") continue
        const sourcePath = rawPath.startsWith("src/") ? `packages/pagopa-ui/${rawPath}` : rawPath
        if (sourcePaths.has(sourcePath)) changed.add(id)
      }
    }
  }
  const oldCases = parseCaseRows(git(["show", `${base}:${casesObject}`], cwd))
  const currentCases = readCases(corpusPath(workspace)) ?? []
  const oldById = new Map(oldCases.map((entry) => [entry.id, entry]))
  const currentById = new Map(currentCases.map((entry) => [entry.id, entry]))
  for (const id of new Set([...oldById.keys(), ...currentById.keys()])) {
    const before = oldById.get(id)
    const after = currentById.get(id)
    if (JSON.stringify(before) === JSON.stringify(after)) continue
    if (before) changed.add(before.nodeId)
    if (after) changed.add(after.nodeId)
  }
  return [...changed]
}

function objectJson(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null
}

function parseCaseRows(source: string): Array<{ id: string; nodeId: string }> {
  const parsed: unknown = JSON.parse(source)
  const values = Array.isArray(parsed) ? parsed : objectJson(parsed)?.cases
  if (!Array.isArray(values)) return []
  return values.flatMap((value) => {
    const entry = objectJson(value)
    return typeof entry?.id === "string" && typeof entry.nodeId === "string"
      ? [{ id: entry.id, nodeId: entry.nodeId }]
      : []
  })
}

function repoName(workspace: Workspace, git: ExternalCommand): string {
  return githubRepo(git(["remote", "get-url", "origin"], workspace.workspaceRoot).trim())
}

function marker(pr: number): string {
  return `<!-- ui-cli:handoff-media:${pr} -->`
}

function sha256(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

function safeLabel(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-")
}

function captureInput(entry: ParityCase, pathName: string, baseUrl: string): MediaCaptureInput {
  const storyId = entry.storyId
  if (!storyId) throw new UsageError(`${entry.id}: saved case has no storyId`)
  const width = entry.width ?? entry.viewport ?? 320
  return {
    baseUrl,
    storyId,
    width,
    viewport: entry.viewport ?? width,
    height: entry.height ?? 900,
    selector: entry.root ?? "#storybook-root",
    focus: entry.state === "focus",
    screenshot: pathName,
  }
}

function updateFile(file: string, content: string | null): void {
  if (content === null) {
    if (fs.existsSync(file)) fs.rmSync(file)
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, content)
  }
}

function commentText(pr: number, cases: PlannedCase[], imagePaths: string[]): string {
  const lines = [marker(pr), "", "Before/after render evidence for the drift handoff.", ""]
  for (const entry of cases) {
    const status = entry.entry?.status ?? "unmapped"
    const note = entry.entry?.note ?? entry.entry?.reason ?? ""
    if (entry.before === entry.after) {
      lines.push(
        `- ${entry.nodeId} (${status}): source changed without a render change${note ? ` — ${note}` : ""}.`,
      )
      continue
    }
    const before = imagePaths.find((file) =>
      file.endsWith(`${safeLabel(entry.parity.id)}-before.png`),
    )
    const after = imagePaths.find((file) =>
      file.endsWith(`${safeLabel(entry.parity.id)}-after.png`),
    )
    if (before && after)
      lines.push(
        `- ${entry.nodeId} (${status}): ${path.basename(before)} · ${path.basename(after)}${note ? ` — ${note}` : ""}.`,
      )
  }
  return lines.join("\n")
}

function commentsFromGh(output: string): Array<{ body?: string }> {
  const parsed: unknown = JSON.parse(output)
  if (!Array.isArray(parsed)) throw new Error("gh returned an invalid comment list")
  return parsed.flatMap((value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return []
    const item = Object.fromEntries(Object.entries(value))
    return [{ body: typeof item.body === "string" ? item.body : undefined }]
  })
}

type HandoffMediaOptions = { pr: number; base: string; baseUrl: string; dryRun: boolean }
type RestorableSource = ChangedSource & { absolute: string }

async function captureFrames(
  cases: PlannedCase[],
  imagePaths: string[],
  changedFiles: RestorableSource[],
  baseUrl: string,
  adapters: HandoffMediaAdapters,
): Promise<number> {
  for (const file of changedFiles) updateFile(file.absolute, file.base)
  for (const [index, entry] of cases.entries()) {
    const before = imagePaths[index * 2]
    if (!before) continue
    await adapters.capture(captureInput(entry.parity, before, baseUrl))
    entry.before = sha256(before)
  }
  for (const file of changedFiles) updateFile(file.absolute, file.head)
  let moved = 0
  for (const [index, entry] of cases.entries()) {
    const after = imagePaths[index * 2 + 1]
    if (!after) continue
    await adapters.capture(captureInput(entry.parity, after, baseUrl))
    entry.after = sha256(after)
    if (entry.before !== entry.after) moved += 1
  }
  return moved
}

function attachmentPaths(cases: PlannedCase[], imagePaths: string[]): string[] {
  return cases.flatMap((entry, index) =>
    entry.before !== entry.after ? [imagePaths[index * 2], imagePaths[index * 2 + 1]] : [],
  )
}

function postComment(
  pr: number,
  repo: string,
  cases: PlannedCase[],
  imagePaths: string[],
  workspace: Workspace,
  gh: ExternalCommand,
): void {
  const attachments = attachmentPaths(cases, imagePaths)
  const body = commentText(pr, cases, attachments)
  gh(
    [
      "pr",
      "comment",
      String(pr),
      "--repo",
      repo,
      "--body",
      body,
      ...attachments.flatMap((file) => ["--attach", file]),
    ],
    workspace.workspaceRoot,
  )
  const comments = commentsFromGh(
    gh(["pr", "view", String(pr), "--repo", repo, "--json", "comments"], workspace.workspaceRoot),
  )
  const comment = comments.find((item) => item.body?.includes(marker(pr)))
  const urls = comment?.body?.match(/user-attachments\/assets\//g) ?? []
  if (
    !comment ||
    urls.length !== attachments.length ||
    /\.cache\/ui-cli\//.test(comment.body ?? "")
  ) {
    throw new Error(
      `pull request ${pr} comment did not preserve the ${attachments.length} uploaded attachment URL(s)`,
    )
  }
}

async function captureAndPost(
  workspace: Workspace,
  options: HandoffMediaOptions,
  repo: string,
  cases: PlannedCase[],
  imagePaths: string[],
  changed: ChangedSource[],
  adapters: HandoffMediaAdapters,
): Promise<number> {
  const changedFiles = changed.map((entry) => ({ ...entry, absolute: workspace.path(entry.path) }))
  try {
    const moved = await captureFrames(cases, imagePaths, changedFiles, options.baseUrl, adapters)
    postComment(options.pr, repo, cases, imagePaths, workspace, adapters.gh)
    return moved
  } finally {
    for (const file of changedFiles) updateFile(file.absolute, file.head)
    fs.rmSync(path.dirname(imagePaths[0] ?? ""), { recursive: true, force: true })
  }
}

export async function createHandoffMedia(
  workspace: Workspace,
  options: HandoffMediaOptions,
  adapters: HandoffMediaAdapters = handoffMediaAdapters,
): Promise<{ actions: string[]; cases: number; moved: number; dryRun: boolean }> {
  if (!Number.isInteger(options.pr) || options.pr < 1) {
    throw new UsageError("--pr must be a positive number")
  }
  if (!options.baseUrl) throw new UsageError("handoff media needs a local Storybook URL")
  const changed = changedSources(workspace, options.base, adapters.git)
  const cases = planCases(
    workspace,
    options.base,
    adapters.git,
    new Set(changed.map((file) => file.path)),
  )
  const directory = workspace.path(`.cache/ui-cli/handoff-media/${options.pr}`)
  if (!options.dryRun && fs.existsSync(directory)) {
    throw new UsageError(`handoff media output already exists: ${workspace.identity(directory)}`)
  }
  const imagePaths = cases.flatMap((entry) => {
    const stem = safeLabel(entry.parity.id)
    return [path.join(directory, `${stem}-before.png`), path.join(directory, `${stem}-after.png`)]
  })
  const repo = repoName(workspace, adapters.git)
  const actions = [
    `capture ${cases.length} saved case(s) from local Storybook at ${options.baseUrl} against ${options.base} and HEAD at deviceScaleFactor 2`,
    `temporarily restore ${changed.length} component/story source file(s) from ${options.base}, then restore HEAD`,
    `gh pr comment ${options.pr} --repo ${repo} with before/after image attachments`,
    "read back the comment and verify attachment URLs",
    `remove ${directory}`,
  ]
  if (options.dryRun) return { actions, cases: cases.length, moved: 0, dryRun: true }
  if (!(await adapters.storybook(options.baseUrl))) {
    throw new UsageError(`local Storybook does not answer at ${options.baseUrl}/iframe.html`)
  }
  const moved = await captureAndPost(workspace, options, repo, cases, imagePaths, changed, adapters)
  return { actions, cases: cases.length, moved, dryRun: false }
}
