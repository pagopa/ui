import fs from "node:fs"
import type { Workspace } from "../adapters/workspace.ts"
import { fetchFilePages, fetchNodeExistence, fetchNodeTrees } from "./rest.ts"
import { fileKeyFromSource } from "./snapshot.ts"
import { surfaceUncensused } from "./surface.ts"
import {
  classifyMissingCompositions,
  isIdentityNode,
  scanPageCompositions,
  type CompositionCandidate,
  type CompositionVerifier,
  type TreeNode,
} from "./surface-compositions.ts"
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

export type { CompositionCandidate, CompositionVerifier }
export { scanPageCompositions }

const SURFACE_PATH = "src/catalog/figma/page-surface.json"
const DEFAULT_NOTE =
  "Read from the Figma page tree. Preserve reviewed composition decisions while refreshing the identity census."

type SurfaceCheck = (surface: PageSurface) => Promise<CatalogueReport>

type SyncContext = {
  inventory: Inventory
  registry: Registry
  policy: DevicePolicy | null
}

export type PageSurfaceDiff = {
  page: PageSurfacePage
  added: PageIdentity[]
  removed: PageIdentity[]
  compositionCandidates: CompositionCandidate[]
  staleCompositions: PageComposition[]
  unverifiedCompositions: PageComposition[]
}

export type MultiSurfaceSyncPlan = {
  surface: PageSurface
  pages: PageSurfaceDiff[]
  dryRun: boolean
  check: CatalogueReport
}

export function normalizePageIds(values: Iterable<string>): string[] {
  const normalized: string[] = []
  const seen = new Set<string>()
  for (const raw of values) {
    const id = raw.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    normalized.push(id)
  }
  return normalized
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
    if (isIdentityNode(node)) {
      if (!seen.has(node.id)) found.push(node)
      seen.add(node.id)
      // Variants sit directly inside a COMPONENT_SET; plain COMPONENT nodes do
      // not own variants, so keep walking them for nested defined components.
      if (node.type === "COMPONENT_SET") return
    }
    for (const child of node.children ?? []) visit(child)
  }
  for (const child of root.children ?? []) visit(child)
  return found
}

function readSyncContext(workspace: Workspace): SyncContext {
  const inventory = readInventory(workspace.root)
  const registry = readRegistry(workspace.root)
  const policy = fs.existsSync(workspace.path(COMMITTED_FILES["device-policy"]))
    ? readDevicePolicy(workspace.root)
    : null
  return { inventory, registry, policy }
}

function readOptionalSurface(workspace: Workspace, fileKey: string): PageSurface | null {
  const file = workspace.path(SURFACE_PATH)
  if (!fs.existsSync(file)) return null
  const current = readJson(file, PageSurfaceSchema)
  if (current.fileKey !== fileKey)
    throw new Error(`page surface fileKey ${current.fileKey} does not match inventory ${fileKey}`)
  return current
}

function loadCurrentSurface(workspace: Workspace, fileKey: string, readAt: string): PageSurface {
  return (
    readOptionalSurface(workspace, fileKey) ?? {
      fileKey,
      readAt,
      note: DEFAULT_NOTE,
      pages: [],
    }
  )
}

export function currentSurface(workspace: Workspace, readAt: string): PageSurface {
  const inventory = readInventory(workspace.root)
  return loadCurrentSurface(workspace, inventory.fileKey, readAt)
}

type PageSurfacePlan = {
  surface: PageSurface
  page: PageSurfacePage
  added: PageIdentity[]
  removed: PageIdentity[]
  compositionCandidates: CompositionCandidate[]
  missingCompositions: PageComposition[]
}

function planSurfaceSyncOn(
  current: PageSurface,
  pageId: string,
  source: unknown,
  readAt: string,
  context: SyncContext,
): PageSurfacePlan {
  const root = findTree(source, pageId)
  if (!root || root.type !== "CANVAS")
    throw new Error(`page tree input does not contain Figma page ${pageId}`)

  const { inventory, registry, policy } = context
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
  const { compositionCandidates, missingCompositions } = scanPageCompositions(
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
    missingCompositions,
  }
}

