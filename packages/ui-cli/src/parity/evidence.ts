// Figma parity — the offline evidence bundle.
//
// The reviewed cases are reproducible evidence only if a clone can read the
// source side without the person's token and without the 160 MB snapshot. The
// bundle has three generated parts:
//
//   docs/figma-parity/source.json.gz   the compact document map a case points at (gzipped)
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

import {
  CASES_PATH,
  INVENTORY_PATH,
  REGISTRY_PATH,
  caseVariant,
  loadCaseFile,
  loadInventoryNodes,
  loadRegistry,
  validateCaseFile,
  variantOfCase,
} from "./cases.ts"
import { fetchFigmaImagesPng } from "../figma/rest.ts"
import { resolveRoot, resolveWorkspaceRoot } from "../lib/paths.ts"
import { gzipJson, readJson, writeBytes } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import type { InventoryNode } from "../schemas/catalogue.ts"
import type { ParityCase } from "../schemas/parity.ts"

export const EVIDENCE_DIR = "docs/figma-parity"
export const SOURCE_PATH = `${EVIDENCE_DIR}/source.json.gz`
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
  schemaVersion: z.literal(1),
  fileKey: z.string().min(1),
  version: z.string().min(1),
  capturedAt: z.string().min(1),
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
export function evidencePaths(root = resolveWorkspaceRoot()): {
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

export function loadSlice(file = evidencePaths().source): EvidenceSlice {
  return parseSchema(SliceSchema, readJson(file), file)
}

export function loadManifest(file = evidencePaths().manifest): EvidenceManifest {
  return parseSchema(ManifestSchema, readJson(file), file)
}

// ------------------------------------------------------------------- writing

type BuildResult = {
  slice: EvidenceSlice
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
  capturedAt = new Date().toISOString().slice(0, 10),
  existing,
  existingPngs = new Map(),
}: {
  snapshot: Snapshot
  cases: ParityCase[]
  nodes: InventoryNode[]
  capturedAt?: string
  existing?: EvidenceManifest
  existingPngs?: Map<string, Buffer>
}): Promise<{ result: BuildResult; errors: string[] }> {
  const errors: string[] = []
  const byNode = new Map(nodes.map((node) => [node.nodeId, node]))
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
  const inSlice = sliceIds(slice)

  const entries: EvidenceManifest["cases"] = {}
  const pngs = new Map<string, Buffer>()
  const reused: string[] = []
  const refreshed: string[] = []
  const pending: ParityCase[] = []
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

  // One API call per distinct variant node: the pinned PNG, at scale 1.
  if (pending.length) {
    const variantIds = [
      ...new Set(
        pending
          .map((entry) => pinnedVariant(byNode.get(entry.nodeId), entry)?.nodeId)
          .filter((id): id is string => Boolean(id)),
      ),
    ]
    const images = await fetchFigmaImagesPng(snapshot.fileKey, snapshot.version, variantIds)
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

  const manifest: EvidenceManifest = {
    schemaVersion: 1,
    fileKey: slice.fileKey,
    version: slice.version,
    capturedAt,
    cases: entries,
  }
  return { result: { slice, manifest, pngs, reused, refreshed }, errors }
}

export function evidenceBytes({
  slice,
  manifest,
  pngs,
}: {
  slice?: EvidenceSlice
  manifest?: EvidenceManifest
  pngs: Map<string, Buffer>
}): { total: number; byCase: Array<{ caseId: string; bytes: number }> } {
  let total = 0
  // The cap is on the bytes a clone receives, so the slice counts compressed.
  if (slice) total += gzipJson(slice).length
  if (manifest) total += Buffer.byteLength(`${JSON.stringify(manifest, null, 2)}\n`)
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

// `parity evidence --write`: refresh the slice, the changed PNGs and the
// manifest from the pinned snapshot, then remove the entries whose case left the
// corpus. The whole write is refused when the bundle exceeds the cap.
export async function writeEvidence({
  root = resolveWorkspaceRoot(),
  dataRoot = resolveRoot(),
  input,
  capturedAt,
}: {
  root?: string
  dataRoot?: string
  input?: string
  capturedAt?: string
} = {}): Promise<number> {
  const snapshotFile = input ? path.resolve(dataRoot, input) : path.join(dataRoot, SNAPSHOT_PATH)
  const snapshotRead = loadIfExists(() => readSnapshot(snapshotFile))
  if (snapshotRead.missing) {
    console.error(
      `error: ${snapshotFile} is missing: run the live export first ` +
        `(parity evidence --write --input .figma/live-rest.json).`,
    )
    return 2
  }
  if (snapshotRead.error || !snapshotRead.value) {
    console.error(
      `error: ${snapshotRead.error instanceof Error ? snapshotRead.error.message : String(snapshotRead.error)}`,
    )
    return 1
  }
  const paths = evidencePaths(root)
  const cases = loadCaseFile(path.join(dataRoot, CASES_PATH))
  const nodes = loadInventoryNodes(path.join(dataRoot, INVENTORY_PATH))
  const registry = loadRegistry(path.join(dataRoot, REGISTRY_PATH))
  // The corpus validator owns the schema: writing evidence for a broken corpus
  // would pin the wrong thing.
  const validation = validateCaseFile(cases, { registry, nodes })
  if (validation.errors.length) {
    for (const error of validation.errors) console.error(`error: ${error}`)
    return 1
  }
  const snapshot = snapshotRead.value
  const existingRead = loadIfExists(() => loadManifest(paths.manifest))
  if (existingRead.error) {
    console.error(
      `error: ${existingRead.error instanceof Error ? existingRead.error.message : String(existingRead.error)}`,
    )
    return 1
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
  })
  if (errors.length) {
    for (const error of errors) console.error(`error: ${error}`)
    return 1
  }
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
      if (isMissingFile(error)) continue
      throw error
    }
    totalBytes += size
    byCase.push({ caseId, bytes: size })
  }
  byCase.sort((a, b) => b.bytes - a.bytes)
  if (totalBytes > MAX_EVIDENCE_BYTES) {
    console.error(
      `error: the evidence bundle would be ${formatBytes(totalBytes)} ` +
        `(cap ${formatBytes(MAX_EVIDENCE_BYTES)}). Largest cases: ` +
        byCase
          .slice(0, 5)
          .map((item) => `${item.caseId} ${formatBytes(item.bytes)}`)
          .join(" · ") +
        `. Reduce the bundle to the main components; the cap is not raised.`,
    )
    return 1
  }

  fs.mkdirSync(paths.references, { recursive: true })
  writeBytes(paths.source, gzipJson(result.slice))
  for (const [caseId, bytes] of result.pngs) {
    fs.writeFileSync(path.join(paths.references, `${caseId}.png`), bytes)
  }
  fs.writeFileSync(paths.manifest, `${JSON.stringify(result.manifest, null, 2)}\n`)

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

  console.log(
    `evidence: ${cases.length} case(s) · written ${result.refreshed.length} · ` +
      `skipped ${result.reused.length} · ${formatBytes(totalBytes)} (cap ${formatBytes(MAX_EVIDENCE_BYTES)})`,
  )
  console.log(`source: ${SOURCE_PATH} · version ${result.slice.version}`)
  console.log(`manifest: ${MANIFEST_PATH} · references ${REFERENCES_DIR}/`)
  return 0
}

