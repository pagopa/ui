#!/usr/bin/env node
// Figma catalogue validation and refresh domain.
//
// Static checks (no network, run in CI):
//   node src/cli.ts check catalogue
//     - inventory/registry/file-key consistency and published-node accounting
//     - page-surface census and composition evidence
//     - implemented targets, stories and public API coverage
//     - icon/pictogram public names cover manifest identities node-for-node
//     - warns when the inventory snapshot is older than 30 days
//
// Read-only drift check against a pinned export:
//   node src/cli.ts check catalogue --input .figma/live-rest.json
//
// Print a machine-readable plan, reading REST by default:
//   node src/cli.ts figma plan [--input .figma/live-rest.json]
//
// Refresh the committed inventory from a pinned export:
//   node src/cli.ts update inventory --input .figma/live-rest.json
//
// Refresh and queue new/changed/affected implementations for review:
//   node src/cli.ts figma triage --input .figma/live-rest.json
// Mocked demos retain their status and note and are not queued. Merging the
// drift PR is the review record.
//
// PR mode for the scheduled drift job:
//   node src/cli.ts update inventory --rest --pr-body .figma/pr-body.md
// The PR body is written only when the live snapshot has drift. The Figma side
// is never written to; mappings stay in the repository, keyed by nodeId.
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"
import {
  catalogueIndex,
  compareSnapshots,
  fileKeyFromSource,
  implementationOrder,
  normalizeLive,
  type SnapshotDelta,
} from "./snapshot.ts"
import type { RegistryEntry } from "../schemas/catalogue.ts"
import {
  checkDevicePolicy,
  formatDeviceLine,
  loadDevicePolicy,
  type DeviceStats,
} from "./devices.ts"
import {
  DEVICE_EXCEPTIONS_PATH,
  deviceCoverage,
  isDraftCase,
  loadCaseFile,
  loadDeviceExceptions,
  validateCaseFile,
} from "../parity/cases.ts"
import { fetchFigmaSnapshot, writeFigmaSnapshot } from "./rest.ts"
import { renderCatalogueDelta, renderCataloguePrBody } from "./catalogue-render.ts"
import { prepareCatalogueRefresh } from "./catalogue-refresh.ts"
import { staleStoryTitles } from "./stories.ts"
import {
  checkPageSurface,
  formatSurfaceLine,
  loadPageSurface,
  PAGE_SURFACE_PATH,
  surfacePending,
  surfaceUncensused,
  surfaceUnmirrored,
  type SurfacePending,
  type SurfaceStats,
  type SurfaceUncensused,
  type SurfaceUnmirrored,
} from "./surface.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { createSourceModules } from "../lib/source-modules.ts"
import { readJson } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import { loadCatalogueState, INVENTORY_PATH } from "./catalogue-state.ts"
import {
  ApiExceptionsSchema,
  EvidenceExceptionsSchema,
  longNoteErrors,
  NOTE_LENGTH_BASELINE_PATH,
  NoteLengthBaselineSchema,
  type ApiExceptions,
  type InventoryNode,
  type PageSurface,
  type Inventory,
  type Registry,
} from "../schemas/catalogue.ts"
import type { DevicePolicy } from "../schemas/devices.ts"

const FILE_TS_PATH = "src/catalog/figma/file.ts"
const ICONS_PATH = "src/components/icons/figma-inventory.ts"
const VALID_STATUSES = new Set(["implemented", "mocked", "excluded", "pending"])
const EVIDENCE_EXCEPTIONS_PATH = "src/catalog/figma/evidence-exceptions.json"
const API_EXCEPTIONS_PATH = "src/catalog/figma/api-exceptions.json"

type NodeDeltaKey = "added" | "changed" | "renamed" | "moved" | "removed" | "affected" | "baseline"

export interface CatalogueOptions {
  input?: string
  rest?: boolean
  plan?: boolean
  write?: boolean
  triage?: boolean
  prBody?: string
  save?: string
  delta?: string
  evidenceBase?: string
  token?: string
}

export interface CatalogueReport {
  exitCode: number
  out: string[]
  err: string[]
}