export function selectSurfacePages(
  workspace: Workspace,
  options: { pages?: string[]; uncensused?: boolean; all?: boolean },
): string[] {
  const explicit = options.pages ? normalizePageIds(options.pages) : []
  if (explicit.length) return explicit
  const inventory = readInventory(workspace.root)
  const existing = readOptionalSurface(workspace, inventory.fileKey)
  if (options.uncensused) {
    const surface = existing ?? {
      fileKey: inventory.fileKey,
      readAt: "",
      note: DEFAULT_NOTE,
      pages: [],
    }
    return surfaceUncensused(surface, inventory.components).map((page) => page.pageId)
  }
  if (options.all) {
    const ids = new Set<string>()
    for (const page of existing?.pages ?? []) ids.add(page.pageId)
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
    verify?: CompositionVerifier
  },
): Promise<MultiSurfaceSyncPlan> {
  const context = readSyncContext(workspace)
  let surface = loadCurrentSurface(workspace, context.inventory.fileKey, options.now)
  const plans: PageSurfacePlan[] = []
  for (const pageId of options.pageIds) {
    const tree = options.trees.get(pageId)
    if (!tree) throw new Error(`page tree input does not contain Figma page ${pageId}`)
    const next = planSurfaceSyncOn(surface, pageId, tree, options.now, context)
    surface = next.surface
    plans.push(next)
  }
  // One pinned existence read for every missing composition of the batch: the
  // page-tree read is depth-limited, so only the file can tell a deletion from
  // a node the read did not reach.
  const missingIds = [
    ...new Set(plans.flatMap((plan) => plan.missingCompositions.map((item) => item.nodeId))),
  ]
  const probe = options.verify && missingIds.length ? await options.verify(missingIds) : null
  const pages: PageSurfaceDiff[] = plans.map((plan) => ({
    page: plan.page,
    added: plan.added,
    removed: plan.removed,
    compositionCandidates: plan.compositionCandidates,
    ...classifyMissingCompositions(plan.missingCompositions, probe),
  }))
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

export async function readSurfaceTrees(
  workspace: Workspace,
  pageIds: string[],
  options: { input?: string; token?: string; allowMissingPages?: boolean },
): Promise<{ trees: Map<string, unknown>; missingPages: string[]; version?: string }> {
  const uniqueIds = normalizePageIds(pageIds)
  const trees = new Map<string, unknown>()
  const missingPages: string[] = []
  if (!uniqueIds.length) return { trees, missingPages }
  if (options.input) {
    const value: unknown = JSON.parse(fs.readFileSync(options.input, "utf8"))
    for (const pageId of uniqueIds) {
      if (!findTree(value, pageId)) {
        if (options.allowMissingPages) {
          missingPages.push(pageId)
          continue
        }
        throw new Error(`input does not contain page ${pageId}`)
      }
      trees.set(pageId, value)
    }
    return { trees, missingPages }
  }
  if (!options.token) throw new Error("REST page reads require a resolved Figma token")
  const key = fileKeyFromSource(workspace)
  if (!key) throw new Error("cannot resolve the Figma file key from src/catalog/figma/file.ts")
  const pages = await fetchFilePages(key, options.token)
  const pageById = new Map(pages.pages.map((item) => [item.id, item]))
  const availableIds: string[] = []
  for (const pageId of uniqueIds) {
    if (!pageById.has(pageId)) {
      if (options.allowMissingPages) {
        missingPages.push(pageId)
        continue
      }
      throw new Error(`Figma page ${pageId} is not in the file`)
    }
    availableIds.push(pageId)
  }
  if (!availableIds.length) return { trees, missingPages, version: pages.version }
  const result = await fetchNodeTrees(key, pages.version, availableIds, options.token, 10)
  for (const pageId of availableIds) {
    const tree = result.get(pageId)
    if (!tree) throw new Error(`Figma REST returned no page tree for ${pageId}`)
    const root = record(tree)
    const page = pageById.get(pageId)
    trees.set(pageId, { ...(root ?? {}), id: pageId, name: page?.name ?? pageId, type: "CANVAS" })
  }
  return { trees, missingPages, version: pages.version }
}

// Binds the existence probe to the version the page trees were read at, so the
// stale verdict and the census describe the same snapshot of the file.
export function surfaceCompositionVerifier(
  workspace: Workspace,
  options: { token: string; version: string },
): CompositionVerifier {
  const fileKey = fileKeyFromSource(workspace)
  if (!fileKey) throw new Error("cannot resolve the Figma file key from src/catalog/figma/file.ts")
  return (nodeIds) => fetchNodeExistence(fileKey, options.version, nodeIds, options.token)
}
