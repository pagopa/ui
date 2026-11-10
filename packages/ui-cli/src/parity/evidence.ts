import type { ParityOutput } from "./output.ts"
// Figma parity — the offline evidence bundle.
//
// The reviewed cases are reproducible evidence only if a clone can read the
// source side without the person's token and without the 160 MB snapshot. The
// bundle has three generated parts:
//
//   docs/figma-parity/source.json.br   the complete case document map (Brotli)
//   docs/figma-parity/references/*.png the pinned Figma render, one per case
//   docs/figma-parity/manifest.json    the version, the hashes and the variant
//
// The bundle is review evidence, never a pixel gate: the verdict stays the 2 px
// property comparison. `--write` needs FIGMA_TOKEN and a pinned snapshot;
// `--check` is hermetic and proves the bundle still matches the corpus.
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import type { Workspace } from "../adapters/workspace.ts"
import {
  brotliJson,
  decodeJsonBytes,
  parseJsonBytes,
  readJson,
  writeBytes,
  writeJson,
  formatJson,
} from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import type { InventoryNode } from "../schemas/catalogue.ts"
import type { ParityCase } from "../schemas/parity.ts"
import { committedFile, readCases, readInventory, readRegistry } from "../records/committed.ts"
import { caseVariant, validateCaseFile, variantOfCase } from "./cases.ts"

export const EVIDENCE_DIR = "docs/figma-parity"
export const SOURCE_PATH = `${EVIDENCE_DIR}/source.json.br`
export const MANIFEST_PATH = `${EVIDENCE_DIR}/manifest.json`
export const REFERENCES_DIR = `${EVIDENCE_DIR}/references`
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024

const SNAPSHOT_PATH = ".figma/live-rest.json"

const SliceDocumentSchema = z.looseObject({
  id: z.string().optional(),
  children: z.array(z.unknown()).optional(),
})

const SliceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  kind: z.literal("parity-source"),
  fileKey: z.string().min(1),
  version: z.string().min(1),
  nodes: z.record(z.string(), z.looseObject({ document: SliceDocumentSchema })),
})

const ManifestCaseSchema = z.strictObject({
  png: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/, "expected a sha256 digest"),
  nodeId: z.string().regex(/^\d+:\d+$/, "expected a Figma node id"),
  variant: z.string().regex(/^\d+:\d+$/, "expected a Figma node id"),
  designFingerprint: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

const ManifestSchema = z.strictObject({
  schemaVersion: z.literal(2),
  fileKey: z.string().min(1),
  version: z.string().min(1),
  capturedAt: z.string().min(1),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/, "expected a sha256 digest"),
  cases: z.record(z.string(), ManifestCaseSchema),
})

const SnapshotSchema = z.looseObject({
  fileKey: z.string().min(1),
  version: z.string().min(1),
  nodes: z.record(z.string(), z.looseObject({ document: SliceDocumentSchema })),
})

export type EvidenceSlice = z.infer<typeof SliceSchema>
export type EvidenceManifest = z.infer<typeof ManifestSchema>
export type EvidenceManifestCase = z.infer<typeof ManifestCaseSchema>

type Snapshot = z.infer<typeof SnapshotSchema>

// ------------------------------------------------------------------ the files

// The bundle lives at the workspace root (`docs/figma-parity`), not inside the
// audited package; a fixture tree without a workspace manifest resolves to its
// own root, so the tests keep the same shape.
export function evidencePaths(root: string): {
  dir: string
  source: string
  manifest: string
  references: string
} {
  return {
    dir: path.join(root, EVIDENCE_DIR),
    source: path.join(root, SOURCE_PATH),
    manifest: path.join(root, MANIFEST_PATH),
    references: path.join(root, REFERENCES_DIR),
  }
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex")
}

