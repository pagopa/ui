import fs from "node:fs"
import type { Workspace } from "../adapters/workspace.ts"
import { fetchFilePages, fetchNodeTrees } from "./rest.ts"
import { fileKeyFromSource } from "./snapshot.ts"
import { surfaceUncensused } from "./surface.ts"
import { censusDecisionFor } from "./surface-decision.ts"
import { readJson, writeJson } from "../lib/json.ts"
import {
  COMMITTED_FILES,
  readDevicePolicy,
  readInventory,
  readRegistry,
} from "../records/committed.ts"
import {
  PageSurfaceSchema,
  type Inventory,
  type PageComposition,
  type PageIdentity,
  type PageSurface,
  type PageSurfacePage,
  type Registry,
} from "../schemas/catalogue.ts"
import type { DevicePolicy } from "../schemas/devices.ts"
import { syncCatalogue, type CatalogueReport } from "./catalogue/index.ts"

const SURFACE_PATH = "src/catalog/figma/page-surface.json"
const DEFAULT_NOTE =
  "Read from the Figma page tree. Preserve reviewed composition decisions while refreshing the identity census."
const RULES_BOX_NAMES = new Set([".Regole", "Regole"])

type TreeNode = {
  id: string
  name: string
  type: string
  componentId?: string
  width?: number
  children?: TreeNode[]
}
type SurfaceCheck = (surface: PageSurface) => Promise<CatalogueReport>

export type CompositionCandidate = {
  nodeId: string
  name: string
  drawn: number
  width?: number
  suggestedDevice?: string
}

export type PageSurfaceDiff = {
  page: PageSurfacePage
  added: PageIdentity[]
  removed: PageIdentity[]
  compositionCandidates: CompositionCandidate[]
  staleCompositions: PageComposition[]
}

export type SurfaceSyncPlan = PageSurfaceDiff & {
  surface: PageSurface
  dryRun: boolean
  check: CatalogueReport
}

export type MultiSurfaceSyncPlan = {
  surface: PageSurface
  pages: PageSurfaceDiff[]
  dryRun: boolean
  check: CatalogueReport
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null
}

function treeNode(value: unknown): TreeNode | null {
  const item = record(value)
  if (
    !item ||
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    typeof item.type !== "string"
  )
    return null
  const box = record(item.absoluteBoundingBox)
  const width = typeof box?.width === "number" && Number.isFinite(box.width) ? box.width : undefined
  const componentId = typeof item.componentId === "string" ? item.componentId : undefined
  const children = Array.isArray(item.children)
    ? item.children.map(treeNode).filter((child): child is TreeNode => child !== null)
    : undefined
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    ...(componentId ? { componentId } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(children ? { children } : {}),
  }
}

function findTree(value: unknown, pageId: string): TreeNode | null {
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = findTree(child, pageId)
      if (found) return found
    }
    return null
  }
  const item = record(value)
  if (!item) return null
  const direct = treeNode(item)
  if (direct?.id === pageId) return direct
  if (item.document) {
    const document = treeNode(item.document)
    if (document?.id === pageId) return document
  }
  const nodes = record(item.nodes)
  const nodeDocument = record(nodes?.[pageId])?.document
  const nested = treeNode(nodeDocument)
  if (nested?.id === pageId) return nested
  return null
}

function identitiesInTree(root: TreeNode): TreeNode[] {
  const seen = new Set<string>()
  const found: TreeNode[] = []
  const visit = (node: TreeNode): void => {
    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
      if (!seen.has(node.id)) found.push(node)
      seen.add(node.id)
      return
    }
    for (const child of node.children ?? []) visit(child)
  }
  for (const child of root.children ?? []) visit(child)
  return found
}

function collectNodeIds(root: TreeNode): Set<string> {
  const ids = new Set<string>()
  const visit = (node: TreeNode): void => {
    ids.add(node.id)
    for (const child of node.children ?? []) visit(child)
  }
  visit(root)
  return ids
}