// ------------------------------------------------------------------- checking

export type EvidenceReport = {
  errors: string[]
  warnings: string[]
  cases: number
  entries: number
  bytes: number
}

// The two committed files, loaded once and with the guidance a missing bundle
// deserves. Both `evidence --check` and a parity run on the slice use it.
function loadEvidenceForCheck(root: string): {
  slice?: EvidenceSlice
  manifest?: EvidenceManifest
  errors: string[]
} {
  const paths = evidencePaths(root)
  const errors: string[] = []
  let slice: EvidenceSlice | undefined
  let manifest: EvidenceManifest | undefined
  const sourceRead = loadIfExists(() => loadSlice(paths.source))
  if (sourceRead.missing) {
    errors.push(`${SOURCE_PATH} is missing — run \`parity evidence --write\` with FIGMA_TOKEN`)
  } else if (sourceRead.error) {
    errors.push(
      sourceRead.error instanceof Error ? sourceRead.error.message : String(sourceRead.error),
    )
  } else {
    slice = sourceRead.value
  }
  const manifestRead = loadIfExists(() => loadManifest(paths.manifest))
  if (manifestRead.missing) {
    errors.push(`${MANIFEST_PATH} is missing — run \`parity evidence --write\` with FIGMA_TOKEN`)
  } else if (manifestRead.error) {
    errors.push(
      manifestRead.error instanceof Error ? manifestRead.error.message : String(manifestRead.error),
    )
  } else {
    manifest = manifestRead.value
  }
  return { slice, manifest, errors }
}