// PNG width and height live in the IHDR chunk, right after the signature and the
// chunk length and type: no image library is needed to record the pinned size.
function pngDimensions(bytes: Buffer): { width: number; height: number } | undefined {
  if (bytes.length < 24) return undefined
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return undefined
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function evidenceBudgetExceeded(
  bytes: number,
  cap: number,
  byCase: Array<{ caseId: string; bytes: number }>,
): string {
  const largest = [...byCase]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5)
    .map((item) => `${item.caseId} ${formatBytes(item.bytes)}`)
    .join(" · ")
  return (
    `the evidence bundle is ${formatBytes(bytes)} (cap ${formatBytes(cap)}) — ` +
    `largest cases: ${largest}; retain all required cases and reduce the bundle: the cap is not raised`
  )
}

function isMissingFile(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const candidate: { code?: unknown } = error
  return candidate.code === "ENOENT"
}

// Read without a check-then-use pair: a missing file is an expected state, any
// other error is not. This is the same contract `existsSync` would express, but
// it cannot race with a concurrent writer (CodeQL js/file-system-race).
function loadIfExists<T>(load: () => T): { value?: T; error?: unknown; missing: boolean } {
  try {
    return { value: load(), missing: false }
  } catch (error) {
    if (isMissingFile(error)) return { missing: true }
    return { error, missing: false }
  }
}

// Every node id a slice document tree declares: the published node, its variants
// and the nested instances.
function collectIds(value: unknown, ids = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return ids
  const node: { id?: unknown; children?: unknown } = value
  if (typeof node.id === "string") ids.add(node.id)
  if (Array.isArray(node.children)) {
    for (const child of node.children) collectIds(child, ids)
  }
  return ids
}

function sliceIds(slice: EvidenceSlice): Set<string> {
  const ids = new Set<string>()
  for (const record of Object.values(slice.nodes)) {
    collectIds(record.document, ids)
  }
  return ids
}

// The node whose PNG is pinned: the variant `check` captures when the case is
// unambiguous, otherwise the same narrowing `check` applies; a component without
// variants pins itself. The fingerprint is the one the skip rule compares.
function pinnedVariant(
  node: InventoryNode | undefined,
  entry: Pick<ParityCase, "variant" | "state" | "device">,
): { nodeId: string; designFingerprint: string } | undefined {
  const variant = variantOfCase(node, entry) ?? caseVariant(node, entry)
  if (variant) {
    return { nodeId: variant.nodeId, designFingerprint: variant.designFingerprint }
  }
  if (node && !(node.variants ?? []).length) {
    return {
      nodeId: entry.variant ?? node.nodeId,
      designFingerprint: node.designFingerprint ?? node.contractFingerprint ?? "unfingerprinted",
    }
  }
  return undefined
}

export function loadSlice(file: string): EvidenceSlice {
  return parseSchema(SliceSchema, readJson(file), file)
}

export function loadManifest(file: string): EvidenceManifest {
  return parseSchema(ManifestSchema, readJson(file), file)
}

// ------------------------------------------------------------------- writing

type BuildResult = {
  slice: EvidenceSlice
  source: Buffer
  manifest: EvidenceManifest
  pngs: Map<string, Buffer>
  reused: string[]
  refreshed: string[]
}

// Build the slice from the pinned snapshot and the corpus: one document per node
// a case names, its full subtree. The manifest and the PNGs are written only
// when the whole bundle is inside the cap.
export async function buildEvidence({
  snapshot,
  cases,
  nodes,
  capturedAt,
  images: fetchImages,
  existing,
  existingPngs = new Map(),
}: {
  snapshot: Snapshot
  cases: ParityCase[]
  nodes: InventoryNode[]
  capturedAt: string
  images: (fileKey: string, version: string, ids: string[]) => Promise<Map<string, Buffer>>
  existing?: EvidenceManifest
  existingPngs?: Map<string, Buffer>
}): Promise<{ result: BuildResult; errors: string[] }> {
  const errors: string[] = []
  const byNode = new Map(nodes.map((node) => [node.nodeId, node]))
  const { slice, source, inSlice } = buildSlice(snapshot, cases, errors)
  const entries: EvidenceManifest["cases"] = {}
  const pngs = new Map<string, Buffer>()
  const reused: string[] = []
  const refreshed: string[] = []
  const pending: ParityCase[] = []
  selectEvidenceCases(
    cases,
    byNode,
    inSlice,
    existing,
    existingPngs,
    entries,
    reused,
    pending,
    errors,
  )
  await refreshEvidenceCases(
    snapshot,
    pending,
    byNode,
    fetchImages,
    entries,
    pngs,
    refreshed,
    errors,
  )

  const manifest: EvidenceManifest = {
    schemaVersion: 2,
    fileKey: slice.fileKey,
    version: slice.version,
    capturedAt,
    sourceSha256: sha256(Buffer.from(`${JSON.stringify(slice)}\n`)),
    cases: entries,
  }
  return { result: { slice, source, manifest, pngs, reused, refreshed }, errors }
}

