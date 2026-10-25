// Read-only view model behind the "Figma inventory" dashboard.
//
// It is a pure projection of committed files: the generated inventory, the
// hand-maintained registry, the parity case corpus and the generated story
// title map. Areas and status filters are derived from those files at startup,
// so a new component, folder or registry status never needs a dashboard edit.
// Nothing calls Figma at runtime.
import parityCasesData from "@/catalog/figma/parity-cases.json"
import {
  figmaCoverage,
  figmaDeviceCoverage,
  figmaDeviceCoverageCounts,
  type FigmaCoverageRow,
} from "@/catalog/figma/coverage"
import { FIGMA_DESIGN_URL, figmaNodeUrl } from "@/catalog/figma/file"
import {
  figmaInventoryMeta,
  type FigmaBulkRule,
  type FigmaNodeStatus,
  type FigmaRegistryEntry,
  type FigmaTarget,
} from "@/catalog/figma/registry"
import storyTitlesData from "@/catalog/figma/story-titles.json"

// --------------------------------------------------------------- vocabulary

export type RegistryStatus = FigmaNodeStatus | "unaccounted"

// The registry's closed status vocabulary. The order is presentation only: the
// labels, counts and filter chips are derived from the data below.
export const STATUS_ORDER: RegistryStatus[] = [
  "implemented",
  "pending",
  "mocked",
  "excluded",
  "unaccounted",
]

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function statusLabel(status: RegistryStatus) {
  return capitalize(status)
}

