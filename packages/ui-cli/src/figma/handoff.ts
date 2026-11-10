import fs from "node:fs"
import path from "node:path"
import type { Workspace } from "../adapters/workspace.ts"
import { runGh, runGit, runPnpm, type ExternalCommand } from "../adapters/handoff.ts"
import { buildBriefQueue, type BriefQueue } from "./brief-queue.ts"
import { UsageError, CheckFailure } from "../lib/command.ts"

export type PullRequest = {
  number: number
  headRefName: string
  state: string
  url: string
  body: string
}

export type HandoffAdapters = {
  gh: ExternalCommand
  git: ExternalCommand
  pnpm: ExternalCommand
}

const defaultAdapters: HandoffAdapters = { gh: runGh, git: runGit, pnpm: runPnpm }

function parsePullRequest(value: string): PullRequest {
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== "object") throw new Error("gh returned an invalid pull request")
  const item = Object.fromEntries(Object.entries(parsed))
  if (
    typeof item.number !== "number" ||
    typeof item.headRefName !== "string" ||
    typeof item.state !== "string" ||
    typeof item.url !== "string"
  ) {
    throw new Error("gh returned incomplete pull request metadata")
  }
  return {
    number: item.number,
    headRefName: item.headRefName,
    state: item.state,
    url: item.url,
    body: typeof item.body === "string" ? item.body : "",
  }
}

function viewArgs(reference: string): string[] {
  return ["pr", "view", reference, "--json", "number,headRefName,state,url,body"]
}

export function resolveHandoff(
  workspace: Workspace,
  reference: string | undefined,
  adapters: HandoffAdapters = defaultAdapters,
): PullRequest {
  const cwd = workspace.workspaceRoot
  const pr = reference
    ? parsePullRequest(adapters.gh(viewArgs(reference), cwd))
    : resolveOpenDrift(workspace, adapters)
  if (pr.state.toUpperCase() !== "OPEN")
    throw new CheckFailure(`pull request ${pr.number} is ${pr.state.toLowerCase()}`)
  return pr
}

function resolveOpenDrift(workspace: Workspace, adapters: HandoffAdapters): PullRequest {
  const output = adapters.gh(
    ["pr", "list", "--state", "open", "--json", "number,headRefName,state,url,body"],
    workspace.workspaceRoot,
  )
  const values: unknown = JSON.parse(output)
  if (!Array.isArray(values)) throw new Error("gh returned an invalid pull request list")
  const drift = values
    .map((value) => parsePullRequest(JSON.stringify(value)))
    .filter((pr) => pr.headRefName.startsWith("figma-drift/"))
  if (drift.length === 0)
    throw new UsageError("no open figma-drift pull request; pass a pull request, URL or branch")
  if (drift.length > 1)
    throw new UsageError(
      `multiple open figma-drift pull requests: ${drift.map((pr) => pr.number).join(", ")}; pass one explicitly`,
    )
  const [selected] = drift
  if (!selected)
    throw new UsageError("no open figma-drift pull request; pass a pull request, URL or branch")
  return selected
}