export function evidenceBytes({
  slice,
  source,
  manifest,
  pngs,
}: {
  slice?: EvidenceSlice
  source?: Buffer
  manifest?: EvidenceManifest
  pngs: Map<string, Buffer>
}): { total: number; byCase: Array<{ caseId: string; bytes: number }> } {
  let total = 0
  // The cap is on the bytes a clone receives, so the slice counts compressed.
  if (source) total += source.length
  else if (slice) total += brotliJson(slice).length
  if (manifest) total += Buffer.byteLength(formatJson(manifest))
  const byCase = [...pngs.entries()].map(([caseId, bytes]) => {
    total += bytes.length
    return { caseId, bytes: bytes.length }
  })
  byCase.sort((a, b) => b.bytes - a.bytes)
  return { total, byCase }
}

function readExistingPngs(
  root: string,
  manifest: EvidenceManifest | undefined,
  cases: ParityCase[],
): Map<string, Buffer> {
  const pngs = new Map<string, Buffer>()
  if (!manifest) return pngs
  const wanted = new Set(cases.map((entry) => entry.id))
  for (const [caseId, entry] of Object.entries(manifest.cases)) {
    if (!wanted.has(caseId)) continue
    const file = path.join(root, EVIDENCE_DIR, entry.png)
    try {
      pngs.set(caseId, fs.readFileSync(file))
    } catch (error) {
      if (!isMissingFile(error)) throw error
    }
  }
  return pngs
}

function readSnapshot(file: string): Snapshot {
  return parseSchema(SnapshotSchema, readJson(file), file)
}

// `update evidence`: refresh the slice, the changed PNGs and the
// manifest from the pinned snapshot, then remove the entries whose case left the
// corpus. The whole write is refused when the bundle exceeds the cap.
export async function writeEvidence(
  workspace: Workspace,
  {
    input,
    capturedAt,
    images,
  }: {
    input?: string
    capturedAt: string
    images: (key: string, version: string, ids: string[]) => Promise<Map<string, Buffer>>
  },
): Promise<ParityOutput> {
  const out: string[] = []
  const err: string[] = []
  const prepared = await prepareEvidence(workspace, { input, capturedAt, images })
  if ("code" in prepared) return prepared
  const { paths, cases, existing, result } = prepared
  const budget = checkWriteBudget(result, paths)
  if (budget.error) return { code: 1, out, err: [`error: ${budget.error}`] }
  const totalBytes = budget.totalBytes
  persistEvidence(paths, cases, result, existing)

  out.push(
    `evidence: ${cases.length} case(s) · written ${result.refreshed.length} · ` +
      `skipped ${result.reused.length} · ${formatBytes(totalBytes)} (cap ${formatBytes(MAX_EVIDENCE_BYTES)})`,
  )
  out.push(`source: ${SOURCE_PATH} · version ${result.slice.version}`)
  out.push(`manifest: ${MANIFEST_PATH} · references ${REFERENCES_DIR}/`)
  return { code: 0, out, err }
}

// ------------------------------------------------------------------- checking

export type EvidenceReport = {
  fileKey?: string
  errors: string[]
  warnings: string[]
  cases: number
  entries: number
  bytes: number
  verifiedCases: string[]
  verifiedVariants: Record<string, string>
}

