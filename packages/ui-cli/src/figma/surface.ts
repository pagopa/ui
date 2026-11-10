#!/usr/bin/env node
// Figma page surface — the census of what a page draws, and the gate that
// keeps it true.
//
// The library export (`/components`, `/component_sets`) lists the nodes Figma
// *published*, and the library is the implementation scope: a helper drawn but
// never published is deliberately not a component of this design system. The
// gap this module closes is not "implement more nodes" — it is that the export
// was the only thing the procedure ever read, so the page as a whole was never
// looked at, and nothing noticed the three parts of a page the export cannot
// describe:
//
//   * an identity drawn on the page that was never published — correctly out of
//     scope, and invisible to every check, so publishing it later changes the
//     scope silently;
//   * an identity published but not drawn on the censused page — the inventory
//     sees it, and only a page read can say it has no counterpart there;
//   * a composition the page draws — the frame stacking four elements at 852,
//     the mobile page drawing them at 304, the drawer panel at 320 or 417 —
//     which no node-level accounting sees and no story necessarily reproduces.
//
// The record (`src/catalog/figma/page-surface.json`) is read from the page tree
// (the Figma MCP `get_metadata` call on the page node, which sees unpublished
// frames and symbols) and holds, per page:
//
//   * every identity drawn on it — one row per component and component set,
//     with `inLibrary` saying whether the published export carries it, and the
//     decision the library gives it: `unpublished` (not in the export, so not
//     implemented, by rule), `shipped` (the registry's implemented mapping),
//     `mocked` (published, mapped, and rendered by a facade), `excluded`
//     (published and deliberately not implemented) or `pending` (published,
//     mapped, and waiting).
//   * every composition the page draws — the frame that composes the mapped
//     implementation, with the device it is drawn at and the parity cases that
//     measure it. An empty `mirrors` list with a reason is a written statement
//     that the source draws a composition nothing measures.
//
// What the gate enforces, so the census cannot go stale or polite:
//
//   * `inLibrary` is the hinge and it works both ways: marked in the library,
//     the identity must be an inventory node with the same name, type and page,
//     and every inventory node on a covered page must appear in the census;
//     marked outside it, the identity must *not* be in the inventory. That is
//     what makes publication the trigger — the day an unpublished identity is
//     published, the export grows, the mirror fails and a decision is owed;
//   * the decision agrees with the registry: `shipped` is `implemented`,
//     `mocked` is `mocked`, `excluded` is `excluded`, `pending` is `pending`,
//     and `unpublished` is not in the library at all. A registry bulk rule is
//     the decision for every node of its page that carries no entry of its own,
//     the same fallback the rest of the inventory accounting uses. Every
//     decision other than `unpublished` and `shipped` carries a reason;
//   * a composition's cases exist in the case corpus, measure an identity on
//     that page, and are measured on the device the composition is drawn at.
//
// It cannot see the Figma side: adding a component to a page without re-reading
// the page tree leaves the census short, and the skill makes the re-read the
// step that closes a Figma session.
import fs from "node:fs"

import { readJson } from "../lib/json.ts"
import { DEVICE_POLICY_PATH } from "./devices.ts"
import {
  PageSurfaceSchema,
  type InventoryNode,
  type PageSurface,
  type Registry,
} from "../schemas/catalogue.ts"
import type { ParityCase } from "../schemas/parity.ts"
import { registryStatusFor, requiresReason } from "./surface-decision.ts"

export const PAGE_SURFACE_PATH = "src/catalog/figma/page-surface.json"

export type SurfaceStats = {
  pages: number
  pagesPublished: number
  identities: number
  inLibrary: number
  unpublished: number
  pending: number
  compositions: number
  mirrored: number
}

/** A page the inventory publishes on and the census never read. */
export type SurfaceUncensused = {
  pageId: string
  pageName: string
  nodes: number
}

export type SurfaceResult = {
  errors: string[]
  warnings: string[]
  stats: SurfaceStats
}

export type SurfacePending = {
  nodeId: string
  page: string
  name: string
  reason: string
}

export type SurfaceUnmirrored = {
  nodeId: string
  page: string
  pageName: string
  name: string
  device: string
  drawn: number
  reason: string
}

export function loadPageSurface(file: string): PageSurface {
  if (!fs.existsSync(file)) {
    throw new Error(
      `${file} is missing: a page census is committed next to registry.json ` +
        `(see .agents/skills/figma-to-code/references/catalogue/page-surface.md)`,
    )
  }
  return readJson(file, PageSurfaceSchema)
}

type SurfacePage = PageSurface["pages"][number]
type SurfaceIdentity = SurfacePage["identities"][number]
type SurfaceCheckInput = {
  nodes: InventoryNode[]
  registry: Registry
  cases: ParityCase[]
  fileKey: string
  devices?: Iterable<string>
  label?: string
}
type SurfaceContext = {
  nodes: InventoryNode[]
  entries: Registry["entries"]
  byNode: Map<string, InventoryNode>
  bulkByPage: Map<string, string>
  caseById: Map<string, ParityCase>
  vocabulary: Set<string> | null
  label: string
}

