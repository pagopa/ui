import fs from "node:fs"

import type { Workspace } from "../adapters/workspace.ts"
import {
  loweredNoteLengthBaseline,
  NOTE_LENGTH_BASELINE_PATH,
  type Inventory,
  type InventoryNode,
  NOTE_LENGTH_LIMIT,
  type NoteLengthBaseline,
  type PageSurface,
  type PageSurfacePage,
  type Registry,
} from "../schemas/catalogue.ts"
import type { SnapshotDelta } from "./snapshot.ts"
import { escapeRegExp } from "./config.ts"
import { keepsStatusOnDrift } from "./surface-decision.ts"
import { deltaChangedNodes } from "./work-set.ts"
import { loadPageSurface, PAGE_SURFACE_PATH } from "./surface.ts"
import { COMMITTED_FILES } from "../records/committed.ts"

const EVIDENCE_EXCEPTIONS_PATH = "src/catalog/figma/evidence-exceptions.json"
const VALID_STATUSES = new Set(["implemented", "mocked", "excluded", "pending"])

type Ratchet = { from: number; to: number }

export interface CatalogueRefreshOptions {
  inventory: Inventory
  registry: Registry
  live: InventoryNode[]
  delta: SnapshotDelta
  liveVersion?: string
  liveLastModified?: string
  evidenceExceptions: Record<string, string>
  noteBaseline: NoteLengthBaseline | null
}

export interface CatalogueRefreshReport {
  inventory: Inventory
  registry: Registry
  evidenceExceptions: Record<string, string>
  pendingWrites: Map<string, unknown>
  reconciledSurface: PageSurface | null
  ratchet: Ratchet | null
  /** What the refresh left alone, so the run reports it instead of dropping it. */
  notices: string[]
}

function dropKeys<T>(record: Record<string, T>, keys: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.has(key)))
}

// The line a renewal writes. A renewal reads a previous one back so repeated
// renewals do not stack lines, and both read the one sentence: a copy would
// drift and start carrying the renewal's own line forward as prose. Anchored,
// because the sentence only means "a previous renewal wrote this" where a note
// starts; a note that quotes it is saying something else.
const RENEWAL_TAIL = "review new/changed node or dependency before marking implemented"
const DATE_TOKEN = "@date@"
const renewalLine = (date: string) => `Figma delta ${date}: ${RENEWAL_TAIL}`
const RENEWAL_PREFIX = new RegExp(
  `^\\s*${escapeRegExp(renewalLine(DATE_TOKEN)).replace(DATE_TOKEN, "\\d{4}-\\d{2}-\\d{2}")}[.:]?\\s*`,
)

/**
 * The note a renewal writes: its own line, then what the previous note said, with
 * a previous renewal line removed. The registry's note states the current
 * residues rather than the history, but the words are the author's review and a
 * renewal has no business discarding them: the length limit is the only thing
 * that shortens the note, and what falls past it comes back to be reported.
 */
function renewedNote(
  previous: string | undefined,
  boilerplate: string,
): { note: string; dropped: string | null } {
  const carried = (previous ?? "").replace(RENEWAL_PREFIX, "").trim()
  if (!carried) return { note: boilerplate, dropped: null }
  const note = `${boilerplate}. ${carried}`
  if (note.length <= NOTE_LENGTH_LIMIT) return { note, dropped: null }
  const kept = carried
    .slice(0, NOTE_LENGTH_LIMIT - boilerplate.length - 2)
    .replace(/\s+\S*$/, "")
    .trimEnd()
  return { note: `${boilerplate}. ${kept}`, dropped: carried.slice(kept.length).trim() }
}

function renewRegistry(registry: Registry, delta: SnapshotDelta, date: string) {
  registry.entries ??= {}
  const renewed = new Set<string>()
  const removed = new Set<string>()
  const notices: string[] = []
  const byId = new Map(
    [...delta.added, ...delta.changed, ...delta.affected].map((n) => [n.nodeId, n]),
  )
  for (const nodeId of deltaChangedNodes(delta)) {
    const node = byId.get(nodeId)
    if (!node) continue
    const previous = registry.entries[nodeId]
    const rule = registry.bulkRules?.find((item) => item.pageId === node.pageId)
    if (keepsStatusOnDrift(previous?.status, rule?.status)) {
      notices.push(
        `${nodeId} changed in Figma and keeps its ${previous?.status ?? rule?.status} status — review it by hand if the change invalidates that decision`,
      )
      continue
    }
    if (previous && !VALID_STATUSES.has(previous.status)) {
      notices.push(
        `${nodeId} changed in Figma and keeps its unreadable status "${previous.status}" — set one of implemented, mocked, excluded, pending`,
      )
      continue
    }
    const { note, dropped } = renewedNote(previous?.note, renewalLine(date))
    if (dropped)
      notices.push(
        `${nodeId} renewed: its previous note was too long to carry past ${NOTE_LENGTH_LIMIT} characters — it dropped "${dropped}", carry anything still owed into the new note`,
      )
    registry.entries[nodeId] = { ...previous, status: "pending", note }
    renewed.add(nodeId)
  }
  for (const node of delta.removed) removed.add(node.nodeId)
  registry.entries = dropKeys<Registry["entries"][string]>(registry.entries, removed)
  return { renewed, removed, notices }
}