// The two committed files, loaded once and with the guidance a missing bundle
// deserves. Both `check evidence` and a parity run on the slice use it.
function loadEvidenceForCheck(root: string): {
  slice?: EvidenceSlice
  manifest?: EvidenceManifest
  errors: string[]
  bytes: number
} {
  const paths = evidencePaths(root)
  const errors: string[] = []
  let slice: EvidenceSlice | undefined
  let manifest: EvidenceManifest | undefined
  let bytes = 0
  let sourceHash: string | undefined
  const sourceRead = loadIfExists(() => {
    const source = fs.readFileSync(paths.source)
    const contents = decodeJsonBytes(source, paths.source)
    return {
      slice: parseSchema(SliceSchema, JSON.parse(contents.toString("utf8")), paths.source),
      hash: sha256(contents),
      bytes: source.length,
    }
  })
  if (sourceRead.missing) {
    errors.push(`${SOURCE_PATH} is missing — run \`update evidence\` with FIGMA_TOKEN`)
  } else if (sourceRead.error) {
    errors.push(
      sourceRead.error instanceof Error ? sourceRead.error.message : String(sourceRead.error),
    )
  } else {
    slice = sourceRead.value?.slice
    sourceHash = sourceRead.value?.hash
    bytes += sourceRead.value?.bytes ?? 0
  }
  const manifestRead = loadIfExists(() => {
    const contents = fs.readFileSync(paths.manifest)
    return {
      manifest: parseSchema(
        ManifestSchema,
        parseJsonBytes(contents, paths.manifest),
        paths.manifest,
      ),
      bytes: contents.length,
    }
  })
  if (manifestRead.missing) {
    errors.push(`${MANIFEST_PATH} is missing — run \`update evidence\` with FIGMA_TOKEN`)
  } else if (manifestRead.error) {
    errors.push(
      manifestRead.error instanceof Error ? manifestRead.error.message : String(manifestRead.error),
    )
  } else {
    manifest = manifestRead.value?.manifest
    bytes += manifestRead.value?.bytes ?? 0
  }
  if (manifest && sourceHash && manifest.sourceSha256 !== sourceHash) {
    errors.push(`${SOURCE_PATH} does not match the manifest sourceSha256`)
  }
  return { slice, manifest, errors, bytes }
}

// `check evidence`: the corpus, the slice and the manifest must agree,
// byte for byte, with no token and no network.
export function checkEvidence({
  root,
  dataRoot,
  cases,
  nodes,
  maxBytes = MAX_EVIDENCE_BYTES,
}: EvidenceCheckOptions): EvidenceReport {
  const paths = evidencePaths(root)
  const corpus = cases ?? readCases(committedFile("cases", dataRoot)) ?? []
  const inventory = nodes ?? readInventory(committedFile("inventory", dataRoot)).components
  const bundle = loadEvidenceForCheck(root)
  const errors = [...bundle.errors]
  const warnings: string[] = []
  const { slice, manifest } = bundle
  if (!slice || !manifest) {
    return {
      errors,
      warnings,
      cases: corpus.length,
      entries: 0,
      bytes: 0,
      verifiedCases: [],
      verifiedVariants: {},
    }
  }
  if (manifest.version !== slice.version) {
    errors.push(
      `${MANIFEST_PATH} pins version ${manifest.version}, the slice pins ${slice.version} — ` +
        `refresh both together`,
    )
  }
  if (manifest.fileKey !== slice.fileKey) {
    errors.push(`${MANIFEST_PATH} names file ${manifest.fileKey}, the slice names ${slice.fileKey}`)
  }
  const bundleValid = errors.length === 0
  const verifiedCases: string[] = []
  const verifiedVariants: Record<string, string> = {}
  const inSlice = sliceIds(slice)
  const byNode = new Map(inventory.map((node) => [node.nodeId, node]))
  const corpusIds = new Set(corpus.map((entry) => entry.id))
  let bytes = bundle.bytes
  const pngs = new Set<string>()
  const byCase: Array<{ caseId: string; bytes: number }> = []
  for (const entry of corpus) {
    const checked = checkReference(
      entry,
      byNode.get(entry.nodeId),
      inSlice,
      manifest,
      root,
      bundleValid,
      errors,
      warnings,
    )
    bytes += checked.bytes
    if (checked.png) pngs.add(checked.png)
    if (checked.bytes) byCase.push({ caseId: entry.id, bytes: checked.bytes })
    if (checked.variant) {
      verifiedCases.push(entry.id)
      verifiedVariants[entry.id] = checked.variant
    }
  }
  checkOrphans(manifest, corpusIds, paths.references, pngs, errors)
  if (bytes > maxBytes) {
    errors.push(evidenceBudgetExceeded(bytes, maxBytes, byCase))
  }
  return {
    errors,
    warnings,
    cases: corpus.length,
    entries: Object.keys(manifest.cases).length,
    bytes,
    fileKey: manifest.fileKey,
    verifiedCases,
    verifiedVariants,
  }
}