function checkIdentityPublication(
  identity: SurfaceIdentity,
  node: InventoryNode | undefined,
  pageId: string,
  where: string,
): string[] {
  const errors: string[] = []
  if (identity.inLibrary) {
    if (!node) {
      errors.push(
        `${where} is marked in the library but the inventory does not publish it — ` +
          `re-export the library or flip inLibrary`,
      )
    } else {
      if (node.name !== identity.name) {
        errors.push(`${where} is named "${node.name}" in the inventory`)
      }
      if (node.type !== identity.kind) {
        errors.push(`${where} is a ${node.type} in the inventory, the census says ${identity.kind}`)
      }
      if (node.pageId !== pageId) {
        errors.push(`${where} sits on page ${node.pageId}, not ${pageId}`)
      }
    }
  } else {
    if (node) {
      errors.push(
        `${where} is marked as unpublished but the library export publishes it — ` +
          `flip inLibrary and give it the decision the library owes it`,
      )
    }
  }
  return errors
}

function checkIdentityDecision(
  identity: SurfaceIdentity,
  status: string | null,
  where: string,
): string[] {
  const errors: string[] = []
  const { decision, inLibrary } = identity
  if (!inLibrary) {
    if (decision !== "unpublished")
      errors.push(
        `${where} is ${decision} but not in the library — ` +
          `an unpublished identity has no mapping, the decision is unpublished`,
      )
    return errors
  }
  if (decision === "unpublished") {
    errors.push(
      `${where} is published and cannot be called unpublished — ` +
        `give it shipped, mocked, excluded or pending`,
    )
    return errors
  }
  const expected = registryStatusFor(decision)
  if (status !== expected) {
    errors.push(
      `${where} is ${decision} but the registry says "${status ?? "unaccounted"}" — ` +
        `the decision and the registry disagree`,
    )
  }
  if (requiresReason(decision) && !identity.reason) {
    errors.push(
      `${where} is ${decision} and requires a reason — the census is where the ` +
        `decision is written down`,
    )
  }
  return errors
}

function checkCompositions(
  page: SurfacePage,
  identities: Set<string>,
  context: SurfaceContext,
): string[] {
  const { label, vocabulary, caseById } = context
  const at = `${label}: page ${page.pageId}`
  const errors: string[] = []
  const compositions = new Set<string>()
  for (const composition of page.compositions) {
    const where = `${at}: composition ${composition.nodeId} ${composition.name}`
    if (compositions.has(composition.nodeId)) {
      errors.push(`${where} is listed twice`)
      continue
    }
    compositions.add(composition.nodeId)
    if (vocabulary && !vocabulary.has(composition.device)) {
      errors.push(
        `${where}: device "${composition.device}" is not declared by ${DEVICE_POLICY_PATH} — ` +
          `the composition speaks the same vocabulary as the cases`,
      )
    }
    if (!composition.mirrors.length && !composition.reason) {
      errors.push(
        `${where} measures nothing and requires a reason — a composition the source draws ` +
          `and no case measures is a decision, not an omission`,
      )
    }
    for (const id of composition.mirrors) {
      const entry = caseById.get(id)
      if (!entry) {
        errors.push(`${where}: case ${id} is not in the case corpus`)
        continue
      }
      if (!identities.has(entry.nodeId)) {
        errors.push(
          `${where}: case ${id} measures ${entry.nodeId}, which is not an identity on page ${page.pageId}`,
        )
      }
      if (entry.device && entry.device !== composition.device) {
        errors.push(
          `${where}: case ${id} is a ${entry.device} case but the composition is drawn at ` +
            `${composition.device} — a case must measure the frame it claims`,
        )
      }
    }
  }
  return errors
}

function checkCensusedPage(page: SurfacePage, context: SurfaceContext): string[] {
  const { label, byNode, entries, bulkByPage, nodes } = context
  const errors: string[] = []
  const identities = new Set<string>()
  for (const identity of page.identities) {
    const where = `${label}: ${identity.nodeId} ${identity.name}`
    if (identities.has(identity.nodeId)) {
      errors.push(`${where} is listed twice on page ${page.pageId}`)
      continue
    }
    identities.add(identity.nodeId)
    errors.push(
      ...checkIdentityPublication(identity, byNode.get(identity.nodeId), page.pageId, where),
    )
    const status = entries[identity.nodeId]?.status ?? bulkByPage.get(page.pageId) ?? null
    errors.push(...checkIdentityDecision(identity, status, where))
  }
  for (const node of nodes) {
    if (node.pageId !== page.pageId || identities.has(node.nodeId)) continue
    errors.push(
      `${label}: page ${page.pageId}: inventory node ${node.nodeId} ${node.name} is missing from the census — ` +
        `re-read the page tree and record the decision it got`,
    )
  }
  return [...errors, ...checkCompositions(page, identities, context)]
}