function publishedTargetIds(root: TreeNode, pageId: string, inventory: Inventory): Set<string> {
  const targets = new Set<string>()
  for (const node of inventory.components) {
    if (node.pageId !== pageId) continue
    targets.add(node.nodeId)
    for (const variant of node.variants ?? []) targets.add(variant.nodeId)
  }
  const visit = (node: TreeNode): void => {
    if (node.type === "COMPONENT_SET" && targets.has(node.id)) {
      for (const child of node.children ?? []) {
        if (child.type === "COMPONENT") targets.add(child.id)
      }
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(root)
  return targets
}

function countTargetInstances(
  node: TreeNode,
  targets: Set<string>,
  existingIds: Set<string>,
): number {
  let count = 0
  const visit = (current: TreeNode): void => {
    if (existingIds.has(current.id)) return
    if (current.type === "COMPONENT" || current.type === "COMPONENT_SET") return
    if (current.type === "INSTANCE" && current.componentId && targets.has(current.componentId)) {
      count += 1
      return
    }
    for (const child of current.children ?? []) visit(child)
  }
  for (const child of node.children ?? []) visit(child)
  return count
}

function escapePattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function inferDevice(
  name: string,
  width: number | undefined,
  policy: DevicePolicy | null,
): string | undefined {
  if (!policy) return undefined
  const entries = Object.entries(policy.devices)
  const nameMatches: Array<{ device: string; length: number }> = []
  for (const [device, spec] of entries) {
    const terms = [device, ...(spec.aliases ?? [])]
    for (const term of terms) {
      const pattern = new RegExp(`(^|[^a-z0-9])${escapePattern(term)}([^a-z0-9]|$)`, "i")
      if (pattern.test(name)) nameMatches.push({ device, length: term.length })
    }
  }
  if (nameMatches.length) {
    nameMatches.sort((a, b) => b.length - a.length)
    return nameMatches[0]?.device
  }
  if (width === undefined || !entries.length) return undefined
  let bestDevice: string | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const [device, spec] of entries) {
    const distance = Math.abs(width - spec.canonicalWidth)
    if (distance < bestDistance) {
      bestDistance = distance
      bestDevice = device
    }
  }
  return bestDevice
}

function compositionContainers(root: TreeNode): TreeNode[] {
  const containers: TreeNode[] = []
  const collect = (node: TreeNode): void => {
    if (RULES_BOX_NAMES.has(node.name.trim())) return
    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") return
    if (node.type === "SECTION") {
      for (const child of node.children ?? []) {
        if (RULES_BOX_NAMES.has(child.name.trim())) continue
        if (child.type === "FRAME" || child.type === "GROUP") containers.push(child)
      }
      return
    }
    if (node.type === "FRAME" || node.type === "GROUP") containers.push(node)
  }
  for (const child of root.children ?? []) collect(child)
  return containers
}

export function scanPageCompositions(
  root: TreeNode,
  pageId: string,
  inventory: Inventory,
  existing: PageComposition[],
  policy: DevicePolicy | null,
): { compositionCandidates: CompositionCandidate[]; staleCompositions: PageComposition[] } {
  const allIds = collectNodeIds(root)
  const staleCompositions = existing.filter((composition) => !allIds.has(composition.nodeId))
  const targets = publishedTargetIds(root, pageId, inventory)
  if (!targets.size) return { compositionCandidates: [], staleCompositions }

  const existingIds = new Set(existing.map((composition) => composition.nodeId))
  const compositionCandidates: CompositionCandidate[] = []
  for (const container of compositionContainers(root)) {
    if (existingIds.has(container.id)) continue
    const drawn = countTargetInstances(container, targets, existingIds)
    if (drawn === 0) continue
    const suggestedDevice = inferDevice(container.name, container.width, policy)
    compositionCandidates.push({
      nodeId: container.id,
      name: container.name,
      drawn,
      ...(container.width !== undefined ? { width: Math.round(container.width) } : {}),
      ...(suggestedDevice ? { suggestedDevice } : {}),
    })
  }
  return { compositionCandidates, staleCompositions }
}

function readOptionalDevicePolicy(workspace: Workspace): DevicePolicy | null {
  return fs.existsSync(workspace.path(COMMITTED_FILES["device-policy"]))
    ? readDevicePolicy(workspace.root)
    : null
}

function loadCurrentSurface(workspace: Workspace, fileKey: string, readAt: string): PageSurface {
  const file = workspace.path(SURFACE_PATH)
  const current = fs.existsSync(file)
    ? readJson(file, PageSurfaceSchema)
    : { fileKey, readAt, note: DEFAULT_NOTE, pages: [] }
  if (current.fileKey !== fileKey)
    throw new Error(`page surface fileKey ${current.fileKey} does not match inventory ${fileKey}`)
  return current
}

function planSurfaceSyncOn(
  current: PageSurface,
  pageId: string,
  source: unknown,
  readAt: string,
  inventory: Inventory,
  registry: Registry,
  policy: DevicePolicy | null,
): PageSurfaceDiff & { surface: PageSurface } {
  const root = findTree(source, pageId)
  if (!root || root.type !== "CANVAS")
    throw new Error(`page tree input does not contain Figma page ${pageId}`)

  const oldPage = current.pages.find((page) => page.pageId === pageId)
  const oldById = new Map(
    (oldPage?.identities ?? []).map((identity) => [identity.nodeId, identity]),
  )
  const inventoryById = new Map(inventory.components.map((node) => [node.nodeId, node]))
  const nextIdentities = identitiesInTree(root).map((node): PageIdentity => {
    const known = oldById.get(node.id)
    const published = inventoryById.has(node.id)
    const kind = node.type === "COMPONENT_SET" ? "COMPONENT_SET" : "COMPONENT"
    if (known && known.inLibrary === published) return { ...known, name: node.name, kind }
    if (!published)
      return {
        nodeId: node.id,
        name: node.name,
        kind,
        inLibrary: false,
        decision: "unpublished",
        reason: "Not published in the library export; no implementation work is due.",
      }
    const derived = censusDecisionFor(node.id, registry, pageId)
    return {
      nodeId: node.id,
      name: node.name,
      kind,
      inLibrary: true,
      decision: derived.decision,
      ...(derived.reason ? { reason: derived.reason } : {}),
    }
  })
  const present = new Set(nextIdentities.map((identity) => identity.nodeId))
  const removed = (oldPage?.identities ?? []).filter((identity) => !present.has(identity.nodeId))
  const added = nextIdentities.filter((identity) => !oldById.has(identity.nodeId))
  const compositions = oldPage?.compositions ?? []
  const { compositionCandidates, staleCompositions } = scanPageCompositions(
    root,
    pageId,
    inventory,
    compositions,
    policy,
  )
  const page: PageSurfacePage = {
    pageId,
    pageName: root.name,
    identities: nextIdentities,
    compositions,
  }
  const pages = oldPage
    ? current.pages.map((item) => (item.pageId === pageId ? page : item))
    : [...current.pages, page]
  return {
    surface: PageSurfaceSchema.parse({ ...current, readAt, pages }),
    page,
    added,
    removed,
    compositionCandidates,
    staleCompositions,
  }
}

export function planSurfaceSync(
  workspace: Workspace,
  pageId: string,
  source: unknown,
  readAt: string,
): Omit<SurfaceSyncPlan, "dryRun" | "check"> {
  const inventory = readInventory(workspace.root)
  const registry = readRegistry(workspace.root)
  const policy = readOptionalDevicePolicy(workspace)
  const current = loadCurrentSurface(workspace, inventory.fileKey, readAt)
  return planSurfaceSyncOn(current, pageId, source, readAt, inventory, registry, policy)
}

export function selectSurfacePages(
  workspace: Workspace,
  options: { pages?: string[]; uncensused?: boolean; all?: boolean },
): string[] {
  if (options.pages?.length) {
    return [...new Set(options.pages.map((id) => id.trim()).filter(Boolean))]
  }
  const inventory = readInventory(workspace.root)
  const file = workspace.path(SURFACE_PATH)
  const current = fs.existsSync(file)
    ? readJson(file, PageSurfaceSchema)
    : { fileKey: inventory.fileKey, readAt: "1970-01-01", note: DEFAULT_NOTE, pages: [] }
  if (options.uncensused) {
    return surfaceUncensused(current, inventory.components).map((page) => page.pageId)
  }
  if (options.all) {
    const ids = new Set<string>()
    for (const page of current.pages) ids.add(page.pageId)
    for (const node of inventory.components) ids.add(node.pageId)
    return [...ids]
  }
  return []
}

export async function syncPagesSurface(
  workspace: Workspace,
  options: {
    pageIds: string[]
    trees: Map<string, unknown>
    now: string
    dryRun: boolean
    check?: SurfaceCheck
  },
): Promise<MultiSurfaceSyncPlan> {
  const inventory = readInventory(workspace.root)
  const registry = readRegistry(workspace.root)
  const policy = readOptionalDevicePolicy(workspace)
  let surface = loadCurrentSurface(workspace, inventory.fileKey, options.now)
  const pages: PageSurfaceDiff[] = []
  for (const pageId of options.pageIds) {
    const tree = options.trees.get(pageId)
    if (!tree) throw new Error(`page tree input does not contain Figma page ${pageId}`)
    const next = planSurfaceSyncOn(surface, pageId, tree, options.now, inventory, registry, policy)
    surface = next.surface
    pages.push({
      page: next.page,
      added: next.added,
      removed: next.removed,
      compositionCandidates: next.compositionCandidates,
      staleCompositions: next.staleCompositions,
    })
  }
  let check: CatalogueReport
  try {
    check = await (
      options.check ?? ((nextSurface) => syncCatalogue(workspace, { surface: nextSurface }))
    )(surface)
  } catch (error) {
    check = {
      exitCode: 1,
      out: [],
      err: [`error: ${error instanceof Error ? error.message : String(error)}`],
    }
  }
  if (!options.dryRun && pages.length) writeJson(workspace.path(SURFACE_PATH), surface)
  return { surface, pages, dryRun: options.dryRun, check }
}

export async function syncPageSurface(
  workspace: Workspace,
  options: {
    pageId: string
    tree: unknown
    now: string
    dryRun: boolean
    check?: SurfaceCheck
  },
): Promise<SurfaceSyncPlan> {
  const result = await syncPagesSurface(workspace, {
    pageIds: [options.pageId],
    trees: new Map([[options.pageId, options.tree]]),
    now: options.now,
    dryRun: options.dryRun,
    check: options.check,
  })
  const first = result.pages[0]
  if (!first) throw new Error(`page tree input does not contain Figma page ${options.pageId}`)
  return { ...first, surface: result.surface, dryRun: result.dryRun, check: result.check }
}

export async function readSurfaceTrees(
  workspace: Workspace,
  pageIds: string[],
  options: { input?: string; token?: string },
): Promise<Map<string, unknown>> {
  const uniqueIds = [...new Set(pageIds)]
  const trees = new Map<string, unknown>()
  if (!uniqueIds.length) return trees
  if (options.input) {
    const value: unknown = JSON.parse(fs.readFileSync(options.input, "utf8"))
    for (const pageId of uniqueIds) {
      if (!findTree(value, pageId)) throw new Error(`input does not contain page ${pageId}`)
      trees.set(pageId, value)
    }
    return trees
  }
  if (!options.token) throw new Error("REST page reads require a resolved Figma token")
  const key = fileKeyFromSource(workspace)
  if (!key) throw new Error("cannot resolve the Figma file key from src/catalog/figma/file.ts")
  const pages = await fetchFilePages(key, options.token)
  const pageById = new Map(pages.pages.map((item) => [item.id, item]))
  for (const pageId of uniqueIds) {
    if (!pageById.has(pageId)) throw new Error(`Figma page ${pageId} is not in the file`)
  }
  const result = await fetchNodeTrees(key, pages.version, uniqueIds, options.token, 10)
  for (const pageId of uniqueIds) {
    const tree = result.get(pageId)
    if (!tree) throw new Error(`Figma REST returned no page tree for ${pageId}`)
    const root = record(tree)
    const page = pageById.get(pageId)
    trees.set(pageId, { ...(root ?? {}), id: pageId, name: page?.name ?? pageId, type: "CANVAS" })
  }
  return trees
}

export async function readSurfaceTree(
  workspace: Workspace,
  pageId: string,
  options: { input?: string; token?: string },
): Promise<unknown> {
  const trees = await readSurfaceTrees(workspace, [pageId], options)
  return trees.get(pageId)
}