// A parity run that reads the committed slice must prove the slice still
// describes the case it is about to capture: the manifest entry exists, points
// at the variant the inventory resolves, and carries the same fingerprint. A
// stale bundle is missing evidence, never a pass.
export function checkCaseEvidence({
  entry,
  node,
  root,
  sourceSha256,
}: {
  entry: Pick<ParityCase, "nodeId" | "variant" | "state" | "device"> & { id?: string }
  node?: InventoryNode
  root: string
  sourceSha256?: string
}): string[] {
  const where = entry.id ?? entry.nodeId
  const bundle = loadEvidenceForCheck(root)
  const errors = [...bundle.errors]
  const { slice, manifest } = bundle
  if (!slice || !manifest) return errors
  if (sourceSha256 !== undefined && sourceSha256 !== manifest.sourceSha256) {
    errors.push(`${where}: the supplied parity source does not match the manifest sourceSha256`)
  }
  if (manifest.version !== slice.version) {
    errors.push(
      `${where}: the manifest pins version ${manifest.version}, the slice pins ${slice.version} — refresh the bundle`,
    )
  }
  if (manifest.fileKey !== slice.fileKey) {
    errors.push(`${where}: the manifest and the slice name different files`)
  }
  const target = pinnedVariant(node, entry)
  if (!target) {
    errors.push(`${where}: no variant resolves for this case against the committed inventory`)
  }
  const record = entry.id
    ? manifest.cases[entry.id]
    : target
      ? Object.values(manifest.cases).find(
          (item) => item.nodeId === entry.nodeId && item.variant === target.nodeId,
        )
      : undefined
  if (!record) {
    errors.push(
      `${where}: no manifest entry — the reviewed case is missing from the bundle; ` +
        `run \`update evidence\` with FIGMA_TOKEN`,
    )
  } else {
    if (record.nodeId !== entry.nodeId) {
      errors.push(
        `${where}: the manifest entry names node ${record.nodeId}, the case ${entry.nodeId}`,
      )
    }
    if (target && record.variant !== target.nodeId) {
      errors.push(
        `${where}: the manifest entry pins variant ${record.variant}, the inventory resolves ${target.nodeId}`,
      )
    }
    if (target && record.designFingerprint !== target.designFingerprint) {
      errors.push(
        `${where}: the manifest designFingerprint is stale against the committed inventory — ` +
          `refresh the evidence bundle with \`update evidence\``,
      )
    }
  }
  const ids = sliceIds(slice)
  if (!ids.has(entry.nodeId)) {
    errors.push(`${where}: the slice has no document for ${entry.nodeId}`)
  }
  if (target && !ids.has(target.nodeId)) {
    errors.push(`${where}: the slice has no variant ${target.nodeId}`)
  }
  return errors
}

export function formatEvidence(report: EvidenceReport): { out: string[]; err: string[] } {
  return {
    err: [
      ...report.warnings.map((warning) => `warn: ${warning}`),
      ...report.errors.map((error) => `error: ${error}`),
    ],
    out: [
      `evidence: ${report.cases} case(s) · ${report.entries} manifest entr(ies) · ${formatBytes(report.bytes)} (cap ${formatBytes(MAX_EVIDENCE_BYTES)})`,
      report.errors.length ? "evidence: failed" : "evidence: ok",
    ],
  }
}