export async function syncCatalogue(
  workspace: Workspace,
  options: CatalogueOptions = {},
): Promise<CatalogueReport> {
  const out: string[] = []
  const outputErrors: string[] = []
  const flags: Record<string, boolean | undefined> = {
    rest: options.rest,
    plan: options.plan,
    write: options.write,
    triage: options.triage,
  }
  const flag = (name: string): boolean => Boolean(flags[name])
  const option = (name: string): string | undefined => {
    const values: Record<string, string | undefined> = {
      input: options.input,
      "pr-body": options.prBody,
      save: options.save,
      delta: options.delta,
      "evidence-base": options.evidenceBase,
    }
    return values[name]
  }
  const root = workspace.root
  const sourceModules = createSourceModules(workspace)
  const rootFile = (identity: string, ...segments: string[]): string =>
    workspace.path(identity, ...segments)
  const absolutePath = (file: string): string => workspace.path(file)
  const artworkPath = (file: string): string => path.join(workspace.artworkRoot, file)
  const resolveStoriesRoot = (): string => workspace.storiesRoot
  const fileIdentity = (file: string): string => workspace.identity(file)

  // Fail fast before any file work: --rest needs the read-only token.
  if (flag("rest") && !options.token)
    throw new Error("REST catalogue reads require a resolved Figma token")

  const errors: string[] = []
  const warnings: string[] = []
  let devicePolicy: DevicePolicy | null = null
  let deviceStats: DeviceStats | null = null

  function fail(message: string): void {
    errors.push(message)
  }

  // The coverage line (RA4), printed under the vocabulary line of RA1: what the
  // `implemented` sets declare against what the reviewed corpus covers.
  function formatCoverageLine(stats: {
    sets: number
    covered: number
    missing: number
    exceptions: number
  }): string {
    return (
      `devices: ${stats.sets} implemented sets · covered ${stats.covered} · ` +
      `missing ${stats.missing} · exceptions ${stats.exceptions}`
    )
  }

  function exportNames(file: string): Set<string> {
    return new Set(sourceModules.runtimeExports(file).keys())
  }

  // A registry module may be missing or moved: the existence check reports it
  // as `module not found`, so the reads that run before that report stay quiet
  // instead of failing on the missing file.
  function moduleExports(file: string): Map<string, string> {
    return fs.existsSync(absolutePath(file)) ? sourceModules.runtimeExports(file) : new Map()
  }

  // Walks the re-export graph from the public entry and records, for every
  // runtime export, the module that declares it. Types are ignored: they do not
  // exist at runtime and never need a Figma mapping.
  function collectPublicExports(): Map<string, string> {
    return sourceModules.runtimeExports("src/pagopa-ui.ts")
  }

  // Declaring runtime identities actually rendered by exported stories. The
  // stories live in the Storybook application; `PAGOPA_UI_STORIES_ROOT` lets a
  // regression fixture keep them inside its own package-shaped tree.
  function storyImports(): Map<string, Set<string>> {
    const byFile = new Map<string, Set<string>>()
    const directory = resolveStoriesRoot()
    for (const file of fs.readdirSync(directory, { recursive: true })) {
      if (typeof file !== "string" || !file.endsWith(".stories.tsx")) continue
      const identity = fileIdentity(path.join(directory, file))
      const names = new Set(
        [...sourceModules.renderedStoryExports(identity).values()].flatMap((names) => [...names]),
      )
      byFile.set(identity, names)
    }
    return byFile
  }

  function readExceptions<T>(file: string, schema: z.ZodType<T>): T | null {
    if (!fs.existsSync(path.join(root, file))) return null
    try {
      return parseSchema(schema, readJson(path.join(root, file)), file)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      fail(`${file}: invalid JSON (${message})`)
      return null
    }
  }

  function matchesModulePattern(file: string, pattern: string): boolean {
    if (pattern.endsWith("*")) return file.startsWith(pattern.slice(0, -1))
    return file === pattern
  }

  // ---------------------------------------------------------------- load state

  const state = loadCatalogueState(workspace)
  for (const error of state.errors) fail(error)
  if (!state.inventory || !state.registry) {
    for (const error of errors) outputErrors.push(`error: ${error}`)
    return { exitCode: 1, out, err: outputErrors }
  }
  let inventory: Inventory = state.inventory
  let registry: Registry = state.registry
  let committed: InventoryNode[] = inventory.components
  const committedById = new Map(committed.map((node) => [node.nodeId, node]))
  const pendingWrites = new Map<string, unknown>()

  try {
    const normalized = normalizeLive(inventory, { workspace })
    if (inventory.schemaVersion === 2) {
      for (const node of normalized) {
        if (committedById.get(node.nodeId)?.contractFingerprint !== node.contractFingerprint) {
          fail(`${INVENTORY_PATH}: contract fingerprint mismatch for ${node.nodeId}`)
        }
      }
    }
  } catch (error) {
    fail(`${INVENTORY_PATH}: ${error instanceof Error ? error.message : String(error)}`)
  }

  let evidenceExceptions: Record<string, string> =
    readExceptions(EVIDENCE_EXCEPTIONS_PATH, EvidenceExceptionsSchema)?.storyEvidence ?? {}
  const apiExceptions: ApiExceptions = readExceptions(API_EXCEPTIONS_PATH, ApiExceptionsSchema) ?? {
    modulePatterns: {},
    exports: {},
  }
  const noteBaseline = readExceptions(NOTE_LENGTH_BASELINE_PATH, NoteLengthBaselineSchema)
  if (noteBaseline) {
    for (const problem of longNoteErrors(registry, noteBaseline, NOTE_LENGTH_BASELINE_PATH)) {
      fail(problem)
    }
  }

  // ------------------------------------------------------------- drift handling

  let live: InventoryNode[] | null = null
  let liveVersion: string | undefined
  let liveLastModified: string | undefined
  // The ratchet move of this refresh, when the queued stubs shortened notes:
  // the pull request body reports it, because the reviewer must not raise it.
  let ratchet: { from: number; to: number } | null = null
  // The census this refresh reconciled, when the queue moved a decision on the
  // page side: the gate below reads it instead of the committed file, so the
  // check sees the state the pull request will carry.
  let reconciledSurface: PageSurface | null = null
  let restSnapshot: Awaited<ReturnType<typeof fetchFigmaSnapshot>> | null = null
  let inputOption = option("input")
  if (!inputOption && (flag("write") || flag("triage") || flag("pr-body"))) {
    // Convenience: the pinned REST snapshot `figma export` writes is the
    // default source; the older MCP dump path still works when it is the only
    // file present.
    for (const candidate of [".figma/live-rest.json", ".figma/live.json"]) {
      if (fs.existsSync(path.join(root, candidate))) {
        inputOption = candidate
        break
      }
    }
  }
  if (flag("rest")) {
    const keyFromFile = fileKeyFromSource(workspace)
    restSnapshot = await fetchFigmaSnapshot(
      keyFromFile ?? inventory.fileKey,
      committed.filter((node) => node.sources?.includes("mcp")),
      options.token ?? "",
    )
    liveVersion = restSnapshot.version
    liveLastModified = restSnapshot.lastModified
    live = normalizeLive(restSnapshot, { workspace })
  } else if (inputOption) {
    const inputPath = path.resolve(root, inputOption)
    const input: unknown = JSON.parse(fs.readFileSync(inputPath, "utf8"))
    if (
      input &&
      typeof input === "object" &&
      "version" in input &&
      typeof input.version === "string"
    ) {
      liveVersion = input.version
    }
    if (
      input &&
      typeof input === "object" &&
      "lastModified" in input &&
      typeof input.lastModified === "string"
    ) {
      liveLastModified = input.lastModified
    }
    if (
      input &&
      typeof input === "object" &&
      "fileKey" in input &&
      typeof input.fileKey === "string" &&
      input.fileKey !== inventory.fileKey
    ) {
      fail("live export file key does not match the committed inventory")
    }
    live = normalizeLive(input, { workspace })
  } else if (flag("write") || flag("triage") || flag("pr-body")) {
    outputErrors.push(
      "--write/--triage/--pr-body need a live source: pass --input <file> (Figma MCP export) or --rest.",
    )
    return { exitCode: 2, out, err: outputErrors }
  }

  // The REST read is the pinned snapshot the evidence refresh reads next: keep
  // it beside the PR body so the drift job does not spend a second API read.
  if (restSnapshot) {
    const saveOption = option("save") ?? ".figma/live-rest.json"
    const savePath = path.resolve(root, saveOption)
    try {
      writeFigmaSnapshot(savePath, restSnapshot)
      // `--plan` owns stdout: the plan stays parseable as JSON.
      if (flag("plan"))
        outputErrors.push(`snapshot: ${saveOption} (version ${restSnapshot.version})`)
      else out.push(`snapshot: ${saveOption} (version ${restSnapshot.version})`)
    } catch (error) {
      fail(
        `cannot save the REST snapshot to ${saveOption}: ` +
          (error instanceof Error ? error.message : String(error)),
      )
    }
  } else if (option("save")) {
    fail("--save needs --rest: only a REST read produces the pinned snapshot")
  }

  const deltaPath = option("delta")
  const rawEvidenceBase = option("evidence-base")
  const evidenceBase = rawEvidenceBase?.replace(/\/+$/, "")
  if (evidenceBase && !/^https:\/\//.test(evidenceBase)) {
    fail("--evidence-base must be an https URL")
  }
  if (deltaPath && !live) {
    fail("--delta needs a live source: pass --input <file> or --rest")
  }

  const delta: SnapshotDelta = live ? compareSnapshots(committed, live) : compareSnapshots([], [])

  for (const node of live ?? []) {
    if (committedById.get(node.nodeId)?.designFingerprint && !node.designFingerprint) {
      fail(`incomplete design evidence for ${node.nodeId}: a full snapshot cannot be downgraded`)
    }
  }

  const prBodyPath = option("pr-body")
  const driftKeys: Array<keyof SnapshotDelta> = [
    "added",
    "removed",
    "changed",
    "renamed",
    "moved",
    "baseline",
    "affected",
  ]
  const hasDrift = Boolean(live) && driftKeys.some((key) => delta[key].length)
  const writeRequested = (flag("write") || flag("triage")) && !(prBodyPath && live && !hasDrift)

  if (live && (writeRequested || (prBodyPath && hasDrift))) {
    const noteBaselineForRefresh = readExceptions(
      NOTE_LENGTH_BASELINE_PATH,
      NoteLengthBaselineSchema,
    )
    const refresh = prepareCatalogueRefresh(workspace, {
      inventory,
      registry,
      live,
      delta,
      liveVersion,
      liveLastModified,
      evidenceExceptions,
      noteBaseline: noteBaselineForRefresh,
    })
    inventory = refresh.inventory
    registry = refresh.registry
    evidenceExceptions = refresh.evidenceExceptions
    ratchet = refresh.ratchet
    reconciledSurface = refresh.reconciledSurface
    for (const [file, value] of refresh.pendingWrites) pendingWrites.set(file, value)
    committed = inventory.components
    committedById.clear()
    for (const node of committed) committedById.set(node.nodeId, node)
  }

  // ------------------------------------------------------------ drift PR body

  if (prBodyPath && !hasDrift && live && !flag("plan")) {
    out.push("drift: none — inventory untouched, no pull request needed")
  }

  if (live && !writeRequested && !prBodyPath) {
    // The variant the change landed in is part of the report: a mobile-only
    // source change must not read as "the node changed" (RA2, gap VG2).
    const changedVariants = new Map(delta.changedVariants.map((change) => [change.nodeId, change]))
    const deviceSuffix = (node: InventoryNode): string => {
      const devices = new Set<string>()
      for (const variant of node.variants ?? []) {
        if (changedVariants.has(variant.nodeId)) {
          devices.add(changedVariants.get(variant.nodeId)?.device ?? "any")
        }
      }
      return devices.size ? ` — devices ${[...devices].join(", ")}` : ""
    }
    const changes: Array<[NodeDeltaKey, string]> = [
      ["added", "NEW"],
      ["removed", "REMOVED"],
      ["changed", "CHANGED"],
      ["renamed", "RENAMED"],
      ["moved", "MOVED"],
      ["baseline", "BASELINE REQUIRED"],
      ["affected", "AFFECTED"],
    ]
    for (const [key, label] of changes) {
      if (delta[key].length)
        fail(
          `${label} nodes (${delta[key].length}):\n` +
            delta[key]
              .map(
                (node) =>
                  `  ${node.nodeId}  ${node.name}${node.change ? ` — ${node.change}` : ""}` +
                  deviceSuffix(node),
              )
              .join("\n"),
        )
    }
    if (!Object.values(delta).some((nodes) => nodes.length) && !flag("plan")) {
      out.push(`drift: none (${live.length} live nodes, contracts and design fingerprints match)`)
    }
  }

  // -------------------------------------------------------------- static checks

  const fileKey = fileKeyFromSource(workspace)
  if (!fileKey) fail(`${FILE_TS_PATH}: FIGMA_FILE_KEY not found`)
  else if (fileKey !== inventory.fileKey)
    fail(`${FILE_TS_PATH}: FIGMA_FILE_KEY != inventory.fileKey`)

  const syncedAt = Date.parse(inventory.syncedAt)
  if (Number.isFinite(syncedAt)) {
    const ageDays = Math.floor((Date.now() - syncedAt) / 86_400_000)
    if (ageDays > 30) {
      warnings.push(
        `inventory snapshot is ${ageDays} days old — reconcile with the live file (pnpm nx run pagopa-ui-cli:figma:triage)`,
      )
    }
  }

  // ------------------------------------------------------------ device policy

  // RA1: the vocabulary is committed data and the inventory is its evidence. An
  // axis value the policy does not map is an error with the value and the axis in
  // the message; a declared axis nobody uses, a duplicated alias and a note that
  // names no alias are errors too. An alias with no current user only warns: a
  // component can be retired while the vocabulary stays.
  try {
    devicePolicy = loadDevicePolicy(rootFile("src/catalog/figma/device-policy.json"))
    const result = checkDevicePolicy(devicePolicy, committed)
    deviceStats = result.stats
    for (const warning of result.warnings) warnings.push(warning)
    for (const error of result.errors) fail(error)
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }

  // ------------------------------------------------------- device coverage (RA4)

  // The corpus is the record of the comparisons; the coverage is what it covers
  // against what the inventory declares. The gate is delta-scoped (RD1): a node
  // whose source changed under it, or that enters the review queue, cannot stay
  // `implemented` without one case per declared device or a reasoned exception.
  // Historical entries are the burn-down work list (`pnpm nx run pagopa-ui-cli:figma:parity:queue
  // --uncovered`), reported as one warning, never as a failure — decision D2 of
  // the hardening handoff stays true for them.
  type CoverageRow = {
    nodeId: string
    missing: string[]
    declared: string[]
    covered: string[]
    drafts: string[]
    status: string
    name: string
    export: string | null
    story: string | null
  }
  type Coverage = {
    rows: CoverageRow[]
    all: CoverageRow[]
    totals: { nodes: number; declared: number; covered: number; missing: number; drafts: number }
  }

  let deviceCoverageStats: {
    sets: number
    covered: number
    missing: number
    drafts: number
    exceptions: number
  } | null = null

  // The case corpus is validated by the catalogue gate, not only by its test
  // project: a malformed case fails the push like a malformed registry entry.
  let caseCorpusStats: {
    cases: number
    errors: number
    warnings: number
    drafts: number
  } | null = null

  // What the censused pages draw, and the identities they draw it with: the
  // published export is not the whole page, so this is the only record of the
  // drawings the library never had and of the compositions nothing measures.
  let surfaceStats: SurfaceStats | null = null
  let surfaceWaiting: SurfacePending[] = []
  let surfaceExcusals: SurfaceUnmirrored[] = []
  let surfaceDeferred: SurfaceUncensused[] = []

  if (devicePolicy) {
    try {
      const cases = loadCaseFile(rootFile("src/catalog/figma/parity-cases.json"))
      const exceptions: Record<string, string> = loadDeviceExceptions(
        rootFile(DEVICE_EXCEPTIONS_PATH),
      )
      const coverage: Coverage = deviceCoverage({
        policy: devicePolicy,
        nodes: committed,
        registry,
        cases,
        statuses: ["implemented"],
      })
      const byNode = new Map<string, CoverageRow>(coverage.all.map((row) => [row.nodeId, row]))
      for (const [nodeId, reason] of Object.entries(exceptions)) {
        if (typeof reason !== "string" || !reason.trim()) {
          fail(`${DEVICE_EXCEPTIONS_PATH}: ${nodeId} requires a reason`)
          continue
        }
        const row = byNode.get(nodeId)
        if (!row) {
          fail(
            `${DEVICE_EXCEPTIONS_PATH}: ${nodeId} is not a registry entry with a device axis — remove the exception`,
          )
        } else if (!row.missing.length) {
          fail(
            `${DEVICE_EXCEPTIONS_PATH}: ${nodeId} covers every declared device — remove the exception`,
          )
        }
      }
      const inDelta = new Set<string>(
        [...delta.added, ...delta.changed, ...delta.affected].map((node) => node.nodeId),
      )
      const uncovered = coverage.rows.filter(
        (row) => row.missing.length && !Object.hasOwn(exceptions, row.nodeId),
      )
      for (const row of uncovered) {
        if (!inDelta.has(row.nodeId)) continue
        fail(
          `device coverage: ${row.nodeId} is in the delta and stays implemented without a case for ` +
            `${row.missing.join(", ")} — save one case per declared device or add a reasoned ` +
            `entry to ${DEVICE_EXCEPTIONS_PATH}`,
        )
      }
      const historical = uncovered.filter((row) => !inDelta.has(row.nodeId))
      if (historical.length) {
        warnings.push(
          `device coverage: ${historical.length} implemented node(s) miss ` +
            `${historical.reduce((count, row) => count + row.missing.length, 0)} device case(s) — ` +
            `the burn-down work list is \`pnpm nx run pagopa-ui-cli:figma:parity:queue --uncovered\``,
        )
      }
      deviceCoverageStats = {
        sets: coverage.rows.length,
        covered: coverage.totals.covered,
        missing: coverage.totals.missing,
        drafts: coverage.totals.drafts,
        exceptions: Object.keys(exceptions).length,
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    }
  }

  // ------------------------------------------------------------ case corpus
  //
  // The reviewed cases are catalogue data too: every case must name a node in
  // the inventory, a device the policy declares and an export the registry maps,
  // with selectors and residue reasons that reproduce. `validateCaseFile` owns
  // the schema; this gate only reports its verdict.
  if (devicePolicy) {
    try {
      const cases = loadCaseFile(rootFile("src/catalog/figma/parity-cases.json"))
      const result = validateCaseFile(cases, {
        registry,
        nodes: committed,
        policy: devicePolicy,
      })
      for (const error of result.errors) fail(`cases: ${error}`)
      for (const warning of result.warnings) warnings.push(`cases: ${warning}`)
      caseCorpusStats = {
        cases: cases.length,
        errors: result.errors.length,
        warnings: result.warnings.length,
        drafts: cases.filter(isDraftCase).length,
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    }
  }

  // ------------------------------------------------------------ page surface
  //
  // `check:catalogue` only ever asked about published nodes, so the page as a whole
  // was never read: a drawing the file owner kept unpublished changed the scope
  // silently the day it was published, and a composition the page draws (a stack
  // at 852, a mobile page at 304, a drawer panel at 417) had no counterpart in
  // the procedure at all. The committed census makes both data, and this gate
  // keeps it and the inventory in step, both ways.
  try {
    const surface = reconciledSurface ?? loadPageSurface(rootFile(PAGE_SURFACE_PATH))
    const cases = devicePolicy ? loadCaseFile(rootFile("src/catalog/figma/parity-cases.json")) : []
    const result = checkPageSurface(surface, {
      nodes: committed,
      registry,
      cases,
      fileKey,
      devices: Object.keys(devicePolicy?.devices ?? {}),
    })
    for (const error of result.errors) fail(error)
    for (const warning of result.warnings) warnings.push(warning)
    surfaceStats = result.stats
    surfaceWaiting = surfacePending(surface)
    surfaceExcusals = surfaceUnmirrored(surface)
    surfaceDeferred = surfaceUncensused(surface, committed)
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }

  const bulkByPage = new Map()
  for (const rule of registry.bulkRules ?? []) {
    if (!/^\d+:\d+$/.test(rule.pageId) || !VALID_STATUSES.has(rule.status ?? ""))
      fail(`bulk rule invalid: ${JSON.stringify(rule)}`)
    else if (bulkByPage.has(rule.pageId)) fail(`duplicate bulk rule for page ${rule.pageId}`)
    else bulkByPage.set(rule.pageId, rule)
    if (rule.status === "excluded" && !rule.reason)
      fail(`bulk rule ${rule.page}: excluded requires reason`)
    if (!rule.namesExport) continue
    if (!rule.assetManifest || !fs.existsSync(artworkPath(rule.assetManifest))) {
      fail(`${rule.page}: namesExport requires an existing node-keyed assetManifest`)
      continue
    }
  }
  const { byNode: bulkByNode, manifests: catalogueManifests } = catalogueIndex(registry, workspace)

  const entries = registry.entries ?? {}
  const storiesByFile = new Map()
  const storyImportsByFile = storyImports()
  const allStoryImports = new Set([...storyImportsByFile.values()].flatMap((names) => [...names]))

  // A source node may map to implementations split across modules:
  // `additionalExports` stays in target.module, `additionalTargets` names the
  // (module, export) pairs that live elsewhere.
  function targetIdentities(
    target: NonNullable<RegistryEntry["target"]>,
  ): Array<{ module: string; export: string }> {
    return [
      { module: target.module, export: target.export },
      ...(target.additionalExports ?? []).map((name) => ({
        module: target.module,
        export: name,
      })),
      ...(target.additionalTargets ?? []),
    ]
  }

  for (const [nodeId, entry] of Object.entries(entries)) {
    if (!VALID_STATUSES.has(entry.status))
      fail(`registry ${nodeId}: invalid status ${entry.status}`)
    const node = committedById.get(nodeId)
    if (!node) fail(`registry ${nodeId}: stale entry (node not in ${INVENTORY_PATH})`)
    if (entry.status === "implemented" || entry.status === "mocked") {
      if (!entry.target?.module) fail(`registry ${nodeId}: ${entry.status} requires target.module`)
      else if (!fs.existsSync(absolutePath(entry.target.module))) {
        fail(`registry ${nodeId}: module not found ${entry.target.module}`)
      } else if (!entry.target.export) {
        fail(`registry ${nodeId}: ${entry.status} requires target.export`)
      } else {
        for (const pair of targetIdentities(entry.target)) {
          if (!pair.module || !pair.export) {
            fail(`registry ${nodeId}: additionalTargets require module and export`)
            continue
          }
          if (!fs.existsSync(absolutePath(pair.module))) {
            fail(`registry ${nodeId}: module not found ${pair.module}`)
          } else if (!exportNames(pair.module).has(pair.export)) {
            fail(`registry ${nodeId}: export "${pair.export}" not found in ${pair.module}`)
          }
        }
      }
      if (entry.status === "implemented") {
        if (!entry.target?.story) fail(`registry ${nodeId}: implemented requires target.story`)
        else if (!fs.existsSync(absolutePath(entry.target.story))) {
          fail(`registry ${nodeId}: story not found ${entry.target.story}`)
        }
        if (entry.target?.storyExports) {
          if (!Array.isArray(entry.target.storyExports) || !entry.target.storyExports.length) {
            fail(`registry ${nodeId}: storyExports must be a nonempty list`)
          } else if (entry.target.story && fs.existsSync(entry.target.story)) {
            const storyFile = entry.target.story
            if (!storiesByFile.has(storyFile))
              storiesByFile.set(storyFile, sourceModules.renderedStoryExports(storyFile))
            const stories = storiesByFile.get(storyFile)
            const identities = targetIdentities(entry.target).map((pair) => ({
              ...pair,
              identity: sourceModules.runtimeExports(pair.module).get(pair.export),
            }))
            const expected = identities.map((pair) => pair.identity)
            const rendered = new Set()
            for (const name of entry.target.storyExports) {
              if (
                !stories.has(name) ||
                !expected.some((identity) => stories.get(name).has(identity))
              ) {
                fail(
                  `registry ${nodeId}: story export "${name}" does not render the mapped component`,
                )
              }
              for (const identity of stories.get(name) ?? []) rendered.add(identity)
            }
            for (const pair of identities) {
              if (!rendered.has(pair.identity)) {
                fail(
                  `registry ${nodeId}: declared story exports do not render "${pair.export}" from ${pair.module}`,
                )
              }
            }
          }
        }
      }
      if (entry.status === "implemented" && entry.target?.export) {
        for (const pair of targetIdentities(entry.target)) {
          const declaredImports = entry.target.story
            ? storyImportsByFile.get(entry.target.story)
            : undefined
          const identity = sourceModules.runtimeExports(pair.module).get(pair.export)
          if (!identity) continue
          const verifiedInDeclared = declaredImports?.has(identity) ?? false
          const verifiedAnywhere = allStoryImports.has(identity)
          if (!verifiedAnywhere) {
            if (!Object.hasOwn(evidenceExceptions, nodeId)) {
              fail(
                `registry ${nodeId}: no story renders "${pair.export}" from ${pair.module} — add coverage or list it in ${EVIDENCE_EXCEPTIONS_PATH}`,
              )
            }
          } else if (!verifiedInDeclared) {
            fail(
              `registry ${nodeId}: linked story ${entry.target.story} does not render "${pair.export}" — update target.story`,
            )
          }
        }
      }
      if (entry.status === "mocked" && !entry.note) fail(`registry ${nodeId}: mocked requires note`)
    }
    if (entry.status === "excluded" && !entry.reason)
      fail(`registry ${nodeId}: excluded requires reason`)
  }

  // ----------------------------------------------------- design panel mapping

  // `parameters.design` is the Storybook Design panel contract and mirrors the
  // registry `storyExports` mapping: an implemented node linked to a single story
  // export must appear in that export's effective design (its own or the meta
  // one). Multi-node exports keep the curated choice, and the `pending` queue is
  // not an approval, so neither is enforced.
  const designExpectations = new Map()
  for (const [nodeId, entry] of Object.entries(entries)) {
    if (entry.status !== "implemented" || !entry.target?.story || !entry.target.storyExports)
      continue
    for (const name of entry.target.storyExports) {
      const key = `${entry.target.story}::${name}`
      if (!designExpectations.has(key)) designExpectations.set(key, new Set())
      designExpectations.get(key).add(nodeId)
    }
  }
  const designByFile = new Map()
  for (const [key, nodeIds] of designExpectations) {
    if (nodeIds.size !== 1) continue
    const [file, name] = key.split("::")
    if (!designByFile.has(file)) designByFile.set(file, sourceModules.storyDesignNodes(file))
    const { meta, stories } = designByFile.get(file)
    const effective = stories.get(name) ?? meta
    const [nodeId] = nodeIds
    if (!effective.has(nodeId)) {
      fail(
        `registry ${nodeId}: story export "${name}" in ${file} must show the node in parameters.design`,
      )
    }
  }

  // --------------------------------------------------- story evidence exceptions

  for (const [nodeId, reason] of Object.entries(evidenceExceptions)) {
    const entry = entries[nodeId]
    if (!entry) {
      fail(`${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} is not a registry entry`)
      continue
    }
    if (entry.status !== "implemented") {
      fail(`${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} is not implemented`)
    }
    if (!reason) fail(`${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} requires a reason`)
    const renderedIdentity = entry.target
      ? moduleExports(entry.target.module).get(entry.target.export)
      : undefined
    if (renderedIdentity && allStoryImports.has(renderedIdentity)) {
      fail(
        `${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} is now rendered by a story — remove the exception`,
      )
    }
  }

  // ------------------------------------------------------ reverse API coverage

  const publicExports = collectPublicExports()
  const targetExports = new Set(
    Object.values(entries)
      .flatMap((entry) =>
        entry.target
          ? targetIdentities(entry.target).map((pair) =>
              moduleExports(pair.module).get(pair.export),
            )
          : [],
      )
      .filter(Boolean),
  )
  const modulePatterns = apiExceptions.modulePatterns ?? {}
  const exportExceptions = apiExceptions.exports ?? {}

  for (const [pattern, reason] of Object.entries(modulePatterns)) {
    if (!reason) fail(`${API_EXCEPTIONS_PATH}: module pattern ${pattern} requires a reason`)
    const matched = [...publicExports.values()].some((identity) =>
      matchesModulePattern(identity.split("#")[0], pattern),
    )
    if (!matched) {
      fail(`${API_EXCEPTIONS_PATH}: module pattern ${pattern} matches no public export — remove it`)
    }
  }

  const unsourced: string[] = []
  for (const [name, identity] of publicExports) {
    const file = identity.split("#")[0]
    if (targetExports.has(identity)) continue
    if (Object.entries(modulePatterns).some(([pattern]) => matchesModulePattern(file, pattern))) {
      continue
    }
    if (Object.hasOwn(exportExceptions, name)) continue
    unsourced.push(`${name} (${file})`)
  }
  if (unsourced.length) {
    fail(
      `public exports without a Figma mapping (${unsourced.length}) — map them or list them in ${API_EXCEPTIONS_PATH}:\n` +
        unsourced.map((line) => `  ${line}`).join("\n"),
    )
  }

  for (const [name, reason] of Object.entries(exportExceptions)) {
    if (!reason) fail(`${API_EXCEPTIONS_PATH}: ${name} requires a reason`)
    if (!publicExports.has(name)) {
      fail(`${API_EXCEPTIONS_PATH}: ${name} is not a public export — remove it`)
    } else if (targetExports.has(publicExports.get(name))) {
      fail(`${API_EXCEPTIONS_PATH}: ${name} now maps to a registry entry — remove the exception`)
    }
  }

  const unaccounted: InventoryNode[] = []
  for (const node of committed) {
    if (entries[node.nodeId]) continue
    if (bulkByNode.has(node.nodeId) || bulkByPage.has(node.pageId)) continue
    unaccounted.push(node)
  }
  if (unaccounted.length) {
    fail(
      `unaccounted nodes (${unaccounted.length}) — add registry entries:\n` +
        unaccounted.map((n) => `  ${n.nodeId}  ${n.name}  (${n.pageName})`).join("\n"),
    )
  }

  // The inventory story links each mapped node to its Storybook page from the
  // committed titles: a renamed story is a dead link, not a silent blank.
  for (const problem of staleStoryTitles(workspace, registry)) fail(problem)

  // Public catalogue names are stable aliases; source labels are metadata.
  function iconListConstant(name: string): string[] {
    const source = fs.readFileSync(artworkPath(ICONS_PATH), "utf8")
    const block = source.match(new RegExp(`${name} = \\[([\\s\\S]*?)\\] as const`))?.[1] ?? ""
    return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1])
  }
  function compareNames(
    actual: string[],
    expected: string[],
    label: string,
    known: string[] = expected,
  ): void {
    const missing = expected.filter((name) => !actual.includes(name))
    const stale = actual.filter((name) => !known.includes(name))
    if (missing.length) fail(`${label}: missing from ${ICONS_PATH}: ${missing.join(", ")}`)
    if (stale.length) fail(`${label}: stale (no mapped identity): ${stale.join(", ")}`)
  }
  for (const rule of registry.bulkRules ?? []) {
    if (!rule.namesExport) continue
    const manifest = catalogueManifests.get(rule.pageId)
    if (!manifest) continue
    const nodes = committed.filter(
      (node) => (bulkByNode.get(node.nodeId) ?? bulkByPage.get(node.pageId)) === rule,
    )
    const names: string[] = []
    for (const [id, rawAsset] of Object.entries(manifest.entries)) {
      const asset = parseSchema(
        z.looseObject({ name: z.string() }),
        rawAsset,
        `${rule.page}: asset ${id}`,
      )
      if (!nodes.some((node) => node.nodeId === id)) {
        fail(`${rule.page}: stale asset identity ${id}`)
      }
      if (!asset.name.trim() || names.includes(asset.name)) {
        fail(`${rule.page}: ${id} requires a unique public catalogue name`)
      }
      names.push(asset.name)
    }
    const implemented = nodes.filter(
      (node) => (entries[node.nodeId]?.status ?? rule.status) === "implemented",
    )
    for (const node of implemented) {
      if (!manifest.entries[node.nodeId]) {
        fail(`${rule.page}: implemented identity ${node.nodeId} has no source asset mapping`)
      }
    }
    compareNames(
      iconListConstant(rule.namesExport),
      implemented
        .map((node) => {
          const raw = manifest.entries[node.nodeId]
          if (!raw) return undefined
          return parseSchema(
            z.looseObject({ name: z.string().optional() }),
            raw,
            `${rule.page}: asset ${node.nodeId}`,
          ).name
        })
        .filter((name): name is string => typeof name === "string"),
      rule.page ?? rule.pageId,
      names,
    )
  }

  // -------------------------------------------------------------------- summary

  function report() {
    for (const warning of warnings) outputErrors.push(`warn: ${warning}`)
    for (const error of errors) outputErrors.push(`error: ${error}`)
    const statuses: Record<string, number> = {}
    for (const node of committed) {
      const entry = entries[node.nodeId]
      const rule = bulkByNode.get(node.nodeId) ?? bulkByPage.get(node.pageId)
      const status = entry?.status ?? rule?.status ?? "unaccounted"
      statuses[status] = (statuses[status] ?? 0) + 1
    }
    out.push(
      `inventory: ${committed.length} nodes | ` +
        Object.entries(statuses)
          .map(([status, count]) => `${status} ${count}`)
          .join(" · "),
    )
    out.push(
      `exceptions: story evidence ${Object.keys(evidenceExceptions).length} · ` +
        `unmapped exports ${Object.keys(apiExceptions.exports ?? {}).length} · ` +
        `device ${deviceCoverageStats?.exceptions ?? 0}`,
    )
    if (deviceStats) out.push(formatDeviceLine(deviceStats))
    if (deviceCoverageStats) out.push(formatCoverageLine(deviceCoverageStats))
    if (surfaceStats) out.push(formatSurfaceLine(surfaceStats))
    if (caseCorpusStats) {
      out.push(
        `cases: ${caseCorpusStats.cases} case(s) · errors ${caseCorpusStats.errors} · ` +
          `warnings ${caseCorpusStats.warnings} · drafts ${caseCorpusStats.drafts}`,
      )
    }
  }

  if (flag("plan")) {
    const snapshot = live ?? committed
    const selected = new Set([
      ...Object.entries(entries)
        .filter(([, entry]) => entry.status === "pending")
        .map(([id]) => id),
      ...[...delta.added, ...delta.changed, ...delta.affected].map((node) => node.nodeId),
    ])
    // Mocked demos are not implementations to review, even when a dependency
    // change lists them among the affected nodes.
    for (const id of [...selected]) {
      if (entries[id]?.status === "mocked") selected.delete(id)
    }
    // The queue that was already waiting is not today's delta: read it here so
    // a plan reader never mistakes a standing blocker for a new change.
    const designRequest = /\bdocs\/design-requests\/[\w./-]+\.md\b/g
    const pending = Object.entries(entries)
      .filter(([, entry]) => entry.status === "pending")
      .map(([nodeId, entry]) => ({
        nodeId,
        name: snapshot.find((node) => node.nodeId === nodeId)?.name ?? null,
        target: entry.target?.export ?? null,
        designRequests: [...new Set(entry.note?.match(designRequest) ?? [])],
      }))
      .sort((left, right) => left.nodeId.localeCompare(right.nodeId, undefined, { numeric: true }))
    out.push(
      JSON.stringify(
        {
          ...Object.fromEntries(
            Object.entries(delta).map(([key, nodes]) => [
              key,
              // The variant delta is the device-shaped part of the plan: it keeps
              // the device and the class, so a plan reader never sees a bare id.
              key === "changedVariants" ? nodes : nodes.map((node) => node.nodeId),
            ]),
          ),
          snapshotVersion: liveVersion ?? null,
          implementationOrder: implementationOrder(snapshot, selected),
          pending,
          // The surface is not a delta either. `waiting` is the published
          // identity still owed an implementation, and `unmirrored` is a
          // composition the source draws that no case measures: the two things a
          // plan reader could not learn from the inventory.
          surfaceWaiting: surfaceWaiting,
          surfaceUnmirrored: surfaceExcusals,
          surfaceUncensused: surfaceDeferred,
          unverifiedDesign: snapshot
            .filter((node) => !node.designFingerprint)
            .map((node) => node.nodeId),
          devices: deviceStats,
          deviceCoverage: deviceCoverageStats,
        },
        null,
        2,
      ),
    )
    for (const error of errors) outputErrors.push(`error: ${error}`)
  } else {
    report()
  }
  if (!errors.length) {
    for (const [file, data] of pendingWrites) {
      const temporary = path.join(root, `${file}.${Date.now()}.tmp`)
      try {
        fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n", { flag: "wx" })
        fs.renameSync(temporary, path.join(root, file))
      } finally {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
      }
      if (flag("plan")) outputErrors.push(`validated and written: ${file}`)
      else out.push(`validated and written: ${file}`)
    }
    if (prBodyPath && hasDrift) {
      fs.mkdirSync(path.dirname(path.resolve(root, prBodyPath)), { recursive: true })
      fs.writeFileSync(
        path.resolve(root, prBodyPath),
        `${renderCataloguePrBody({
          workspace,
          inventory,
          registry,
          delta,
          live,
          committed,
          liveVersion,
          ratchet,
          evidenceBase,
          devicePolicy,
          deviceStats,
          deviceCoverage: deviceCoverageStats,
          bulkByNode,
          bulkByPage,
          entries,
        })}\n`,
      )
      out.push(`pr body: ${prBodyPath}`)
    }
    if (deltaPath && live) {
      const target = path.resolve(root, deltaPath)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(
        target,
        `${JSON.stringify(
          renderCatalogueDelta({
            workspace,
            inventory,
            registry,
            delta,
            live,
            committed,
            liveVersion,
            ratchet,
            evidenceBase,
            devicePolicy,
            deviceStats,
            deviceCoverage: deviceCoverageStats,
            bulkByNode,
            bulkByPage,
            entries,
          }),
          null,
          2,
        )}\n`,
      )
      out.push(`delta: ${deltaPath}`)
    }
  }
  const driftOnly = hasDrift && !writeRequested && !prBodyPath
  const exitCode = errors.length ? (driftOnly ? 3 : 1) : 0
  return { exitCode, out, err: outputErrors }
}
