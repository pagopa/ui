import fs from "node:fs"
import path from "node:path"

import type { Workspace } from "../../adapters/workspace.ts"
import type {
  ApiExceptions,
  Inventory,
  InventoryNode,
  PageSurface,
  Registry,
} from "../../schemas/catalogue.ts"
import {
  ApiExceptionsSchema,
  EvidenceExceptionsSchema,
  longNoteErrors,
  NOTE_LENGTH_BASELINE_PATH,
  NoteLengthBaselineSchema,
} from "../../schemas/catalogue.ts"
import { parseExceptions } from "./source.ts"
import { loadCatalogueState, INVENTORY_PATH } from "../catalogue-state.ts"
import {
  compareSnapshots,
  fileKeyFromSource,
  normalizeLive,
  type SnapshotDelta,
} from "../snapshot.ts"
import { fetchFigmaSnapshot, writeFigmaSnapshot, type FigmaSnapshot } from "../rest.ts"
import { prepareCatalogueRefresh } from "../catalogue-refresh.ts"
import { formatCatalogueDrift } from "./drift.ts"
import type { CatalogueOptions } from "../sync.ts"

const EVIDENCE_EXCEPTIONS_PATH = "src/catalog/figma/evidence-exceptions.json"
const API_EXCEPTIONS_PATH = "src/catalog/figma/api-exceptions.json"

type CatalogueBase = {
  inventory: Inventory
  registry: Registry
  committed: InventoryNode[]
  evidenceExceptions: Record<string, string>
  apiExceptions: ApiExceptions
  errors: string[]
  warnings: string[]
}

type LiveSnapshot = {
  live: InventoryNode[] | null
  version?: string
  lastModified?: string
  restSnapshot: FigmaSnapshot | null
  out: string[]
  err: string[]
  exitCode?: number
}

export type CatalogueLoadContext = {
  inventory: Inventory
  registry: Registry
  committed: InventoryNode[]
  evidenceExceptions: Record<string, string>
  apiExceptions: ApiExceptions
  errors: string[]
  driftErrors: string[]
  warnings: string[]
  out: string[]
  err: string[]
  pendingWrites: Map<string, unknown>
  live: InventoryNode[] | null
  liveVersion?: string
  liveLastModified?: string
  ratchet: { from: number; to: number } | null
  reconciledSurface: PageSurface | null
  delta: SnapshotDelta
  deltaPath?: string
  evidenceBase?: string
  prBodyPath?: string
  hasDrift: boolean
  writeRequested: boolean
}

export type CatalogueLoadResult = {
  context: CatalogueLoadContext | null
  exitCode?: number
  out?: string[]
  err?: string[]
}

function loadCatalogueBase(workspace: Workspace): CatalogueBase | null {
  const state = loadCatalogueState(workspace)
  const errors = [...state.errors]
  if (!state.inventory || !state.registry) return null
  const inventory = state.inventory
  const registry = state.registry
  const committed = inventory.components
  validateCommittedContracts(workspace, inventory, committed, errors)
  const evidenceExceptions =
    parseExceptions(workspace, EVIDENCE_EXCEPTIONS_PATH, EvidenceExceptionsSchema, errors)
      ?.storyEvidence ?? {}
  const apiExceptions = parseExceptions(
    workspace,
    API_EXCEPTIONS_PATH,
    ApiExceptionsSchema,
    errors,
  ) ?? { modulePatterns: {}, exports: {} }
  const noteBaseline = parseExceptions(
    workspace,
    NOTE_LENGTH_BASELINE_PATH,
    NoteLengthBaselineSchema,
    errors,
  )
  if (noteBaseline)
    errors.push(...longNoteErrors(registry, noteBaseline, NOTE_LENGTH_BASELINE_PATH))
  return { inventory, registry, committed, evidenceExceptions, apiExceptions, errors, warnings: [] }
}