function buildSlice(snapshot: Snapshot, cases: ParityCase[], errors: string[]) {
  const wanted = new Map<string, ParityCase[]>()
  for (const entry of cases) {
    const list = wanted.get(entry.nodeId) ?? []
    list.push(entry)
    wanted.set(entry.nodeId, list)
  }
  const sliceNodes: EvidenceSlice["nodes"] = {}
  for (const nodeId of wanted.keys()) {
    const document = snapshot.nodes[nodeId]?.document
    if (!document) {
      errors.push(`${nodeId}: the pinned snapshot has no document for this case node`)
      continue
    }
    sliceNodes[nodeId] = { document }
  }
  const slice: EvidenceSlice = {
    schemaVersion: 1,
    kind: "parity-source",
    fileKey: snapshot.fileKey,
    version: snapshot.version,
    nodes: sliceNodes,
  }
  const source = brotliJson(slice)
  const inSlice = sliceIds(slice)

  return { slice, source, inSlice }
}

function selectEvidenceCases(
  cases: ParityCase[],
  byNode: Map<string, InventoryNode>,
  inSlice: Set<string>,
  existing: EvidenceManifest | undefined,
  existingPngs: Map<string, Buffer>,
  entries: EvidenceManifest["cases"],
  reused: string[],
  pending: ParityCase[],
  errors: string[],
) {
  for (const entry of cases) {
    const node = byNode.get(entry.nodeId)
    const variant = pinnedVariant(node, entry)
    if (!variant) {
      errors.push(`${entry.id}: no variant resolves for this case; pin one before writing evidence`)
      continue
    }
    if (!inSlice.has(entry.nodeId)) {
      errors.push(`${entry.id}: the slice has no document for ${entry.nodeId}`)
    }
    if (!inSlice.has(variant.nodeId)) {
      errors.push(`${entry.id}: the slice has no variant ${variant.nodeId}`)
    }
    const relative = `references/${entry.id}.png`
    const previous = existing?.cases?.[entry.id]
    const previousBytes = existingPngs.get(entry.id)
    if (
      previous &&
      previous.nodeId === entry.nodeId &&
      previous.variant === variant.nodeId &&
      previous.designFingerprint === variant.designFingerprint &&
      previous.png === relative &&
      previousBytes &&
      sha256(previousBytes) === previous.sha256
    ) {
      entries[entry.id] = previous
      reused.push(entry.id)
      continue
    }
    pending.push(entry)
  }
}

async function refreshEvidenceCases(
  snapshot: Snapshot,
  pending: ParityCase[],
  byNode: Map<string, InventoryNode>,
  fetchImages: (key: string, version: string, ids: string[]) => Promise<Map<string, Buffer>>,
  entries: EvidenceManifest["cases"],
  pngs: Map<string, Buffer>,
  refreshed: string[],
  errors: string[],
) {
  // One API call per distinct variant node: the pinned PNG, at scale 1.
  if (pending.length) {
    const variantIds = [
      ...new Set(
        pending
          .map((entry) => pinnedVariant(byNode.get(entry.nodeId), entry)?.nodeId)
          .filter((id): id is string => Boolean(id)),
      ),
    ]
    const images = await fetchImages(snapshot.fileKey, snapshot.version, variantIds)
    for (const entry of pending) {
      const variant = pinnedVariant(byNode.get(entry.nodeId), entry)
      if (!variant) continue
      const bytes = images.get(variant.nodeId)
      const size = bytes ? pngDimensions(bytes) : undefined
      if (!bytes || !size) {
        errors.push(`${entry.id}: Figma returned no pinned PNG for ${variant.nodeId}`)
        continue
      }
      pngs.set(entry.id, bytes)
      entries[entry.id] = {
        png: `references/${entry.id}.png`,
        sha256: sha256(bytes),
        nodeId: entry.nodeId,
        variant: variant.nodeId,
        designFingerprint: variant.designFingerprint,
        width: size.width,
        height: size.height,
      }
      refreshed.push(entry.id)
    }
  }
}

type EvidenceWriteOptions = {
  input?: string
  capturedAt: string
  images: (key: string, version: string, ids: string[]) => Promise<Map<string, Buffer>>
}
async function prepareEvidence(
  workspace: Workspace,
  { input, capturedAt, images }: EvidenceWriteOptions,
): Promise<
  | ParityOutput
  | {
      paths: ReturnType<typeof evidencePaths>
      cases: ParityCase[]
      existing: EvidenceManifest | undefined
      result: BuildResult
    }