// The atomic level is gone: keeping a page → level map meant editing the
// dashboard whenever the Figma file reorganized. The code folder in the
// registry target is the stable, already-maintained taxonomy.
export function areaOf(
  target: FigmaTarget | undefined,
  rule: FigmaBulkRule | undefined,
  hasEntry: boolean,
) {
  if (target?.module) {
    if (target.module.startsWith("apps/storybook/")) return "Templates"
    const match = target.module.match(/^src\/components\/([^/]+)\//)
    if (match) return capitalize(match[1].replace(/-/g, " "))
    return "Package"
  }
  if (rule?.assetManifest) {
    if (rule.assetManifest.includes("pictogram")) return "Pictograms"
    if (rule.assetManifest.includes("icon")) return "Icons"
  }
  return rule || hasEntry ? "No module" : "Unmapped"
}

// ------------------------------------------------------- storybook addresses

const storyTitles: Record<string, string> = storyTitlesData

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Storybook derives both halves of a story id from words: the title
// (`Components/Inputs/TextField`) and the export name (`SourceCase`) become
// `components-inputs-textfield--source-case`.
function exportSlug(name: string) {
  return slugify(
    name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2"),
  )
}

function storyUrlFor(target: FigmaTarget | undefined) {
  const title = target?.story ? storyTitles[target.story] : undefined
  if (!title) return null
  const story = target?.storyExports?.[0]
  const path = story
    ? `story/${slugify(title)}--${exportSlug(story)}`
    : `docs/${slugify(title)}--docs`
  return `${import.meta.env.BASE_URL}?path=/${path}`
}

// ------------------------------------------------------------- parity cases

interface ParityCase {
  nodeId: string
  note?: string
}

const parityCases: ParityCase[] = parityCasesData.map((entry) => ({
  nodeId: entry.nodeId,
  note: entry.note,
}))

const caseCountByNode = new Map<string, { committed: number; draft: number }>()
for (const entry of parityCases) {
  const draft =
    typeof entry.note === "string" && entry.note.trim().toLowerCase().startsWith("draft")
  const counts = caseCountByNode.get(entry.nodeId) ?? { committed: 0, draft: 0 }
  if (draft) counts.draft += 1
  else counts.committed += 1
  caseCountByNode.set(entry.nodeId, counts)
}

// ------------------------------------------------------------------- entries

export interface VariantAxis {
  name: string
  type: string
  options: string[]
  defaultValue: string | null
}

export interface RegistryItem {
  id: string
  nodeId: string
  name: string
  type: string
  pageLabel: string
  area: string
  status: RegistryStatus
  statusLabel: string
  entry: FigmaRegistryEntry | undefined
  rule: FigmaBulkRule | undefined
  exportName: string | null
  module: string | null
  moduleFile: string | null
  sourceUrl: string | null
  storyUrl: string | null
  storyTitle: string | null
  storyExports: string[]
  figmaUrl: string
  designFingerprint: string
  contractFingerprint: string
  variantCount: number
  variantAxes: VariantAxis[]
  devices: string[]
  deviceCoverage: { declared: string[]; covered: string[]; missing: string[] } | null
  caseCount: { committed: number; draft: number }
  box: { width: number; height: number } | null
  dependencies: number
  externalDependencies: number
  note: string | null
  searchText: string
}

const GITHUB_BLOB = "https://github.com/pagopa/ui/blob/main"

function cleanPageName(value: string) {
  return value
    .replace(/^[•◆]\s*/, "")
    .replace(/\s*[🟢🟠🚧]\s*$/u, "")
    .trim()
}

function sourceUrlOf(module: string | null) {
  if (!module) return null
  const path = module.startsWith("apps/") ? module : `packages/pagopa-ui/${module}`
  return `${GITHUB_BLOB}/${path}`
}

type InventoryNode = FigmaCoverageRow["node"]

function propertyName(value: string) {
  return value
    .replace(/#\d+:\d+$/, "")
    .replace(/^[^a-z0-9]+/i, "")
    .trim()
}

function variantAxesOf(node: InventoryNode): VariantAxis[] {
  return Object.entries(node.properties ?? {}).map(([name, value]) => ({
    name: propertyName(name) || name,
    type: value?.type ?? "VARIANT",
    options: value?.variantOptions ?? [],
    defaultValue: value?.defaultValue === undefined ? null : String(value.defaultValue),
  }))
}

function dependencyCounts(node: InventoryNode) {
  const dependencies = node.dependencies ?? []
  return {
    dependencies: dependencies.length,
    externalDependencies: dependencies.filter((dependency) => dependency.external).length,
  }
}

function searchTextOf(item: RegistryItem) {
  return [
    item.name,
    item.nodeId,
    item.pageLabel,
    item.area,
    item.statusLabel,
    item.exportName,
    item.module,
    item.storyTitle,
    item.devices.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function buildItem(row: FigmaCoverageRow): RegistryItem {
  const { node, status, entry, rule } = row
  const target = entry?.target
  const module = target?.module ?? null
  const deviceCoverage = figmaDeviceCoverage.get(node.nodeId) ?? null
  const dependencies = dependencyCounts(node)

  const item: RegistryItem = {
    id: node.nodeId,
    nodeId: node.nodeId,
    name: node.name,
    type: node.type,
    pageLabel: cleanPageName(node.pageName),
    area: areaOf(target, rule, Boolean(entry)),
    status,
    statusLabel: statusLabel(status),
    entry,
    rule,
    exportName: target?.export ?? rule?.namesExport ?? null,
    module,
    moduleFile: module?.split("/").pop() ?? null,
    sourceUrl: sourceUrlOf(module),
    storyUrl: storyUrlFor(target),
    storyTitle: target?.story ? (storyTitles[target.story] ?? null) : null,
    storyExports: target?.storyExports ?? [],
    figmaUrl: figmaNodeUrl(node.nodeId),
    designFingerprint: node.designFingerprint ?? "",
    contractFingerprint: node.contractFingerprint ?? "",
    variantCount: node.variants?.length ?? 0,
    variantAxes: variantAxesOf(node),
    devices: deviceCoverage?.declared ?? [],
    deviceCoverage,
    caseCount: caseCountByNode.get(node.nodeId) ?? { committed: 0, draft: 0 },
    box: node.variants?.[0]?.box ?? null,
    ...dependencies,
    note: entry?.note ?? entry?.reason ?? rule?.reason ?? null,
    searchText: "",
  }

  item.searchText = searchTextOf(item)
  return item
}

export const registryItems: RegistryItem[] = figmaCoverage.map(buildItem)
export const registryItemById = new Map(registryItems.map((item) => [item.id, item]))

// -------------------------------------------------------------- derived cuts

export const AREAS = [...new Set(registryItems.map((item) => item.area))].sort((left, right) =>
  left.localeCompare(right, "en"),
)

export const areaCounts = AREAS.reduce<Record<string, number>>((counts, area) => {
  counts[area] = registryItems.filter((item) => item.area === area).length
  return counts
}, {})

export const statusCounts = STATUS_ORDER.reduce<Record<RegistryStatus, number>>(
  (counts, status) => {
    counts[status] = registryItems.filter((item) => item.status === status).length
    return counts
  },
  { implemented: 0, pending: 0, mocked: 0, excluded: 0, unaccounted: 0 },
)

// A status with no nodes is not offered as an empty filter.
export const STATUSES = STATUS_ORDER.filter((status) => statusCounts[status] > 0)

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

export const totals = {
  total: registryItems.length,
  pages: new Set(registryItems.map((item) => item.pageLabel)).size,
  implemented: statusCounts.implemented,
  mocked: statusCounts.mocked,
  pending: statusCounts.pending,
  excluded: statusCounts.excluded,
  unaccounted: statusCounts.unaccounted,
  notShipped: statusCounts.mocked + statusCounts.pending + statusCounts.unaccounted,
  variants: sum(registryItems.map((item) => item.variantCount)),
  sets: registryItems.filter((item) => item.variantCount > 0).length,
  deviceVariants: sum(registryItems.map((item) => item.deviceCoverage?.declared.length ?? 0)),
  cases: sum(registryItems.map((item) => item.caseCount.committed)),
  draftCases: sum(registryItems.map((item) => item.caseCount.draft)),
}

export const syncPercent = totals.total === 0 ? 0 : (totals.implemented / totals.total) * 100
export const unaccountedCount = statusCounts.unaccounted

export const deviceTotals = figmaDeviceCoverageCounts
export const inventoryMeta = {
  fileKey: figmaInventoryMeta.fileKey,
  syncedAt: figmaInventoryMeta.syncedAt,
  total: figmaInventoryMeta.total,
  figmaUrl: FIGMA_DESIGN_URL,
}

// ------------------------------------------------------------------ helpers

export function formatDate(value: string) {
  if (!value) return "—"
  const iso = value.length > 10 ? value : `${value}T00:00:00Z`
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value)
}

export function shortFingerprint(value: string) {
  return value ? value.slice(0, 7) : "—"
}

export const SORT_OPTIONS = [
  { id: "page", label: "Page order" },
  { id: "name", label: "Name A–Z" },
  { id: "variants", label: "Most variants" },
  { id: "status", label: "Registry status" },
] as const

export type SortKey = (typeof SORT_OPTIONS)[number]["id"]

const statusOrder = new Map(STATUS_ORDER.map((status, index) => [status, index]))

export function sortRegistryItems(items: RegistryItem[], sort: SortKey) {
  const sorted = [...items]
  sorted.sort((left, right) => {
    switch (sort) {
      case "name":
        return left.name.localeCompare(right.name, "en")
      case "variants":
        return right.variantCount - left.variantCount || left.name.localeCompare(right.name, "en")
      case "status":
        return (
          (statusOrder.get(left.status) ?? 99) - (statusOrder.get(right.status) ?? 99) ||
          left.name.localeCompare(right.name, "en")
        )
      case "page":
        return (
          left.pageLabel.localeCompare(right.pageLabel, "en") ||
          left.name.localeCompare(right.name, "en")
        )
    }
  })
  return sorted
}

export function filterRegistryItems(
  items: RegistryItem[],
  options: { query: string; area: string | "all"; status: RegistryStatus | "all" },
) {
  const query = options.query.trim().toLowerCase()
  return items.filter((item) => {
    if (options.area !== "all" && item.area !== options.area) return false
    if (options.status !== "all" && item.status !== options.status) return false
    if (!query) return true
    return query.split(/\s+/).every((term) => item.searchText.includes(term))
  })
}

export function alignmentOf(item: RegistryItem) {
  if (item.status === "mocked") return { id: "mocked", label: "Mocked" } as const
  if (item.status === "excluded") return { id: "excluded", label: "Excluded by registry" } as const
  if (item.status === "unaccounted") return { id: "unmapped", label: "No registry entry" } as const
  if (item.status === "pending") return { id: "pending", label: "Pending implementation" } as const
  if (item.deviceCoverage && item.deviceCoverage.missing.length > 0)
    return { id: "partial", label: "Partial device coverage" } as const
  return { id: "aligned", label: "Aligned" } as const
}