function validateCommittedContracts(
  workspace: Workspace,
  inventory: Inventory,
  committed: InventoryNode[],
  errors: string[],
): void {
  const byId = new Map(committed.map((node) => [node.nodeId, node]))
  try {
    const normalized = normalizeLive(inventory, { workspace })
    if (inventory.schemaVersion !== 2) return
    for (const node of normalized) {
      if (byId.get(node.nodeId)?.contractFingerprint !== node.contractFingerprint) {
        errors.push(`${INVENTORY_PATH}: contract fingerprint mismatch for ${node.nodeId}`)
      }
    }
  } catch (error) {
    errors.push(`${INVENTORY_PATH}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function defaultSnapshotInput(root: string, options: CatalogueOptions): string | undefined {
  if (options.input || !(options.write || options.triage || options.prBody)) return options.input
  return [".figma/live-rest.json", ".figma/live.json"].find((candidate) =>
    fs.existsSync(path.join(root, candidate)),
  )
}

async function liveSnapshot(
  workspace: Workspace,
  options: CatalogueOptions,
  inventory: Inventory,
  committed: InventoryNode[],
  errors: string[],
): Promise<LiveSnapshot> {
  const root = workspace.root
  const out: string[] = []
  const err: string[] = []
  let restSnapshot: FigmaSnapshot | null = null
  let live: InventoryNode[] | null = null
  let version: string | undefined
  let lastModified: string | undefined
  const input = defaultSnapshotInput(root, options)
  if (options.rest) {
    restSnapshot = await fetchFigmaSnapshot(
      fileKeyFromSource(workspace) ?? inventory.fileKey,
      committed.filter((node) => node.sources?.includes("mcp")),
      options.token ?? "",
    )
    version = restSnapshot.version
    lastModified = restSnapshot.lastModified
    live = normalizeLive(restSnapshot, { workspace })
  } else if (input) {
    const parsed = readSnapshotInput(path.resolve(root, input), inventory.fileKey, errors)
    version = parsed.version
    lastModified = parsed.lastModified
    live = normalizeLive(parsed.value, { workspace })
  } else if (options.write || options.triage || options.prBody) {
    err.push(
      "--write/--triage/--pr-body need a live source: pass --input <file> (Figma MCP export) or --rest.",
    )
    return { live, version, lastModified, restSnapshot, out, err, exitCode: 2 }
  }
  if (restSnapshot) saveRestSnapshot(workspace, options, restSnapshot, out, err, errors)
  else if (options.save)
    errors.push("--save needs --rest: only a REST read produces the pinned snapshot")
  return { live, version, lastModified, restSnapshot, out, err }
}

function readSnapshotInput(
  file: string,
  inventoryFileKey: string,
  errors: string[],
): {
  value: unknown
  version?: string
  lastModified?: string
} {
  const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
  if (!value || typeof value !== "object") return { value }
  const version =
    "version" in value && typeof value.version === "string" ? value.version : undefined
  const lastModified =
    "lastModified" in value && typeof value.lastModified === "string"
      ? value.lastModified
      : undefined
  if (
    "fileKey" in value &&
    typeof value.fileKey === "string" &&
    value.fileKey !== inventoryFileKey
  ) {
    errors.push("live export file key does not match the committed inventory")
  }
  return { value, version, lastModified }
}

function saveRestSnapshot(
  workspace: Workspace,
  options: CatalogueOptions,
  snapshot: FigmaSnapshot,
  out: string[],
  err: string[],
  errors: string[],
): void {
  const file = options.save ?? ".figma/live-rest.json"
  try {
    writeFigmaSnapshot(path.resolve(workspace.root, file), snapshot)
    const line = `snapshot: ${file} (version ${snapshot.version})`
    if (options.plan) err.push(line)
    else out.push(line)
  } catch (error) {
    errors.push(
      `cannot save the REST snapshot to ${file}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function validateLiveOptions(
  options: CatalogueOptions,
  live: InventoryNode[] | null,
  errors: string[],
): void {
  const evidenceBase = options.evidenceBase?.replace(/\/+$/, "")
  if (evidenceBase && !/^https:\/\//.test(evidenceBase))
    errors.push("--evidence-base must be an https URL")
  if (options.delta && !live)
    errors.push("--delta needs a live source: pass --input <file> or --rest")
}

function snapshotDelta(
  committed: InventoryNode[],
  live: InventoryNode[] | null,
  errors: string[],
): SnapshotDelta {
  const delta = live ? compareSnapshots(committed, live) : compareSnapshots([], [])
  const byId = new Map(committed.map((node) => [node.nodeId, node]))
  for (const node of live ?? []) {
    if (byId.get(node.nodeId)?.designFingerprint && !node.designFingerprint) {
      errors.push(
        `incomplete design evidence for ${node.nodeId}: a full snapshot cannot be downgraded`,
      )
    }
  }
  return delta
}

async function refreshCatalogue(
  workspace: Workspace,
  options: CatalogueOptions,
  base: CatalogueBase,
  live: InventoryNode[] | null,
  version: string | undefined,
  lastModified: string | undefined,
  delta: SnapshotDelta,
  hasDrift: boolean,
  writeRequested: boolean,
  errors: string[],
): Promise<{
  inventory: Inventory
  registry: Registry
  committed: InventoryNode[]
  evidenceExceptions: Record<string, string>
  ratchet: { from: number; to: number } | null
  reconciledSurface: PageSurface | null
  pendingWrites: Map<string, unknown>
}> {
  if (!live || !(writeRequested || (options.prBody && hasDrift))) {
    return {
      inventory: base.inventory,
      registry: base.registry,
      committed: base.committed,
      evidenceExceptions: base.evidenceExceptions,
      ratchet: null,
      reconciledSurface: null,
      pendingWrites: new Map(),
    }
  }
  const noteBaseline = parseExceptions(
    workspace,
    NOTE_LENGTH_BASELINE_PATH,
    NoteLengthBaselineSchema,
    errors,
  )
  const refresh = prepareCatalogueRefresh(workspace, {
    inventory: base.inventory,
    registry: base.registry,
    live,
    delta,
    liveVersion: version,
    liveLastModified: lastModified,
    evidenceExceptions: base.evidenceExceptions,
    noteBaseline,
  })
  return {
    inventory: refresh.inventory,
    registry: refresh.registry,
    committed: refresh.inventory.components,
    evidenceExceptions: refresh.evidenceExceptions,
    ratchet: refresh.ratchet,
    reconciledSurface: refresh.reconciledSurface,
    pendingWrites: refresh.pendingWrites,
  }
}

async function assembleCatalogueContext(
  workspace: Workspace,
  options: CatalogueOptions,
  base: CatalogueBase,
  snapshot: LiveSnapshot,
): Promise<CatalogueLoadResult> {
  validateLiveOptions(options, snapshot.live, base.errors)
  const delta = snapshotDelta(base.committed, snapshot.live, base.errors)
  const prBodyPath = options.prBody
  const driftKeys: Array<keyof SnapshotDelta> = [
    "added",
    "removed",
    "changed",
    "renamed",
    "moved",
    "baseline",
    "affected",
    "changedVariants",
  ]
  const hasDrift = Boolean(snapshot.live) && driftKeys.some((key) => delta[key].length)
  const writeRequested =
    Boolean(options.write || options.triage) && !(prBodyPath && snapshot.live && !hasDrift)
  const refreshed = await refreshCatalogue(
    workspace,
    options,
    base,
    snapshot.live,
    snapshot.version,
    snapshot.lastModified,
    delta,
    hasDrift,
    writeRequested,
    base.errors,
  )
  const drift = formatCatalogueDrift(
    delta,
    snapshot.live,
    writeRequested,
    prBodyPath,
    Boolean(options.plan),
    hasDrift,
  )
  base.errors.push(...drift.errors)
  return {
    context: {
      inventory: refreshed.inventory,
      registry: refreshed.registry,
      committed: refreshed.committed,
      evidenceExceptions: refreshed.evidenceExceptions,
      apiExceptions: base.apiExceptions,
      errors: base.errors,
      driftErrors: drift.errors,
      warnings: base.warnings,
      out: [...snapshot.out, ...drift.lines],
      err: snapshot.err,
      pendingWrites: refreshed.pendingWrites,
      live: snapshot.live,
      liveVersion: snapshot.version,
      liveLastModified: snapshot.lastModified,
      ratchet: refreshed.ratchet,
      reconciledSurface: refreshed.reconciledSurface,
      delta,
      deltaPath: options.delta,
      evidenceBase: options.evidenceBase?.replace(/\/+$/, ""),
      prBodyPath,
      hasDrift,
      writeRequested,
    },
  }
}

export async function loadCatalogue(
  workspace: Workspace,
  options: CatalogueOptions,
): Promise<CatalogueLoadResult> {
  if (options.rest && !options.token) {
    throw new Error("REST catalogue reads require a resolved Figma token")
  }
  const initial = loadCatalogueState(workspace)
  if (!initial.inventory || !initial.registry) {
    return {
      context: null,
      exitCode: 1,
      out: [],
      err: initial.errors.map((error) => `error: ${error}`),
    }
  }
  const base = loadCatalogueBase(workspace)
  if (!base) {
    return {
      context: null,
      exitCode: 1,
      out: [],
      err: initial.errors.map((error) => `error: ${error}`),
    }
  }
  const snapshot = await liveSnapshot(
    workspace,
    options,
    base.inventory,
    base.committed,
    base.errors,
  )
  if (snapshot.exitCode) {
    return { context: null, exitCode: snapshot.exitCode, out: snapshot.out, err: snapshot.err }
  }
  return assembleCatalogueContext(workspace, options, base, snapshot)
}
