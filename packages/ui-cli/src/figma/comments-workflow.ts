import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { readJson } from "../lib/json.ts"
import { InventorySchema } from "../schemas/catalogue.ts"
import { readComments, refreshComments, threadsForNode } from "./comments.ts"
import type { CommentsSnapshot } from "../schemas/rules.ts"

export type CommentsResult = {
  snapshot: CommentsSnapshot
  refreshed: boolean
  nodeId?: string
  pageId?: string | null
  threads?: ReturnType<typeof threadsForNode>
  openOnly?: boolean
}

export async function commentsReport(
  workspace: Workspace,
  options: { refresh?: boolean; nodeId?: string; openOnly?: boolean },
  token?: string,
): Promise<CommentsResult> {
  const refreshed = options.refresh
    ? await refreshComments(
        workspace,
        token ??
          (() => {
            throw new UsageError("live Figma comments require a token")
          })(),
      )
    : undefined
  if (refreshed && !options.nodeId) return { snapshot: refreshed, refreshed: true }
  const snapshot = refreshed ?? readComments(workspace, true)
  if (!snapshot)
    throw new UsageError(".figma/comments.json is missing: run figma comments --refresh")
  if (!options.nodeId) return { snapshot, refreshed: false }
  const inventory = readJson(workspace.path("src/catalog/figma/inventory.json"), InventorySchema)
  const component = inventory.components.find(
    (entry) =>
      entry.nodeId === options.nodeId ||
      entry.variants?.some((variant) => variant.nodeId === options.nodeId),
  )
  const pageId = component?.pageId ?? null
  return {
    snapshot,
    refreshed: Boolean(refreshed),
    nodeId: options.nodeId,
    pageId,
    openOnly: options.openOnly,
    threads: threadsForNode(workspace, snapshot, options.nodeId, { openOnly: options.openOnly }),
  }
}

function openCount(snapshot: CommentsSnapshot): number {
  return snapshot.threads.filter((thread) => !thread.resolvedAt).length
}

function formatThread(
  thread: NonNullable<CommentsResult["threads"]>[number],
  pageId: string | null,
): string[] {
  const anchor = thread.nodeId
    ? `${thread.nodeId}${thread.nodeId === pageId ? " (page)" : ""}`
    : "unattached"
  const state = thread.resolvedAt ? "resolved" : "open"
  const lines = [
    `${thread.createdAt.slice(0, 10)} ${thread.author || "unknown"} (${state}, ${anchor}): ${thread.message.replace(/\s+/g, " ")}`,
  ]
  for (const reply of thread.replies) {
    lines.push(
      `  ${reply.createdAt.slice(0, 10)} ${reply.author || "unknown"}: ${reply.message.replace(/\s+/g, " ")}`,
    )
  }
  return lines
}

export function formatComments(result: CommentsResult): string[] {
  const { snapshot } = result
  if (result.refreshed && !result.nodeId) {
    return [
      `comments: ${snapshot.threads.length} threads (${openCount(snapshot)} open) · version ${snapshot.version}`,
    ]
  }
  if (!result.nodeId) {
    return [
      `comments: ${snapshot.threads.length} threads (${openCount(snapshot)} open) · ${snapshot.fetchedAt}`,
    ]
  }
  const threads = result.threads ?? []
  if (!threads.length)
    return [`comments: no ${result.openOnly ? "open " : ""}thread anchors ${result.nodeId}`]
  return threads.flatMap((thread) => formatThread(thread, result.pageId ?? null))
}

export function commentsJson(result: CommentsResult): unknown {
  return result.nodeId
    ? { node: result.nodeId, pageId: result.pageId ?? null, threads: result.threads ?? [] }
    : result.snapshot
}
