import type { Inventory, PageComposition } from "../schemas/catalogue.ts"
import type { DevicePolicy } from "../schemas/devices.ts"
import { inferDeviceFromFrame } from "./devices.ts"
import type { NodeExistence } from "./rest.ts"
import { RULES_BOX_NAMES } from "./rules.ts"

export type TreeNode = {
  id: string
  name: string
  type: string
  componentId?: string
  width?: number
  children?: TreeNode[]
}

// Resolves the existence of missing node ids against the pinned file. A node
// deeper than the page-tree read depth reports "exists"; only an explicit null
// document confirms a deletion ("deleted").
export type CompositionVerifier = (nodeIds: string[]) => Promise<Map<string, NodeExistence>>

export type CompositionCandidate = {
  nodeId: string
  name: string
  drawn: number
  width?: number
  suggestedDevice?: string
}

export function isIdentityNode(node: TreeNode): boolean {
  return node.type === "COMPONENT" || node.type === "COMPONENT_SET"
}

export function isCompositionContainer(node: TreeNode): boolean {
  return node.type === "FRAME" || node.type === "GROUP"
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
    // Component definitions describe internal anatomy rather than usage
    // compositions; stop here so helper/set definitions inside frames do not
    // masquerade as page composition drawings.
    if (isIdentityNode(current)) return
    if (current.type === "INSTANCE" && current.componentId && targets.has(current.componentId)) {
      count += 1
      return
    }
    for (const child of current.children ?? []) visit(child)
  }
  for (const child of node.children ?? []) visit(child)
  return count
}

function compositionContainers(root: TreeNode): TreeNode[] {
  const containers: TreeNode[] = []
  const collect = (node: TreeNode): void => {
    if (RULES_BOX_NAMES.has(node.name.trim())) return
    if (isIdentityNode(node)) return
    if (node.type === "SECTION") {
      for (const child of node.children ?? []) {
        if (RULES_BOX_NAMES.has(child.name.trim())) continue
        if (isCompositionContainer(child)) containers.push(child)
      }
      return
    }
    if (isCompositionContainer(node)) containers.push(node)
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
): { compositionCandidates: CompositionCandidate[]; missingCompositions: PageComposition[] } {
  const allIds = collectNodeIds(root)
  const missingCompositions = existing.filter((composition) => !allIds.has(composition.nodeId))
  const targets = publishedTargetIds(root, pageId, inventory)
  if (!targets.size) return { compositionCandidates: [], missingCompositions }

  const existingIds = new Set(existing.map((composition) => composition.nodeId))
  const compositionCandidates: CompositionCandidate[] = []
  for (const container of compositionContainers(root)) {
    if (existingIds.has(container.id)) continue
    const drawn = countTargetInstances(container, targets, existingIds)
    if (drawn === 0) continue
    const suggestedDevice = inferDeviceFromFrame(container.name, container.width, policy)
    compositionCandidates.push({
      nodeId: container.id,
      name: container.name,
      drawn,
      ...(container.width !== undefined ? { width: Math.round(container.width) } : {}),
      ...(suggestedDevice ? { suggestedDevice } : {}),
    })
  }
  return { compositionCandidates, missingCompositions }
}

// A composition missing from the tree read is confirmed deleted only when the
// pinned file explicitly returns a deleted answer; "exists", "unknown" (omitted
// from a partial response) and missing verifiers (`--input`) stay unverified.
export function classifyMissingCompositions(
  missing: PageComposition[],
  probe: Map<string, NodeExistence> | null,
): { staleCompositions: PageComposition[]; unverifiedCompositions: PageComposition[] } {
  const staleCompositions: PageComposition[] = []
  const unverifiedCompositions: PageComposition[] = []
  for (const composition of missing) {
    if (probe?.get(composition.nodeId) === "deleted") staleCompositions.push(composition)
    else unverifiedCompositions.push(composition)
  }
  return { staleCompositions, unverifiedCompositions }
}