function surfaceWarnings(surface: PageSurface, nodes: InventoryNode[], label: string): string[] {
  const warnings: string[] = []
  if (!surface.pages.length) {
    warnings.push(`${label}: no page is censused — a Figma session reads the pages it touched`)
  }

  const uncensused = surfaceUncensused(surface, nodes)
  if (uncensused.length) {
    const named = uncensused
      .slice(0, 3)
      .map((page) => `${page.pageName} (${page.nodes})`)
      .join(", ")
    warnings.push(
      `${label}: ${uncensused.length} page(s) with published nodes are not censused — ` +
        `the census grows a page at a time and \`figma:plan\` carries the rest: ${named}` +
        (uncensused.length > 3 ? ", …" : ""),
    )
  }

  return warnings
}

export function checkPageSurface(surface: PageSurface, input: SurfaceCheckInput): SurfaceResult {
  const { nodes, registry, cases, fileKey, devices, label = PAGE_SURFACE_PATH } = input
  const errors: string[] = []
  if (surface.fileKey !== fileKey) {
    errors.push(`${label}: fileKey ${surface.fileKey} is not the inventory file ${fileKey}`)
  }
  const bulkByPage = new Map<string, string>()
  for (const rule of registry.bulkRules ?? []) {
    if (rule.status) bulkByPage.set(rule.pageId, rule.status)
  }
  const context: SurfaceContext = {
    nodes,
    entries: registry.entries ?? {},
    byNode: new Map(nodes.map((node) => [node.nodeId, node])),
    bulkByPage,
    caseById: new Map(cases.map((entry) => [entry.id, entry])),
    vocabulary: devices ? new Set(devices) : null,
    label,
  }
  const pages = new Set<string>()
  for (const page of surface.pages) {
    if (pages.has(page.pageId)) {
      errors.push(`${label}: page ${page.pageId} is listed twice — one census per page`)
      continue
    }
    pages.add(page.pageId)
    errors.push(...checkCensusedPage(page, context))
  }
  return {
    errors,
    warnings: surfaceWarnings(surface, nodes, label),
    stats: surfaceSummary(surface, nodes),
  }
}

/**
 * The pages the inventory publishes on and the census has not read yet: the
 * burn-down of a census that starts from the page a session opened.
 */
export function surfaceUncensused(
  surface: PageSurface,
  nodes: InventoryNode[],
): SurfaceUncensused[] {
  const censused = new Set(surface.pages.map((page) => page.pageId))
  const pages = new Map<string, SurfaceUncensused>()
  for (const node of nodes) {
    if (censused.has(node.pageId)) continue
    const page = pages.get(node.pageId)
    if (page) page.nodes++
    else pages.set(node.pageId, { pageId: node.pageId, pageName: node.pageName ?? "", nodes: 1 })
  }
  return [...pages.values()].sort((left, right) => right.nodes - left.nodes)
}

/** Published identities still waiting: the work a censused page asks for. */
export function surfacePending(surface: PageSurface): SurfacePending[] {
  return surface.pages
    .flatMap((page) =>
      page.identities
        .filter((identity) => identity.decision === "pending")
        .map((identity) => ({
          nodeId: identity.nodeId,
          page: page.pageId,
          name: identity.name,
          reason: identity.reason ?? "",
        })),
    )
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId))
}

/** Compositions the source draws that no parity case measures. */
export function surfaceUnmirrored(surface: PageSurface): SurfaceUnmirrored[] {
  return surface.pages.flatMap((page) =>
    page.compositions
      .filter((composition) => !composition.mirrors.length)
      .map((composition) => ({
        nodeId: composition.nodeId,
        page: page.pageId,
        pageName: page.pageName,
        name: composition.name,
        device: composition.device,
        drawn: composition.drawn,
        reason: composition.reason ?? "",
      })),
  )
}

/** What the census holds, counted without asking the inventory anything. */
export function surfaceSummary(surface: PageSurface, nodes?: InventoryNode[]): SurfaceStats {
  const stats = emptyStats()
  if (nodes) stats.pagesPublished = new Set(nodes.map((node) => node.pageId)).size
  for (const page of surface.pages) {
    stats.pages++
    for (const identity of page.identities) {
      stats.identities++
      if (identity.inLibrary) stats.inLibrary++
      else stats.unpublished++
      if (identity.decision === "pending") stats.pending++
    }
    for (const composition of page.compositions) {
      stats.compositions++
      stats.mirrored += composition.mirrors.length
    }
  }
  return stats
}

export function emptyStats(): SurfaceStats {
  return {
    pages: 0,
    pagesPublished: 0,
    identities: 0,
    inLibrary: 0,
    unpublished: 0,
    pending: 0,
    compositions: 0,
    mirrored: 0,
  }
}

export function formatSurfaceLine(stats: SurfaceStats): string {
  const pages = stats.pagesPublished
    ? `${stats.pages}/${stats.pagesPublished} page(s)`
    : `${stats.pages} page(s)`
  return (
    `surface: ${pages} · ${stats.identities} identities ` +
    `(${stats.inLibrary} in the library, ${stats.unpublished} not) · ` +
    `${stats.pending} pending · ${stats.compositions} composition(s) · ` +
    `${stats.mirrored} case mirror(s)`
  )
}