function reconcilePublishedIdentities(
  surface: PageSurface,
  pages: Map<string, PageSurfacePage>,
  published: Map<string, InventoryNode>,
) {
  const censused = new Map<string, PageSurfacePage>()
  let reconciled = false
  for (const page of surface.pages) {
    for (const identity of [...page.identities]) {
      const node = published.get(identity.nodeId)
      if (!node) continue
      const moved = node.pageId !== page.pageId
      const destination = pages.get(node.pageId)
      if (moved) {
        page.identities = page.identities.filter((entry) => entry.nodeId !== node.nodeId)
        reconciled = true
        if (!destination) continue
        destination.identities.push(identity)
      }
      if (identity.name !== node.name) {
        identity.name = node.name
        reconciled = true
      }
      if (identity.kind !== node.type) {
        identity.kind = node.type
        reconciled = true
      }
      censused.set(node.nodeId, destination ?? page)
    }
  }
  return { censused, reconciled }
}

function queueSurfaceIdentities(
  pages: Map<string, PageSurfacePage>,
  published: Map<string, InventoryNode>,
  censused: Map<string, PageSurfacePage>,
  renewed: Set<string>,
  reason: string,
): boolean {
  let reconciled = false
  for (const node of published.values()) {
    const page = censused.get(node.nodeId)
    if (!page) {
      const destination = pages.get(node.pageId)
      if (!destination || !renewed.has(node.nodeId)) continue
      destination.identities.push({
        nodeId: node.nodeId,
        name: node.name,
        kind: node.type,
        inLibrary: true,
        decision: "pending",
        reason,
      })
      censused.set(node.nodeId, destination)
      reconciled = true
      continue
    }
    const identity = page.identities.find((entry) => entry.nodeId === node.nodeId)
    const gained = identity ? !identity.inLibrary : false
    const queued = renewed.has(node.nodeId) && identity?.decision !== "pending"
    if (!identity || (!gained && !queued)) continue
    identity.inLibrary = true
    identity.decision = "pending"
    identity.reason = reason
    reconciled = true
  }
  return reconciled
}

function refreshPageSurface(
  workspace: Workspace,
  inventory: Inventory,
  renewed: Set<string>,
  date: string,
): PageSurface | null {
  const surfaceFile = workspace.path(PAGE_SURFACE_PATH)
  if (!fs.existsSync(surfaceFile)) return null
  const surface = loadPageSurface(surfaceFile)
  const pages = new Map(surface.pages.map((page) => [page.pageId, page]))
  const published = new Map(inventory.components.map((node) => [node.nodeId, node]))
  const aligned = reconcilePublishedIdentities(surface, pages, published)
  const queued = queueSurfaceIdentities(
    pages,
    published,
    aligned.censused,
    renewed,
    `Figma delta ${date}: queued by the drift refresh, the review decides`,
  )
  return aligned.reconciled || queued ? surface : null
}

export function prepareCatalogueRefresh(
  workspace: Workspace,
  options: CatalogueRefreshOptions,
): CatalogueRefreshReport {
  const { inventory: previousInventory, registry: previousRegistry, live, delta } = options
  const date = new Date().toISOString().slice(0, 10)
  const inventory: Inventory = {
    schemaVersion: 2,
    fileKey: previousInventory.fileKey,
    syncedAt: date,
    ...(options.liveVersion ? { fileVersion: options.liveVersion } : {}),
    ...(options.liveLastModified ? { lastModified: options.liveLastModified } : {}),
    components: live,
  }
  const registry: Registry = structuredClone(previousRegistry)
  const { renewed, removed, notices } = renewRegistry(registry, delta, date)
  const nextEvidenceExceptions = dropKeys(
    options.evidenceExceptions,
    new Set([...renewed, ...removed]),
  )
  const pendingWrites = new Map<string, unknown>([
    [COMMITTED_FILES.inventory, inventory],
    [COMMITTED_FILES.registry, registry],
  ])
  const reconciledSurface = refreshPageSurface(workspace, inventory, renewed, date)
  if (reconciledSurface) pendingWrites.set(PAGE_SURFACE_PATH, reconciledSurface)
  pendingWrites.set(EVIDENCE_EXCEPTIONS_PATH, { storyEvidence: nextEvidenceExceptions })
  let ratchet: Ratchet | null = null
  if (options.noteBaseline) {
    const lowered = loweredNoteLengthBaseline(registry, options.noteBaseline)
    if (lowered) {
      ratchet = { from: options.noteBaseline.overLimit, to: lowered.overLimit }
      pendingWrites.set(NOTE_LENGTH_BASELINE_PATH, lowered)
    }
  }
  return {
    inventory,
    registry,
    evidenceExceptions: nextEvidenceExceptions,
    pendingWrites,
    reconciledSurface,
    ratchet,
    notices,
  }
}
