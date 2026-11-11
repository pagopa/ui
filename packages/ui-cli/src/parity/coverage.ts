import fs from "node:fs"
import path from "node:path"
import { isDeepStrictEqual } from "node:util"

import type { Workspace } from "../adapters/workspace.ts"
import { resolveProvenance } from "../figma/asset-provenance.ts"
import { catalogueIndex } from "../figma/snapshot.ts"
import { readJson } from "../lib/json.ts"
import { readDevicePolicy, readInventory } from "../records/committed.ts"
import { IconManifestSchema, PictogramManifestSchema } from "../schemas/artwork.ts"
import type { BulkRule, InventoryNode, Registry } from "../schemas/catalogue.ts"
import type { DevicePolicy } from "../schemas/devices.ts"
import type { ParityCase } from "../schemas/parity.ts"
import { deviceCoverage, isDraftCase, validateCaseFile } from "./cases.ts"
import { checkEvidence, type EvidenceReport } from "./evidence.ts"

type BulkQualification = { pageId: string; nodeIds: string[]; errors: string[] }

// Qualification reads the accepted manifest/provenance contract, not a new
// screenshot per glyph. Geometry regeneration remains the artwork check's job.
export function qualifyBulk(
  workspace: Workspace,
  rule: BulkRule,
  nodes: InventoryNode[],
  fileKey: string,
): BulkQualification {
  const errors: string[] = []
  const fail = (message: string): void => {
    errors.push(message)
  }
  if (rule.status !== "implemented" || !rule.namesExport || !rule.assetManifest || !rule.evidence) {
    return { pageId: rule.pageId, nodeIds: [], errors: ["no supported implemented bulk proof"] }
  }
  try {
    const raw = readJson(path.join(workspace.artworkRoot, rule.assetManifest))
    const manifest =
      rule.namesExport === "figmaIconNames"
        ? IconManifestSchema.parse(raw)
        : PictogramManifestSchema.parse(raw)
    if (manifest.fileKey !== fileKey) fail("manifest file key differs from inventory")
    // The manifest is the single source of public names: the generated names
    // export is checked against it by `check catalogue`, never re-parsed here.
    const provenance = resolveProvenance(rule, new Set(nodes.map((node) => node.nodeId)))
    const assets = Object.values(manifest.entries)
    const assetNames = assets.map((asset) => asset.name)
    if (new Set(assetNames).size !== assetNames.length) fail("duplicate asset names")
    for (const id of Object.keys(manifest.entries)) {
      if (!nodes.some((node) => node.nodeId === id)) fail(`stale asset ${id}`)
    }
    for (const node of nodes) {
      const asset = manifest.entries[node.nodeId]
      if (!asset) {
        fail(`missing asset ${node.nodeId}`)
        continue
      }
      if (asset.designFingerprint !== node.designFingerprint) fail(`stale asset ${node.nodeId}`)
      if (!isDeepStrictEqual(asset.provenance, provenance.get(node.nodeId))) {
        fail(`provenance mismatch ${node.nodeId}`)
      }
      const variants =
        "variants" in asset ? Object.values(asset.variants) : [asset.light, asset.dark]
      const declared = new Set((node.variants ?? []).map((variant) => variant.nodeId))
      if (!declared.size) declared.add(node.nodeId)
      if (
        variants.length !== declared.size ||
        variants.some((variant) => !declared.has(variant.nodeId) || !variant.sha256)
      ) {
        fail(`incomplete pinned assets ${node.nodeId}`)
      }
      for (const variant of variants) {
        if (
          !fs.existsSync(
            path.join(
              path.dirname(path.join(workspace.artworkRoot, rule.assetManifest)),
              variant.file,
            ),
          )
        ) {
          fail(`missing asset file ${variant.file}`)
        }
      }
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
  return {
    pageId: rule.pageId,
    nodeIds: errors.length ? [] : nodes.map((node) => node.nodeId),
    errors,
  }
}

type PopulationOptions = {
  nodes: InventoryNode[]
  registry: Registry
  cases: ParityCase[]
  evidence?: EvidenceReport
  policy?: DevicePolicy
  bulk?: BulkQualification[]
  statuses?: string[]
  fileKey?: string
  owners?: Map<string, BulkRule>
  corpusErrors?: string[]
}
type ResolvedNode = {
  node: InventoryNode
  rule?: BulkRule
  status: Registry["entries"][string]["status"] | "unaccounted"
}
type VariantRow = {
  nodeId: string
  name: string
  reviewed: boolean
  declared: string[]
  covered: string[]
  missing: string[]
}
export function coveragePopulations(
  workspace: Workspace,
  {
    nodes,
    registry,
    cases,
    evidence = checkEvidence({
      root: workspace.workspaceRoot,
      dataRoot: workspace.root,
      cases,
      nodes,
    }),
    policy = readDevicePolicy(workspace.root),
    bulk = [],
    statuses = ["implemented"],
    fileKey,
    owners = new Map<string, BulkRule>(),
    corpusErrors,
  }: PopulationOptions,
) {
  const resolved = resolveNodes(nodes, registry, owners)
  const published = publishedCounts(resolved)
  const bulkIds = new Set(bulk.flatMap((item) => item.nodeIds))
  const ordinary = resolved.filter(
    (row) => row.status === "implemented" && !bulkIds.has(row.node.nodeId),
  )
  const matchingFile = !fileKey || evidence.fileKey === fileKey
  const validEvidence = new Set(matchingFile ? evidence.verifiedCases : [])
  const validationErrors =
    corpusErrors ?? validateCaseFile(workspace, cases, { nodes, registry, policy }).errors
  const invalidIds = new Set(validationErrors.map((error) => error.split(": ")[0]))
  const reviewed = cases.filter(
    (entry) => !isDraftCase(entry) && validEvidence.has(entry.id) && !invalidIds.has(entry.id),
  )
  const rows = variantRows(ordinary, reviewed, evidence)
  const devices = populationDevices(
    nodes,
    registry,
    resolved,
    cases,
    reviewed,
    invalidIds,
    policy,
    statuses,
  )
  const bulkFamilies = bulkRows(bulk, registry, resolved)
  return populationSummary(
    nodes,
    published,
    rows,
    bulkFamilies,
    devices,
    statuses,
    evidence,
    reviewed,
    cases,
    matchingFile,
    validationErrors,
  )
}

export function loadCoveragePopulations(
  workspace: Workspace,
  nodes: InventoryNode[],
  registry: Registry,
  cases: ParityCase[],
  statuses = ["implemented"],
  evidence?: EvidenceReport,
  fileKey?: string,
  corpusErrors?: string[],
) {
  let byNode = new Map<string, BulkRule>()
  let ownershipError: string | undefined
  try {
    byNode = catalogueIndex(registry, workspace).byNode
  } catch (error) {
    ownershipError = error instanceof Error ? error.message : String(error)
  }
  const resolvedFileKey = fileKey ?? readInventory(workspace.root).fileKey
  const bulk = registry.bulkRules
    .filter((rule) => rule.status === "implemented")
    .map((rule) =>
      ownershipError
        ? { pageId: rule.pageId, nodeIds: [], errors: [ownershipError] }
        : qualifyBulk(
            workspace,
            rule,
            nodes.filter(
              (node) =>
                (byNode.get(node.nodeId) ??
                  registry.bulkRules.find((item) => item.pageId === node.pageId)) === rule,
            ),
            resolvedFileKey,
          ),
    )
  return coveragePopulations(workspace, {
    nodes,
    registry,
    cases,
    statuses,
    evidence,
    owners: byNode,
    bulk,
    fileKey: resolvedFileKey,
    corpusErrors,
  })
}

export function formatCoverage(report: ReturnType<typeof coveragePopulations>): string[] {
  const { published, cases, bulk, devices, variants } = report
  return [
    `published mappings: ${published.total} · ${Object.entries(published.statuses)
      .map(([status, count]) => `${count} ${status}`)
      .join(" · ")}`,
    `figma parity coverage: ordinary implemented nodes with reviewed cases ${cases.reviewed}/${cases.declared} · bulk ${bulk.nodes} manifest/provenance-qualified (${bulk.families.map((family) => `${family.nodes} ${family.namesExport ?? family.pageId}`).join(", ")}) · devices ${devices.totals.covered}/${devices.totals.declared} (${devices.statuses.join(",")})`,
    `explicit variants: ${variants.reviewed}/${variants.declared} reviewed with verified pinned evidence · ${variants.missing} missing (ordinary implemented nodes; no inferred equivalence)`,
  ]
}

function resolveNodes(
  nodes: InventoryNode[],
  registry: Registry,
  owners: Map<string, BulkRule>,
): ResolvedNode[] {
  const resolved = nodes.map(
    (
      node,
    ): {
      node: InventoryNode
      rule?: BulkRule
      status: Registry["entries"][string]["status"] | "unaccounted"
    } => {
      const rule =
        owners.get(node.nodeId) ?? registry.bulkRules.find((item) => item.pageId === node.pageId)
      return {
        node,
        rule,
        status: registry.entries[node.nodeId]?.status ?? rule?.status ?? "unaccounted",
      }
    },
  )
  return resolved
}

function publishedCounts(resolved: ResolvedNode[]) {
  const published: Record<string, number> = {
    implemented: 0,
    mocked: 0,
    pending: 0,
    excluded: 0,
    unaccounted: 0,
  }
  for (const row of resolved) published[row.status] += 1
  return published
}

function variantRows(
  ordinary: ResolvedNode[],
  reviewed: ParityCase[],
  evidence: EvidenceReport,
): VariantRow[] {
  const coveredNodes = new Set(reviewed.map((entry) => entry.nodeId))
  const rows = ordinary.map(({ node }) => {
    const declared = (node.variants ?? []).map((variant) => variant.nodeId)
    // The manifest pins one explicit source ID even when the case uses a state
    // selector. Neither it nor a device implies equivalence with other variants.
    const covered = declared.filter((id) =>
      reviewed.some(
        (entry) => entry.nodeId === node.nodeId && evidence.verifiedVariants[entry.id] === id,
      ),
    )
    return {
      nodeId: node.nodeId,
      name: node.name,
      reviewed: coveredNodes.has(node.nodeId),
      declared,
      covered,
      missing: declared.filter((id) => !covered.includes(id)),
    }
  })
  return rows
}

function populationDevices(
  nodes: InventoryNode[],
  registry: Registry,
  resolved: ResolvedNode[],
  cases: ParityCase[],
  reviewed: ParityCase[],
  invalidIds: Set<string>,
  policy: DevicePolicy,
  statuses: string[],
) {
  const entries: Registry["entries"] = {}
  for (const { node, status } of resolved) {
    if (status !== "unaccounted")
      entries[node.nodeId] = { ...registry.entries[node.nodeId], status }
  }
  const effectiveRegistry = { ...registry, entries }
  const devices = deviceCoverage({
    nodes,
    registry: effectiveRegistry,
    cases: [
      ...reviewed,
      ...cases.filter((entry) => isDraftCase(entry) && !invalidIds.has(entry.id)),
    ],
    policy,
    statuses,
  })
  return devices
}

function bulkRows(bulk: BulkQualification[], registry: Registry, resolved: ResolvedNode[]) {
  const bulkFamilies = bulk.map((item) => ({
    ...item,
    namesExport:
      registry.bulkRules.find((rule) => rule.pageId === item.pageId)?.namesExport ?? null,
    overrideSample: Object.keys(
      registry.bulkRules.find((rule) => rule.pageId === item.pageId)?.provenanceOverrides ?? {},
    ),
    nodes: item.nodeIds.filter((id) =>
      resolved.some((row) => row.node.nodeId === id && row.status === "implemented"),
    ).length,
  }))
  return bulkFamilies
}

function populationSummary(
  nodes: InventoryNode[],
  published: Record<string, number>,
  rows: VariantRow[],
  bulkFamilies: ReturnType<typeof bulkRows>,
  devices: ReturnType<typeof populationDevices>,
  statuses: string[],
  evidence: EvidenceReport,
  reviewed: ParityCase[],
  cases: ParityCase[],
  matchingFile: boolean,
  validationErrors: string[],
) {
  return {
    basis:
      "committed non-draft cases with valid offline source evidence; not a fresh render or accessibility certification",
    published: { total: nodes.length, statuses: published },
    cases: {
      population: "implemented nodes without qualified bulk proof",
      declared: rows.length,
      reviewed: rows.filter((row) => row.reviewed).length,
      missing: rows.filter((row) => !row.reviewed).map((row) => row.nodeId),
      rows,
    },
    bulk: {
      nodes: bulkFamilies.reduce((sum, family) => sum + family.nodes, 0),
      proof:
        "manifest and per-glyph provenance qualified; run artwork checks for geometry fidelity",
      families: bulkFamilies,
    },
    devices: { statuses, ...devices },
    variants: {
      population: "variant IDs pinned by verified evidence for ordinary implemented nodes",
      declared: rows.reduce((sum, row) => sum + row.declared.length, 0),
      reviewed: rows.reduce((sum, row) => sum + row.covered.length, 0),
      missing: rows.reduce((sum, row) => sum + row.missing.length, 0),
      rows: rows.filter((row) => row.declared.length),
    },
    evidence: {
      entries: evidence.entries,
      verifiedCases: reviewed.length,
      unverifiedCases: cases.filter((entry) => !reviewed.includes(entry)).map((entry) => entry.id),
      errors: matchingFile
        ? evidence.errors
        : [...evidence.errors, "evidence file key differs from the published inventory"],
      caseErrors: validationErrors,
    },
  }
}