// `parity evidence --check`: the corpus, the slice and the manifest must agree,
// byte for byte, with no token and no network.
export function checkEvidence({
  root = resolveWorkspaceRoot(),
  dataRoot = resolveRoot(),
  cases,
  nodes,
  maxBytes = MAX_EVIDENCE_BYTES,
}: {
  root?: string
  dataRoot?: string
  cases?: ParityCase[]
  nodes?: InventoryNode[]
  maxBytes?: number
} = {}): EvidenceReport {
  const paths = evidencePaths(root)
  const corpus = cases ?? loadCaseFile(path.join(dataRoot, CASES_PATH))
  const inventory = nodes ?? loadInventoryNodes(path.join(dataRoot, INVENTORY_PATH))
  const bundle = loadEvidenceForCheck(root)
  const errors = [...bundle.errors]
  const warnings: string[] = []
  const { slice, manifest } = bundle
  if (!slice || !manifest) {
    return { errors, warnings, cases: corpus.length, entries: 0, bytes: 0 }
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
  const inSlice = sliceIds(slice)
  const byNode = new Map(inventory.map((node) => [node.nodeId, node]))
  const corpusIds = new Set(corpus.map((entry) => entry.id))
  let bytes = 0
  try {
    bytes += fs.statSync(paths.source).size
    bytes += fs.statSync(paths.manifest).size
  } catch {
    // The two files were read above: a stat failure is an fs race, not a shape.
  }
  const pngs = new Set<string>()
  const byCase: Array<{ caseId: string; bytes: number }> = []
  for (const entry of corpus) {
    const where = entry.id
    const variant = pinnedVariant(byNode.get(entry.nodeId), entry)
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
      errors.push(`${where}: no manifest entry — run \`parity evidence --write\``)
      continue
    }
    const expected = `references/${entry.id}.png`
    if (record.png !== expected) {
      errors.push(`${where}: manifest png must be ${expected}, found ${record.png}`)
    }
    if (record.nodeId !== entry.nodeId) {
      errors.push(
        `${where}: manifest nodeId ${record.nodeId} differs from the case ${entry.nodeId}`,
      )
    }
    if (variant && record.variant !== variant.nodeId) {
      errors.push(`${where}: manifest variant ${record.variant} differs from ${variant.nodeId}`)
    }
    if (variant && record.designFingerprint !== variant.designFingerprint) {
      errors.push(
        `${where}: manifest designFingerprint is stale against the inventory — ` +
          `refresh the PNG with \`parity evidence --write\``,
      )
    }
    pngs.add(record.png)
    const file = path.join(root, EVIDENCE_DIR, record.png)
    let onDisk: Buffer
    try {
      onDisk = fs.readFileSync(file)
    } catch (error) {
      if (!isMissingFile(error)) throw error
      errors.push(`${where}: ${record.png} is missing`)
      continue
    }
    bytes += onDisk.length
    byCase.push({ caseId: entry.id, bytes: onDisk.length })
    if (sha256(onDisk) !== record.sha256) {
      errors.push(`${where}: ${record.png} does not match the manifest sha256`)
    }
  }
  for (const caseId of Object.keys(manifest.cases)) {
    if (!corpusIds.has(caseId)) {
      errors.push(`${caseId}: manifest entry with no case in the corpus — remove it`)
    }
  }
  try {
    for (const file of fs.readdirSync(paths.references)) {
      if (!file.endsWith(".png")) continue
      const relative = `references/${file}`
      if (!pngs.has(relative)) errors.push(`${relative}: orphan reference with no manifest entry`)
    }
  } catch (error) {
    if (!isMissingFile(error)) throw error
  }
  if (bytes > maxBytes) {
    byCase.sort((a, b) => b.bytes - a.bytes)
    errors.push(
      `the evidence bundle is ${formatBytes(bytes)} (cap ${formatBytes(maxBytes)}) — ` +
        `largest cases: ` +
        byCase
          .slice(0, 5)
          .map((item) => `${item.caseId} ${formatBytes(item.bytes)}`)
          .join(" · ") +
        `; reduce it to the main components, do not raise the cap`,
    )
  }
  return {
    errors,
    warnings,
    cases: corpus.length,
    entries: Object.keys(manifest.cases).length,
    bytes,
  }
}

// A parity run that reads the committed slice must prove the slice still
// describes the case it is about to capture: the manifest entry exists, points
// at the variant the inventory resolves, and carries the same fingerprint. A
// stale bundle is missing evidence, never a pass.
export function checkCaseEvidence({
  entry,
  node,
  root = resolveWorkspaceRoot(),
}: {
  entry: Pick<ParityCase, "nodeId" | "variant" | "state" | "device"> & { id?: string }
  node?: InventoryNode
  root?: string
}): string[] {
  const where = entry.id ?? entry.nodeId
  const bundle = loadEvidenceForCheck(root)
  const errors = [...bundle.errors]
  const { slice, manifest } = bundle
  if (!slice || !manifest) return errors
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
        `run \`parity evidence --write\` with FIGMA_TOKEN`,
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
          `refresh the evidence bundle with \`parity evidence --write\``,
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

// The CLI adapter: `parity evidence --write|--check`.
export async function evidenceCommand(argv: string[] = process.argv.slice(2)): Promise<number> {
  const write = argv.includes("--write")
  const check = argv.includes("--check")
  const inputIndex = argv.indexOf("--input")
  const input = inputIndex >= 0 ? argv[inputIndex + 1] : undefined
  if (write === check) {
    console.error("usage: figma-parity evidence --write [--input <file>] | --check")
    return 2
  }
  if (write) return await writeEvidence({ input })
  const report = checkEvidence()
  for (const warning of report.warnings) console.warn(`warn: ${warning}`)
  for (const error of report.errors) console.error(`error: ${error}`)
  console.log(
    `evidence: ${report.cases} case(s) · ${report.entries} manifest entr(ies) · ` +
      `${formatBytes(report.bytes)} (cap ${formatBytes(MAX_EVIDENCE_BYTES)})`,
  )
  console.log(report.errors.length ? "evidence: failed" : "evidence: ok")
  return report.errors.length ? 1 : 0
}