> {
  const root = workspace.workspaceRoot
  const dataRoot = workspace.root
  const out: string[] = []
  const err: string[] = []
  const snapshotFile = input ? path.resolve(dataRoot, input) : path.join(dataRoot, SNAPSHOT_PATH)
  const snapshotRead = loadIfExists(() => readSnapshot(snapshotFile))
  if (snapshotRead.missing) {
    err.push(
      `error: ${snapshotFile} is missing: run the live export first ` +
        `(update evidence --input .figma/live-rest.json).`,
    )
    return { code: 2, out, err }
  }
  if (snapshotRead.error || !snapshotRead.value) {
    err.push(
      `error: ${snapshotRead.error instanceof Error ? snapshotRead.error.message : String(snapshotRead.error)}`,
    )
    return { code: 1, out, err }
  }
  const paths = evidencePaths(root)
  const cases = readCases(committedFile("cases", dataRoot)) ?? []
  const nodes = readInventory(committedFile("inventory", dataRoot)).components
  const registry = readRegistry(committedFile("registry", dataRoot))
  // The corpus validator owns the schema: writing evidence for a broken corpus
  // would pin the wrong thing.
  const validation = validateCaseFile(workspace, cases, { registry, nodes })
  if (validation.errors.length) {
    for (const error of validation.errors) err.push(`error: ${error}`)
    return { code: 1, out, err }
  }
  const snapshot = snapshotRead.value
  const existingRead = loadIfExists(() => loadManifest(paths.manifest))
  if (existingRead.error) {
    err.push(
      `error: ${existingRead.error instanceof Error ? existingRead.error.message : String(existingRead.error)}`,
    )
    return { code: 1, out, err }
  }
  const existing = existingRead.value
  const existingPngs = readExistingPngs(root, existing, cases)
  const { result, errors } = await buildEvidence({
    snapshot,
    cases,
    nodes,
    capturedAt,
    existing,
    existingPngs,
    images,
  })
  if (errors.length) {
    for (const error of errors) err.push(`error: ${error}`)
    return { code: 1, out, err }
  }
  return { paths, cases, existing, result }
}

function checkWriteBudget(
  result: BuildResult,
  paths: ReturnType<typeof evidencePaths>,
): { totalBytes: number; error?: string } {
  const { total, byCase } = evidenceBytes(result)
  // The reused PNGs stay on disk: they count against the cap even though this
  // run did not rewrite them.
  let totalBytes = total
  for (const caseId of result.reused) {
    const file = path.join(paths.references, `${caseId}.png`)
    let size: number
    try {
      size = fs.statSync(file).size
    } catch (error) {
      if (isMissingFile(error)) {
        return {
          totalBytes,
          error: `${file} disappeared while preparing evidence; retry the write`,
        }
      }
      throw error
    }
    totalBytes += size
    byCase.push({ caseId, bytes: size })
  }
  if (totalBytes > MAX_EVIDENCE_BYTES) {
    return { totalBytes, error: evidenceBudgetExceeded(totalBytes, MAX_EVIDENCE_BYTES, byCase) }
  }

  return { totalBytes }
}

function persistEvidence(
  paths: ReturnType<typeof evidencePaths>,
  cases: ParityCase[],
  result: BuildResult,
  existing: EvidenceManifest | undefined,
) {
  fs.mkdirSync(paths.references, { recursive: true })
  writeBytes(paths.source, result.source)
  for (const [caseId, bytes] of result.pngs) {
    fs.writeFileSync(path.join(paths.references, `${caseId}.png`), bytes)
  }
  writeJson(paths.manifest, result.manifest)

  // An orphan is a case that left the corpus: its manifest entry and its PNG go
  // too, so the bundle never accumulates stale pictures.
  const live = new Set(cases.map((entry) => entry.id))
  if (existing) {
    for (const caseId of Object.keys(existing.cases)) {
      if (!live.has(caseId)) {
        fs.rmSync(path.join(paths.references, `${caseId}.png`), { force: true })
      }
    }
  }
  for (const file of fs.readdirSync(paths.references)) {
    if (!file.endsWith(".png")) continue
    const caseId = file.slice(0, -".png".length)
    if (!live.has(caseId)) fs.rmSync(path.join(paths.references, file), { force: true })
  }
}

