// Node-level Figma alignment registry.
//
// - `inventory.json` is GENERATED (read-only snapshot of what exists in Figma).
// - `registry.json` is HAND-MAINTAINED (what we decided about each node).
// - Both are joined by `nodeId`, so renames in Figma never break the mapping.
//
// `scripts/figma-sync.mjs` validates both in CI; treat it as the authority for
// the shape of these files.
import inventoryData from "./inventory.json"
import registryData from "./registry.json"
import { iconManifest, pictogramManifest } from "pagopa-ui-artwork"

export type FigmaNodeStatus = "implemented" | "mocked" | "excluded" | "pending"

export interface FigmaTarget {
  module: string
  export: string
  additionalExports?: string[]
  additionalTargets?: { module: string; export: string }[]
  storyExports?: string[]
  story?: string
}

export interface FigmaRegistryEntry {
  status: FigmaNodeStatus
  target?: FigmaTarget
  reason?: string
  note?: string
}

export interface FigmaBulkRule {
  pageId: string
  page: string
  status: FigmaNodeStatus
  reason?: string
  evidence?: string
  namesExport?: string
  assetManifest?: string
  note?: string
}

export interface FigmaInventoryNode {
  nodeId: string
  name: string
  type: string
  pageId: string
  pageName: string
  assetKey?: string
  sources?: string[]
  properties?: Partial<
    Record<string, { type: string; defaultValue?: string | boolean; variantOptions?: string[] }>
  >
  dependencies?: { external: boolean; nodeId?: string; assetKey?: string }[]
  // Per-variant records of a published set (RA2): the device each variant
  // declares, its own box and its own design fingerprint.
  variants?: {
    nodeId: string
    name: string
    device: string | null
    box: { width: number; height: number } | null
    designFingerprint: string
  }[]
  contractFingerprint?: string
  designFingerprint?: string | null
}

interface InventoryData {
  fileKey: string
  syncedAt: string
  components: FigmaInventoryNode[]
}

interface RegistryData {
  bulkRules: FigmaBulkRule[]
  entries: Record<string, FigmaRegistryEntry>
}

// JSON module types are inferred from the file contents (`status` is just
// `string`), so reconcile the hand-maintained registry with the union here:
// unknown statuses fail loudly instead of being papered over with a cast.
function toStatus(value: string): FigmaNodeStatus {
  switch (value) {
    case "implemented":
    case "mocked":
    case "excluded":
    case "pending":
      return value
    default:
      throw new Error(`Unknown status in registry.json: ${value}`)
  }
}

// `inventory.json` is generated with exactly these fields, so the assignment
// doubles as a compile-time shape check against drift.
const inventory: InventoryData = inventoryData

const entries: Record<string, FigmaRegistryEntry> = {}
for (const [nodeId, entry] of Object.entries(registryData.entries)) {
  entries[nodeId] = { ...entry, status: toStatus(entry.status) }
}

const registry: RegistryData = {
  bulkRules: registryData.bulkRules.map((rule) => ({ ...rule, status: toStatus(rule.status) })),
  entries,
}

export const figmaInventoryMeta = {
  fileKey: inventory.fileKey,
  syncedAt: inventory.syncedAt,
  total: inventory.components.length,
}

export const figmaInventoryNodes = inventory.components

export const figmaBulkRules = registry.bulkRules

const bulkByPage = new Map(registry.bulkRules.map((rule) => [rule.pageId, rule]))
const catalogueNodes = new Map([
  ["src/assets/figma-icons/manifest.json", Object.keys(iconManifest.entries)],
  ["src/assets/figma-pictograms/manifest.json", Object.keys(pictogramManifest.entries)],
])
const bulkByNode = new Map<string, FigmaBulkRule>()
for (const rule of registry.bulkRules) {
  for (const id of catalogueNodes.get(rule.assetManifest ?? "") ?? []) {
    bulkByNode.set(id, rule)
  }
}

export function getRegistryEntry(nodeId: string): FigmaRegistryEntry | undefined {
  return registry.entries[nodeId]
}

export interface FigmaNodeAccount {
  node: FigmaInventoryNode
  status: FigmaNodeStatus | "unaccounted"
  entry?: FigmaRegistryEntry
  rule?: FigmaBulkRule
}

export function accountFor(node: FigmaInventoryNode): FigmaNodeAccount {
  const entry = registry.entries[node.nodeId]
  if (entry) return { node, status: entry.status, entry }
  const rule = bulkByNode.get(node.nodeId) ?? bulkByPage.get(node.pageId)
  if (rule) return { node, status: rule.status, rule }
  return { node, status: "unaccounted" }
}
