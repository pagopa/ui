// Node comments, read-only.
//
// The library's comments are the design conversation around a node: an
// unanswered question there is a decision the drawing alone does not carry.
// They stay out of the repository (a local snapshot, like the variables): the
// brief reads them, and a decision that survives becomes a design request.
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { readJson, writeJson } from "../lib/json.ts"
import { enterRoot } from "../lib/paths.ts"
import { UsageError } from "../lib/command.ts"
import { InventorySchema } from "../schemas/catalogue.ts"
import {
  type CommentThread,
  type CommentsSnapshot,
  CommentsSnapshotSchema,
} from "../schemas/rules.ts"
import { fetchFileComments, fetchFileHeader, type FigmaComment } from "./rest.ts"
import { fileKeyOf } from "./rules.ts"

export const COMMENTS_SNAPSHOT_PATH = ".figma/comments.json"
const INVENTORY_PATH = "src/catalog/figma/inventory.json"
const LIVE_SNAPSHOT_PATH = ".figma/live-rest.json"

const LiveSnapshotSchema = z.looseObject({
  nodes: z.record(z.string(), z.looseObject({ document: z.unknown().optional() })).optional(),
})

function pageIdOf(root: string, nodeId: string): string | null {
  const inventory = readJson(path.join(root, INVENTORY_PATH), InventorySchema)
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

export async function refreshComments(): Promise<CommentsSnapshot> {
  const root = enterRoot()
  const fileKey = fileKeyOf(root)
  const [header, comments] = await Promise.all([
    fetchFileHeader(fileKey),
    fetchFileComments(fileKey),
  ])
  const snapshot: CommentsSnapshot = {
    fileKey,
    version: header.version,
    fetchedAt: new Date().toISOString(),
    threads: buildThreads(comments),
  }
  writeJson(path.join(root, COMMENTS_SNAPSHOT_PATH), snapshot)
  return snapshot
}

export function readComments(root: string, required = false): CommentsSnapshot | null {
  const file = path.join(root, COMMENTS_SNAPSHOT_PATH)
  if (!fs.existsSync(file)) {
    if (required)
      throw new UsageError(`${COMMENTS_SNAPSHOT_PATH} is missing: run figma:comments --refresh`)
    return null
  }
  return readJson(file, CommentsSnapshotSchema)
}

// The published subtree of a node, when the pinned REST snapshot holds it.
// Comments anchor to the exact frame the designer pointed at, which is usually
// a child of the set, not the set itself.
function descendantsOf(root: string, nodeId: string): Set<string> {
  const ids = new Set<string>()
  const file = path.join(root, LIVE_SNAPSHOT_PATH)
  if (!fs.existsSync(file)) return ids
  const data = readJson(file, LiveSnapshotSchema)
  function entryOf(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value))
      : null
  }
  function collect(node: unknown): void {
    const entry = entryOf(node)
    if (!entry) return
    if (typeof entry.id === "string") ids.add(entry.id)
    const children = Array.isArray(entry.children) ? entry.children : []
    for (const child of children) collect(child)
  }
  function find(node: unknown): unknown | null {
    const entry = entryOf(node)
    if (!entry) return null
    if (entry.id === nodeId) return node
    const children = Array.isArray(entry.children) ? entry.children : []
    for (const child of children) {
      const found = find(child)
      if (found) return found
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
  root: string,
  snapshot: CommentsSnapshot,
  requested: string,
  options: { openOnly?: boolean } = {},
): CommentThread[] {
  const inventory = readJson(path.join(root, INVENTORY_PATH), InventorySchema)
  const scope = new Set<string>([requested])
  const pageId = pageIdOf(root, requested)
  for (const component of inventory.components) {
    if (
      component.nodeId === requested ||
      (component.variants ?? []).some((variant) => variant.nodeId === requested)
    ) {
      scope.add(component.nodeId)
      for (const variant of component.variants ?? []) scope.add(variant.nodeId)
    }
  }
  for (const id of descendantsOf(root, requested)) scope.add(id)
  if (pageId) scope.add(pageId)
  return snapshot.threads.filter((thread) => {
    if (options.openOnly && thread.resolvedAt) return false
    return thread.nodeId ? scope.has(thread.nodeId) : false
  })
}

function formatThread(thread: CommentThread, pageId: string | null): string[] {
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

function option(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(`--${name}`)
  return index >= 0 ? argv[index + 1] : undefined
}

export async function runComments(argv: string[] = process.argv.slice(2)): Promise<number> {
  const root = enterRoot()
  const json = argv.includes("--json")
  const openOnly = argv.includes("--open")
  const node = option(argv, "node")

  const refreshed = argv.includes("--refresh") ? await refreshComments() : null
  if (refreshed && !node) {
    const open = refreshed.threads.filter((thread) => !thread.resolvedAt).length
    console.log(
      `comments: ${refreshed.threads.length} threads (${open} open) · version ${refreshed.version}`,
    )
    return 0
  }

  const snapshot = refreshed ?? readComments(root, true)
  if (!snapshot) return 1
  if (!node) {
    if (json) {
      console.log(JSON.stringify(snapshot, null, 2))
      return 0
    }
    console.log(
      `comments: ${snapshot.threads.length} threads (${snapshot.threads.filter((t) => !t.resolvedAt).length} open) · ${snapshot.fetchedAt}`,
    )
    return 0
  }

  const threads = threadsForNode(root, snapshot, node, { openOnly })
  const pageId = pageIdOf(root, node)
  if (json) {
    console.log(JSON.stringify({ node, pageId, threads }, null, 2))
    return 0
  }
  if (threads.length === 0) {
    console.log(`comments: no ${openOnly ? "open " : ""}thread anchors ${node}`)
    return 0
  }
  for (const thread of threads) {
    for (const line of formatThread(thread, pageId)) console.log(line)
  }
  return 0
}