function checkReference(
  entry: ParityCase,
  node: InventoryNode | undefined,
  inSlice: Set<string>,
  manifest: EvidenceManifest,
  root: string,
  bundleValid: boolean,
  errors: string[],
  warnings: string[],
): { bytes: number; png?: string; variant?: string } {
  const errorCount = errors.length
  const where = entry.id
  const variant = pinnedVariant(node, entry)
  if (!inSlice.has(entry.nodeId))
    errors.push(`${where}: the slice has no document for ${entry.nodeId}`)
  if (variant && !inSlice.has(variant.nodeId)) {
    errors.push(`${where}: the slice has no variant ${variant.nodeId}`)
  } else if (!variant) {
    warnings.push(
      `${where}: the case points at no single variant, the slice check cannot resolve it`,
    )
  }
  const record = manifest.cases[entry.id]
  if (!record) {
    errors.push(`${where}: no manifest entry — run \`update evidence\``)
    return { bytes: 0 }
  }
  checkManifestCase(entry, variant, record, errors)
  const file = path.join(root, EVIDENCE_DIR, record.png)
  let onDisk: Buffer
  try {
    onDisk = fs.readFileSync(file)
  } catch (error) {
    if (!isMissingFile(error)) throw error
    errors.push(`${where}: ${record.png} is missing`)
    return { bytes: 0, png: record.png }
  }
  if (sha256(onDisk) !== record.sha256) {
    errors.push(`${where}: ${record.png} does not match the manifest sha256`)
  }
  const dimensions = pngDimensions(onDisk)
  if (!dimensions || dimensions.width !== record.width || dimensions.height !== record.height) {
    errors.push(`${where}: ${record.png} has invalid PNG dimensions against the manifest`)
  }
  if (
    bundleValid &&
    variant &&
    ((node?.variants ?? []).length > 0 || record.variant === entry.nodeId) &&
    errors.length === errorCount &&
    dimensions?.width === record.width &&
    dimensions.height === record.height
  ) {
    return { bytes: onDisk.length, png: record.png, variant: record.variant }
  }
  return { bytes: onDisk.length, png: record.png }
}

function checkManifestCase(
  entry: ParityCase,
  variant: ReturnType<typeof pinnedVariant>,
  record: EvidenceManifestCase,
  errors: string[],
) {
  const where = entry.id
  const expected = `references/${entry.id}.png`
  if (record.png !== expected) {
    errors.push(`${where}: manifest png must be ${expected}, found ${record.png}`)
  }
  if (record.nodeId !== entry.nodeId) {
    errors.push(`${where}: manifest nodeId ${record.nodeId} differs from the case ${entry.nodeId}`)
  }
  if (variant && record.variant !== variant.nodeId) {
    errors.push(`${where}: manifest variant ${record.variant} differs from ${variant.nodeId}`)
  }
  if (variant && record.designFingerprint !== variant.designFingerprint) {
    errors.push(
      `${where}: manifest designFingerprint is stale against the inventory — ` +
        `refresh the PNG with \`update evidence\``,
    )
  }
}

type EvidenceCheckOptions = {
  root: string
  dataRoot: string
  cases?: ParityCase[]
  nodes?: InventoryNode[]
  maxBytes?: number
}

function checkOrphans(
  manifest: EvidenceManifest,
  corpusIds: Set<string>,
  references: string,
  pngs: Set<string>,
  errors: string[],
) {
  for (const caseId of Object.keys(manifest.cases)) {
    if (!corpusIds.has(caseId)) {
      errors.push(`${caseId}: manifest entry with no case in the corpus — remove it`)
    }
  }
  try {
    for (const file of fs.readdirSync(references)) {
      if (!file.endsWith(".png")) continue
      const relative = `references/${file}`
      if (!pngs.has(relative)) errors.push(`${relative}: orphan reference with no manifest entry`)
    }
  } catch (error) {
    if (!isMissingFile(error)) throw error
  }
}