// Each drift branch gets its own sibling worktree, so sessions on different
// drift pull requests never share a checkout.
function driftWorktree(workspace: Workspace, headRefName: string): string {
  const slug = headRefName.replace(/^figma-drift\//, "").replace(/[^a-zA-Z0-9]+/g, "-")
  return path.resolve(workspace.workspaceRoot, "..", `pagopa-ui-drift-${slug}`)
}

export function checkoutHandoff(
  workspace: Workspace,
  pr: PullRequest,
  dryRun: boolean,
  adapters: HandoffAdapters = defaultAdapters,
): { path: string; branch: string; actions: string[]; dryRun: boolean } {
  if (!pr.headRefName.startsWith("figma-drift/"))
    throw new UsageError(`pull request ${pr.number} is not on a figma-drift branch`)
  const destination = driftWorktree(workspace, pr.headRefName)
  if (fs.existsSync(destination)) {
    // One drift branch lives in one worktree: a concurrent session on the same
    // branch reuses it, and git refuses a second checkout of the same branch.
    if (fs.existsSync(path.join(destination, ".git")))
      return { path: destination, branch: pr.headRefName, actions: [], dryRun }
    throw new UsageError(`worktree destination already exists: ${destination}`)
  }
  const remote = `origin/${pr.headRefName}`
  // `worktree add -b` fails on a branch that already exists, and a drift branch
  // outlives the worktree that carried it: pruning a worktree or a crashed run
  // leaves the branch behind. Reusing it checks out the local branch as it
  // stands, drift included, instead of resetting it to the remote or failing
  // raw; a local branch behind the pull request is the session's to fast-forward.
  //
  // A dry run runs no git, so it cannot tell which case it is in: it shows the
  // fresh checkout and names the reuse the real run does when the branch is
  // already there.
  const exists = !dryRun && branchExists(workspace, pr.headRefName, adapters)
  const create = exists
    ? [`git worktree add ${destination} ${pr.headRefName}`, `# reused branch: ${pr.headRefName}`]
    : [`git worktree add ${destination} -b ${pr.headRefName} ${remote}`]
  const actions = [
    `git fetch origin ${pr.headRefName}`,
    ...create,
    ...(dryRun && !exists
      ? [`# if ${pr.headRefName} exists already: git worktree add ${destination} ${pr.headRefName}`]
      : []),
    `pnpm install (cwd ${destination})`,
  ]
  if (!dryRun) {
    adapters.git(["fetch", "origin", pr.headRefName], workspace.workspaceRoot)
    if (exists) {
      adapters.git(["worktree", "add", destination, pr.headRefName], workspace.workspaceRoot)
    } else
      adapters.git(
        ["worktree", "add", destination, "-b", pr.headRefName, remote],
        workspace.workspaceRoot,
      )
    adapters.pnpm(["install"], destination)
  }
  return { path: destination, branch: pr.headRefName, actions, dryRun }
}

function branchExists(workspace: Workspace, branch: string, adapters: HandoffAdapters): boolean {
  try {
    return (
      adapters
        .git(["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], workspace.workspaceRoot)
        .trim().length > 0
    )
  } catch {
    return false
  }
}

function embeddedDelta(body: string): unknown | null {
  const fenced = body.match(/```json\s*([\s\S]*?)```/i)?.[1]
  if (fenced) {
    try {
      return JSON.parse(fenced)
    } catch {
      return null
    }
  }
  return null
}

function savedDelta(workspace: Workspace, body: string): unknown | null {
  const inline = embeddedDelta(body)
  if (inline) return inline
  for (const candidate of [".figma/delta.json", ".figma/live-delta.json", ".figma/plan.json"]) {
    const file = workspace.path(candidate)
    if (!fs.existsSync(file)) continue
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"))
    } catch {
      continue
    }
  }
  return null
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null
}

export function handoffBrief(
  workspace: Workspace,
  pr: PullRequest,
  queue: BriefQueue = buildBriefQueue(workspace, { scope: "pending", lineCap: null }),
  suppliedDelta?: unknown,
): {
  pullRequest: PullRequest
  delta: unknown
  /** Ids the delta's `implementationOrder` named that the queue does not carry. */
  dropped: string[]
  /** `delta` when the artifact's order resolved, `queue` when it had to be ignored. */
  orderSource: "delta" | "queue"
  queue: BriefQueue
} {
  const delta = suppliedDelta ?? savedDelta(workspace, pr.body)
  if (!delta)
    throw new UsageError(
      `pull request ${pr.number} has no readable delta.json artifact in its body or local .figma snapshots`,
    )
  const data = object(delta)
  const artifactOrder = Array.isArray(data?.implementationOrder)
    ? data.implementationOrder.filter((id): id is string => typeof id === "string")
    : null
  const byId = new Map(queue.items.map((item) => [item.nodeId, item]))
  // The artifact is written by an earlier run and the queue is read now, so the
  // ids it names can be gone: renamed in the inventory, dropped from pending, or
  // renamed in a rebased PR. An order that resolves to nothing would print an
  // empty brief and look like a PR with no work, so fall back to the queue and
  // say which ids were dropped.
  const resolved = (artifactOrder ?? []).filter((id) => byId.has(id))
  // Only an order the artifact wrote can be dropped by it: the queue's own order
  // missing a node means the cap truncated it, which the queue reports itself.
  const order = resolved.length ? resolved : queue.implementationOrder
  return {
    pullRequest: pr,
    delta,
    dropped: (artifactOrder ?? []).filter((id) => !byId.has(id)),
    orderSource: resolved.length ? ("delta" as const) : ("queue" as const),
    queue: {
      scope: queue.scope,
      implementationOrder: order,
      items: order.flatMap((id) => {
        const item = byId.get(id)
        return item ? [item] : []
      }),
    },
  }
}

export function deltaArtifactUrl(body: string): string | null {
  const match = body.match(/https?:\/\/[^\s)]+delta\.json(?:\?[^\s)]*)?/i)
  return match?.[0] ?? null
}
