import fs from "node:fs"
import type { Workspace } from "../adapters/workspace.ts"
import { fetchFilePages, fetchNodeTrees } from "./rest.ts"
import { fileKeyFromSource } from "./snapshot.ts"
import { surfaceDecision } from "./surface-decision.ts"
import { readJson, writeJson } from "../lib/json.ts"
import { readInventory, readRegistry } from "../records/committed.ts"
import {
  PageSurfaceSchema,
  type PageIdentity,
  type PageSurface,
  type PageSurfacePage,
} from "../schemas/catalogue.ts"
import type { Registry } from "../schemas/catalogue.ts"
import { syncCatalogue, type CatalogueReport } from "./catalogue/index.ts"

const SURFACE_PATH = "src/catalog/figma/page-surface.json"
const DEFAULT_NOTE =
  "Read from the Figma page tree. Preserve reviewed composition decisions while refreshing the identity census."

type TreeNode = { id: string; name: string; type: string; children?: TreeNode[] }
type SurfaceCheck = (surface: PageSurface) => Promise<CatalogueReport>

export type SurfaceSyncPlan = {
  surface: PageSurface
  page: PageSurfacePage
  added: PageIdentity[]
  removed: PageIdentity[]
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
  const children = Array.isArray(item.children)
    ? item.children.map(treeNode).filter((child): child is TreeNode => child !== null)
    : undefined
  return { id: item.id, name: item.name, type: item.type, ...(children ? { children } : {}) }
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
    }
    for (const child of node.children ?? []) visit(child)
  }
  for (const child of root.children ?? []) visit(child)
  return found
}

function decisionFor(
  nodeId: string,
  registry: Registry,
  pageId: string,
): { decision: PageIdentity["decision"]; reason?: string } {
  const entry = registry.entries[nodeId]
  const status = entry?.status ?? registry.bulkRules.find((rule) => rule.pageId === pageId)?.status
  const reason =
    entry?.reason ??
    entry?.note ??
    registry.bulkRules.find((rule) => rule.pageId === pageId)?.reason ??
    registry.bulkRules.find((rule) => rule.pageId === pageId)?.note
  const decision = surfaceDecision(true, status)
  if (decision === "pending" && !reason)
    return {
      decision,
      reason: status
        ? `Registry decision is ${status}; add its reviewed reason.`
        : "No registry entry or page bulk rule exists; review this published identity.",
    }
  return { decision, ...(reason ? { reason } : {}) }
}

export function planSurfaceSync(
  workspace: Workspace,
  pageId: string,
  source: unknown,
  readAt: string,
): Omit<SurfaceSyncPlan, "dryRun" | "check"> {
  const root = findTree(source, pageId)
  if (!root || root.type !== "CANVAS")
    throw new Error(`page tree input does not contain Figma page ${pageId}`)
  const inventory = readInventory(workspace.root)
  const registry = readRegistry(workspace.root)
  const file = workspace.path(SURFACE_PATH)
  const current = fs.existsSync(file)
    ? readJson(file, PageSurfaceSchema)
    : { fileKey: inventory.fileKey, readAt, note: DEFAULT_NOTE, pages: [] }
  if (current.fileKey !== inventory.fileKey)
    throw new Error(
      `page surface fileKey ${current.fileKey} does not match inventory ${inventory.fileKey}`,
    )

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
    const derived = decisionFor(node.id, registry, pageId)
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
  const page: PageSurfacePage = {
    pageId,
    pageName: root.name,
    identities: nextIdentities,
    compositions: oldPage?.compositions ?? [],
  }
  const pages = oldPage
    ? current.pages.map((item) => (item.pageId === pageId ? page : item))
    : [...current.pages, page]
  return {
    surface: PageSurfaceSchema.parse({ ...current, readAt, pages }),
    page,
    added,
    removed,
  }
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
  const plan = planSurfaceSync(workspace, options.pageId, options.tree, options.now)
  let check: CatalogueReport
  try {
    check = await (options.check ?? ((surface) => syncCatalogue(workspace, { surface })))(
      plan.surface,
    )
  } catch (error) {
    check = {
      exitCode: 1,
      out: [],
      err: [`error: ${error instanceof Error ? error.message : String(error)}`],
    }
  }
  if (!options.dryRun) writeJson(workspace.path(SURFACE_PATH), plan.surface)
  return { ...plan, dryRun: options.dryRun, check }
}

export async function readSurfaceTree(
  workspace: Workspace,
  pageId: string,
  options: { input?: string; token?: string },
): Promise<unknown> {
  if (options.input) {
    const value: unknown = JSON.parse(fs.readFileSync(options.input, "utf8"))
    if (!findTree(value, pageId)) throw new Error(`input does not contain page ${pageId}`)
    return value
  }
  if (!options.token) throw new Error("REST page reads require a resolved Figma token")
  const key = fileKeyFromSource(workspace)
  if (!key) throw new Error("cannot resolve the Figma file key from src/catalog/figma/file.ts")
  const pages = await fetchFilePages(key, options.token)
  const page = pages.pages.find((item) => item.id === pageId)
  if (!page) throw new Error(`Figma page ${pageId} is not in the file`)
  const result = await fetchNodeTrees(key, pages.version, [pageId], options.token, 10)
  const tree = result.get(pageId)
  if (!tree) throw new Error(`Figma REST returned no page tree for ${pageId}`)
  const root = record(tree)
  return { ...(root ?? {}), id: pageId, name: page.name, type: "CANVAS" }
}
