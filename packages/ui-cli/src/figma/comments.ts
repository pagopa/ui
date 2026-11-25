// Node comments, read-only.
//
// The library's comments are the design conversation around a node: an
// unanswered question there is a decision the drawing alone does not carry.
// They stay out of the repository (a local snapshot, like the variables): the
// brief reads them, and a decision that survives becomes a design request.
import fs from "node:fs"
import { z } from "zod"

import { readJson, writeJson } from "../lib/json.ts"
import { readField } from "../lib/object.ts"
import { readInventory } from "../records/committed.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import {
  type CommentThread,
  type CommentsSnapshot,
  CommentsSnapshotSchema,
} from "../schemas/rules.ts"
import { fetchFileComments, fetchFileHeader, type FigmaComment } from "./rest.ts"
import { fileKeyOf } from "./rules.ts"

export const COMMENTS_SNAPSHOT_PATH = ".figma/comments.json"
const LIVE_SNAPSHOT_PATH = ".figma/live-rest.json"

const LiveSnapshotSchema = z.looseObject({
  nodes: z.record(z.string(), z.looseObject({ document: z.unknown().optional() })).optional(),
})

function pageIdOf(workspace: Workspace, nodeId: string): string | null {
  const inventory = readInventory(workspace.root)
  for (const component of inventory.components) {
    if (component.nodeId === nodeId) return component.pageId
    if ((component.variants ?? []).some((variant) => variant.nodeId === nodeId))
      return component.pageId
  }
  return null
}

function buildThreads(comments: FigmaComment[]): CommentThread[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]))
  const rootOf = (comment: FigmaComment): string => {
    let current = comment
    const seen = new Set<string>()
    while (current.parentId && !seen.has(current.id)) {
      seen.add(current.id)
      const parent = byId.get(current.parentId)
      if (!parent) break
      current = parent
    }
    return current.id
  }
  const roots = new Map<string, CommentThread>()
  for (const comment of comments) {
    if (comment.parentId) continue
    roots.set(comment.id, {
      id: comment.id,
      nodeId: comment.nodeId,
      author: comment.author,
      createdAt: comment.createdAt,
      resolvedAt: comment.resolvedAt,
      message: comment.message,
      replies: [],
    })
  }
  for (const comment of comments) {
    if (!comment.parentId) continue
    const root = roots.get(rootOf(comment))
    if (!root) continue
    root.replies.push({
      id: comment.id,
      author: comment.author,
      createdAt: comment.createdAt,
      message: comment.message,
    })
  }
  return [...roots.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

export async function refreshComments(
  workspace: Workspace,
  token: string,
  fetchedAt = new Date().toISOString(),
): Promise<CommentsSnapshot> {
  const fileKey = fileKeyOf(workspace.root)
  const [header, comments] = await Promise.all([
    fetchFileHeader(fileKey, token),
    fetchFileComments(fileKey, token),
  ])
  const snapshot: CommentsSnapshot = {
    fileKey,
    version: header.version,
    fetchedAt,
    threads: buildThreads(comments),
  }
  writeJson(workspace.path(COMMENTS_SNAPSHOT_PATH), snapshot)
  return snapshot
}

export function readComments(workspace: Workspace, required = false): CommentsSnapshot | null {
  const file = workspace.path(COMMENTS_SNAPSHOT_PATH)
  if (!fs.existsSync(file)) {
    if (required)
      throw new UsageError(
        `${COMMENTS_SNAPSHOT_PATH} is missing: run pnpm ui-cli figma comments --refresh`,
      )
    return null
  }
  return readJson(file, CommentsSnapshotSchema)
}

let cachedLiveSnapshot: {
  key: string
  data: z.infer<typeof LiveSnapshotSchema>
} | null = null

function readLiveSnapshot(file: string): z.infer<typeof LiveSnapshotSchema> | null {
  if (!fs.existsSync(file)) return null
  const stat = fs.statSync(file)
  const key = `${file}:${stat.mtimeMs}:${stat.size}`
  if (cachedLiveSnapshot?.key === key) return cachedLiveSnapshot.data
  const data = readJson(file, LiveSnapshotSchema)
  cachedLiveSnapshot = { key, data }
  return data
}

// The published subtree of a node, when the pinned REST snapshot holds it.
// Comments anchor to the exact frame the designer pointed at, which is usually
// a child of the set, not the set itself.
function descendantsOf(workspace: Workspace, nodeId: string): Set<string> {
  const ids = new Set<string>()
  const data = readLiveSnapshot(workspace.path(LIVE_SNAPSHOT_PATH))
  if (!data) return ids
  function collect(node: unknown): void {
    const id = readField(node, "id")
    if (typeof id === "string") ids.add(id)
    const children = readField(node, "children")
    if (Array.isArray(children)) {
      for (const child of children) collect(child)
    }
  }
  function find(node: unknown): unknown | null {
    const id = readField(node, "id")
    if (id === nodeId) return node
    const children = readField(node, "children")
    if (Array.isArray(children)) {
      for (const child of children) {
        const found = find(child)
        if (found) return found
      }
    }
    return null
  }
  for (const item of Object.values(data.nodes ?? {})) {
    const found = find(item.document)
    if (found) {
      collect(found)
      break
    }
  }
  return ids
}

export function threadsForNode(
  workspace: Workspace,
  snapshot: CommentsSnapshot,
  requested: string,
  options: { openOnly?: boolean } = {},
): CommentThread[] {
  const inventory = readInventory(workspace.root)
  const scope = new Set<string>([requested])
  const pageId = pageIdOf(workspace, requested)
  for (const component of inventory.components) {
    if (
      component.nodeId === requested ||
      (component.variants ?? []).some((variant) => variant.nodeId === requested)
    ) {
      scope.add(component.nodeId)
      for (const variant of component.variants ?? []) scope.add(variant.nodeId)
    }
  }
  for (const id of descendantsOf(workspace, requested)) scope.add(id)
  if (pageId) scope.add(pageId)
  return snapshot.threads.filter((thread) => {
    if (options.openOnly && thread.resolvedAt) return false
    return thread.nodeId ? scope.has(thread.nodeId) : false
  })
}
