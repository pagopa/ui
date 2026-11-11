// Figma parity — the case corpus.
//
// The reviewed cases read as one value. `cases.json` is a document, and so are
// the inventory it points into, the registry that declares the implementation
// and the device vocabulary an entry may name: those four are the corpus's
// properties, and every judgment they support is a method. A caller asks the
// value instead of rebuilding an index beside it, and validation takes no
// arguments because the value already holds what it validates against.
//
// Nothing here reads a file. `readCorpus` does, once per process, through the
// committed-records reader; every other caller receives the value.

import fs from "node:fs"

import type { Workspace } from "../adapters/workspace.ts"
import {
  LAYOUT_SCOPES,
  UNKNOWN_DEVICE,
  axisToken,
  deviceAxes,
  deviceOf,
  requiredDevices,
} from "../figma/devices.ts"
import { UsageError } from "../lib/command.ts"
import { createSourceModules } from "../lib/source-modules.ts"
import { readCases, readDevicePolicy, readInventory, readRegistry } from "../records/committed.ts"
import type { InventoryNode, Registry, RegistryEntry } from "../schemas/catalogue.ts"
import type { DevicePolicy } from "../schemas/devices.ts"
import type { ParityCase } from "../schemas/parity.ts"

// A draft case is one `cases --sync` proposed: its selectors are copied from a
// sibling and its note says the mapping still needs the reviewed render (RA6).
// Drafts never count as coverage — R9: no unreviewed case silences the queue.
export const DRAFT_NOTE = "draft — refine the mapping"

export function isDraftCase(entry: { note?: string } | undefined): boolean {
  return typeof entry?.note === "string" && entry.note.trim().startsWith("draft")
}

// The reviewed case corpus: one entry per source variant the repository has
// compared, with the mapping `check`/`capture` need to reproduce it. The field
// order below is the canonical write order — the file is reviewed in PRs, so a
// stable key order keeps the diff readable.
export const CASE_FIELDS = [
  "id",
  "nodeId",
  "export",
  "storyId",
  "state",
  "device",
  "layoutScope",
  "variant",
  "width",
  "viewport",
  "height",
  "depth",
  "root",
  "subjectRoot",
  "offsetOrigin",
  "subjects",
  "fill",
  "click",
  "focus",
  "keepFocus",
  "blur",
  "compareText",
  "compareBox",
  "compareOffset",
  "expectState",
  "stateEvidence",
  "interactive",
  "residues",
  "ignores",
  "note",
]

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Storybook derives the export part of a story id from the export name in words
// (`SourceFrame` -> `source-frame`), not from the raw identifier.
export function exportSlug(name: string): string {
  return slug(name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2"))
}

export function storyId(title: string, exportName: string): string {
  return `${slug(title)}--${exportSlug(exportName)}`
}

// `529:6111` + `filled` -> `529-6111-filled`: the same shape the wave evidence
// files use, so a case id is greppable in `.figma/parity`. A device case carries
// its device in the id (`529-6111-filled-mobile`): the reviewed corpus is read
// per device, and the id is how a wave names it.
export function caseIdFor(
  spec: Pick<ParityCase, "nodeId" | "state" | "variant" | "device">,
): string {
  const selector = spec.state ?? spec.variant?.replace(":", "-") ?? "case"
  const device = spec.device ? `-${slug(String(spec.device))}` : ""
  return `${String(spec.nodeId).replace(":", "-")}-${slug(String(selector))}${device}`
}

// The identity two entries share when they describe the same comparison: the
// node, the variant selector and the device. Two devices of one state are two
// entries — that is the point of the device dimension.
export function caseKey(spec: Pick<ParityCase, "nodeId" | "state" | "variant" | "device">): string {
  return `${spec.nodeId}|${spec.variant ?? spec.state ?? ""}|${spec.device ?? ""}`
}

const SELECTOR = (value: unknown): boolean => typeof value === "string" && value.trim().length > 0
const NUMBER = (value: unknown): boolean =>
  typeof value === "number" && Number.isFinite(value) && value > 0

// The state a variant name declares (`* Required=True, Device=Mobile`) and the
// tokens a case uses to select it: the same reading `pickVariant` applies to the
// pinned export, applied here to the committed per-variant records so the
// hermetic validator can tell which variant a case points at.
function variantState(name: string): Record<string, string> {
  return Object.fromEntries(
    String(name ?? "")
      .split(",")
      .map((part) => {
        const index = part.indexOf("=")
        if (index < 0) return []
        return [part.slice(0, index).trim().replace(/^\*/, ""), part.slice(index + 1).trim()]
      })
      .filter((pair): pair is [string, string] => Boolean(pair[0] && pair[1])),
  )
}

function stateMatches(name: string, tokens: string[]): boolean {
  const state = variantState(name)
  const values = Object.values(state).map((value) => value.toLowerCase())
  return tokens.every(
    (token) =>
      values.some((value) => value === token || value.includes(token)) ||
      (token === "filled" && state.Filled === "True") ||
      (token === "empty" && state.Filled === "False"),
  )
}

// The variant record a case points at, when the inventory can decide it: an
// explicit `variant` node id always resolves, a `state` selector only when
// exactly one of the node's variants matches it. It reads one node and one
// entry and no document, so it stays a function: a corpus method here would
// claim the node came from the corpus when the caller passes its own.
export function variantOfCase(
  node: InventoryNode | undefined,
  entry: Pick<ParityCase, "variant" | "state"> | undefined,
): NonNullable<InventoryNode["variants"]>[number] | undefined {
  const variants = node?.variants ?? []
  if (!variants.length) return undefined
  if (entry?.variant) return variants.find((variant) => variant.nodeId === entry.variant)
  if (!entry?.state) return undefined
  const tokens = String(entry?.state)
    .split("|")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
  const matches = variants.filter((variant) => stateMatches(variant.name, tokens))
  return matches.length === 1 ? matches[0] : undefined
}

// The variant a case actually captures, with the same narrowing `check` applies:
// an explicit `variant`, the case's device pool, then the state tokens (a state
// that matches nothing keeps the pool's first variant, as `pickVariant` does).
// `variantOfCase` stays the strict validator; this is the evidence writer's
// reader, so a multi-match state still pins the PNG the render is compared to.
export function caseVariant(
  node: InventoryNode | undefined,
  entry: Pick<ParityCase, "variant" | "state" | "device"> | undefined,
): NonNullable<InventoryNode["variants"]>[number] | undefined {
  const variants = node?.variants ?? []
  if (!variants.length) return undefined
  const pool = entry?.device
    ? variants.filter((variant) => variant.device === entry.device)
    : variants
  if (entry?.variant) {
    return (
      pool.find((variant) => variant.nodeId === entry.variant) ??
      variants.find((variant) => variant.nodeId === entry.variant)
    )
  }
  if (!entry?.state) return pool[0]
  const tokens = String(entry.state)
    .split("|")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
  return pool.find((variant) => stateMatches(variant.name, tokens)) ?? pool[0]
}

// ------------------------------------------------------------ device coverage

// The device dimension of the queue: what each node declares against what the
// reviewed corpus covers. It iterates the inventory and the registry, so a
// component that is added, renamed or retired changes the report by itself
// (R8) — and a node whose set declares no device axis is simply absent.
export type CoverageRow = {
  nodeId: string
  name: string
  status: string
  export: string | null
  story: string | null
  declared: string[]
  covered: string[]
  missing: string[]
  drafts: string[]
}

export type DeviceCoverage = {
  rows: CoverageRow[]
  all: CoverageRow[]
  omitted: number
  totals: { nodes: number; declared: number; covered: number; missing: number; drafts: number }
}

// What `cases --sync` proposes (RA6): for a node that declares more devices than
// the corpus covers and already has a sibling case, the missing device case —
// the sibling's selector mapping over the device's own variant, at the variant's
// own width. The mapping is a draft by construction (R9): the note says so, the
// coverage ignores it, and the wave replaces both after the reviewed render.
export type CaseProposal = Partial<ParityCase> & Pick<ParityCase, "nodeId" | "export">

export type CaseSkip = { nodeId: string; variant?: string; missing?: string[]; reason: string }

export type CaseStateProposals = { proposals: CaseProposal[]; skipped: CaseSkip[] }

export type CaseProposals = CaseStateProposals & {
  stateProposals: CaseProposal[]
  stateSkipped: CaseSkip[]
  coverage: DeviceCoverage
}

export type CaseValidation = { errors: string[]; warnings: string[] }

// --------------------------------------------------------------- the value

// The documents the corpus is read from: what a judgment may consult, and the
// reason no judgment needs a path or a second argument.
export type CorpusDocuments = {
  /** The workspace whose story files the registry points at. */
  readonly workspace: Workspace
  /** `cases.json`, as read. */
  readonly cases: ParityCase[]
  /** The inventory's components: the nodes a case may name. */
  readonly inventory: InventoryNode[]
  /** `registry.json`: which node each case belongs to, which stories it declares. */
  readonly registry: Registry
  /** `device-policy.json`: the device vocabulary a case may name. */
  readonly policy: DevicePolicy
}

export type CoverageOptions = { readonly statuses?: readonly string[] }
export type ProposalOptions = CoverageOptions & { readonly nodeId?: string }
export type StateProposalOptions = ProposalOptions & { readonly coverage?: DeviceCoverage }

export type CaseCorpus = CorpusDocuments & {
  /** The id index: what `--case <id>` resolves against. */
  readonly byId: ReadonlyMap<string, ParityCase>
  /** The node ids the corpus mentions: the mapped side of the queue. */
  readonly nodeIds: ReadonlySet<string>
  /** Every draft: proposed from a sibling, still waiting for the review, never coverage. */
  readonly drafts: readonly ParityCase[]
  /** Fan-in: how many inventory components depend on a node. */
  readonly fanIn: ReadonlyMap<string, number>
  /** The entries one node carries, in file order. */
  of(nodeId: string): readonly ParityCase[]
  /** The entries one node carries that count as coverage. */
  reviewed(nodeId: string): readonly ParityCase[]
  /** The inventory node, when the inventory has it. */
  node(nodeId: string): InventoryNode | undefined
  find(id: string): ParityCase
  /** The variants the reviewed cases of a node point at. */
  pointed(nodeId: string): ReadonlySet<string>
  coverage(options?: CoverageOptions): DeviceCoverage
  proposals(options?: ProposalOptions): CaseProposals
  stateProposals(options?: StateProposalOptions): CaseStateProposals
  validate(): CaseValidation
}

const NONE: readonly ParityCase[] = []

function indexBy<T>(items: readonly T[], key: (item: T) => string | undefined): Map<string, T> {
  const index = new Map<string, T>()
  for (const item of items) {
    const id = key(item)
    if (id !== undefined && !index.has(id)) index.set(id, item)
  }
  return index
}

function groupByNode(cases: readonly ParityCase[], filter: (entry: ParityCase) => boolean) {
  const groups = new Map<string, ParityCase[]>()
  for (const entry of cases) {
    if (!filter(entry)) continue
    const group = groups.get(entry.nodeId)
    if (group) group.push(entry)
    else groups.set(entry.nodeId, [entry])
  }
  return groups
}

/**
 * The corpus as one frozen value: the documents it holds, and the judgments it
 * makes over them. Build it with `readCorpus` when the documents are on disk.
 */
export function caseCorpus(documents: CorpusDocuments): CaseCorpus {
  const byNode = groupByNode(documents.cases, () => true)
  const reviewedByNode = groupByNode(documents.cases, (entry) => !isDraftCase(entry))
  const drafts = documents.cases.filter(isDraftCase)
  const byId = indexBy(documents.cases, (entry) => entry.id)
  // The documents are asked for when a judgment needs them, so a caller that
  // only resolves an id does not read the registry, the inventory or the
  // policy to reach the case it names.
  let nodes: Map<string, InventoryNode> | undefined
  let fanIn: Map<string, number> | undefined
  const nodeAt = (nodeId: string) =>
    (nodes ??= indexBy(documents.inventory, (node) => node.nodeId)).get(nodeId)
  const corpus: CaseCorpus = {
    get workspace() {
      return documents.workspace
    },
    get cases() {
      return documents.cases
    },
    get inventory() {
      return documents.inventory
    },
    get registry() {
      return documents.registry
    },
    get policy() {
      return documents.policy
    },
    byId,
    nodeIds: new Set(documents.cases.map((entry) => entry.nodeId)),
    drafts,
    get fanIn() {
      return (fanIn ??= fanInCounts(documents.inventory))
    },
    of: (nodeId) => byNode.get(nodeId) ?? NONE,
    reviewed: (nodeId) => reviewedByNode.get(nodeId) ?? NONE,
    node: (nodeId) => nodeAt(nodeId),
    find(id) {
      const entry = byId.get(id)
      if (entry) return entry
      const known = [...byId.keys()].join(", ") || "none"
      throw new UsageError(`${id}: no case with that id in the corpus (known: ${known})`)
    },
    pointed(nodeId) {
      const node = nodeAt(nodeId)
      return node ? pointedVariants(node, byNode.get(nodeId) ?? NONE) : new Set<string>()
    },
    coverage: (options) => coverageOf(corpus, options?.statuses),
    proposals: (options) => proposalsOf(corpus, options),
    stateProposals: (options) => stateProposalsOf(corpus, options),
    validate: () => validateCorpus(corpus),
  }
  return Object.freeze(corpus)
}

/**
 * The committed corpus: the four records, each read the first time a judgment
 * asks for it. `readCorpus(workspace).find(id)` resolves an id without reading
 * the registry that id lookup does not consult.
 */
export function readCorpus(workspace: Workspace, file?: string): CaseCorpus {
  let cases: ParityCase[] | undefined
  let inventory: InventoryNode[] | undefined
  let registry: Registry | undefined
  let policy: DevicePolicy | undefined
  return caseCorpus({
    workspace,
    get cases() {
      return (cases ??= readCases(workspace.root, file) ?? [])
    },
    get inventory() {
      return (inventory ??= readInventory(workspace.root).components)
    },
    get registry() {
      return (registry ??= readRegistry(workspace.root))
    },
    get policy() {
      return (policy ??= readDevicePolicy(workspace.root))
    },
  })
}

// Fan-in: how many inventory components depend on a node. A fix in a shared
// part lands before the components that contain it, so the queue can order the
// work by reuse instead of by node id.
function fanInCounts(nodes: readonly InventoryNode[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const node of nodes) {
    for (const dependency of node.dependencies ?? []) {
      if (dependency.external) continue
      counts.set(dependency.nodeId, (counts.get(dependency.nodeId) ?? 0) + 1)
    }
  }
  return counts
}

// ------------------------------------------------------------- validation

// Hermetic validation: no snapshot, no browser. The corpus may only reference
// nodes the inventory knows and story exports the registry declares; when the
// registry declares none (a node reviewed before the story exports were
// recorded) the case carries the story id and the check warns instead of
// failing.
function validateCorpus(corpus: CaseCorpus): CaseValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const seen = new Set<string>()
  for (const entry of corpus.cases) validateEntry(corpus, entry, seen, errors, warnings)
  return { errors, warnings }
}

// The story ids a registry entry declares, resolved through the same join the
// queue uses (the story title and the declared exports, cached per file).
function registryStoryIds(workspace: Workspace, entry: RegistryEntry | undefined): string[] {
  if (!entry?.target?.story || !entry?.target?.storyExports?.length) return []
  const file = entry.target.story
  const title = fs.existsSync(workspace.path(file))
    ? createSourceModules(workspace).storyTitle(file)
    : undefined
  if (!title) return []
  return entry.target.storyExports.map((name: string) => storyId(title, name))
}

type CaseFailure = (message: string) => void
function validateEntry(
  corpus: CaseCorpus,
  entry: ParityCase,
  seen: Set<string>,
  errors: string[],
  warnings: string[],
) {
  const where = entry?.id ?? entry?.nodeId ?? "(entry without id)"
  const fail = (message: string): void => {
    errors.push(`${where}: ${message}`)
  }
  if (!SELECTOR(entry?.id)) fail("a case needs a non-empty id")
  else if (seen.has(entry.id)) fail("duplicate case id")
  else seen.add(entry.id)
  if (!/^\d+:\d+$/.test(String(entry?.nodeId ?? ""))) fail("nodeId must look like 529:6111")
  else if (!corpus.node(entry.nodeId)) fail(`${entry.nodeId} is not in inventory.json`)
  if (!SELECTOR(entry?.export)) fail("export is required")
  if (entry?.storyId != null && !/^[a-z0-9-]+--[a-z0-9-]+$/.test(String(entry.storyId))) {
    fail("storyId must look like components-inputs-textfield--playground")
  }
  if (entry?.variant != null && !/^\d+:\d+$/.test(String(entry.variant))) {
    fail("variant must be a node id")
  }
  validateDevice(corpus, entry, fail)
  validateMapping(entry, fail)
  validateRegistry(corpus, entry, where, fail, warnings)
}

function validateDevice(corpus: CaseCorpus, entry: ParityCase, fail: CaseFailure) {
  // The device dimension (RA3): the field names a canonical device the policy
  // declares, and it cannot contradict the variant the case points at.
  const policy = corpus.policy
  if (entry?.device != null) {
    const devices = Object.keys(policy?.devices ?? {})
    if (!SELECTOR(entry.device)) {
      fail("device must be a device key")
    } else if (!Object.hasOwn(policy?.devices ?? {}, entry.device)) {
      const resolved = deviceOf(policy, entry.device)
      fail(
        `device "${entry.device}" is not a device key (${devices.join(", ")})` +
          (resolved !== UNKNOWN_DEVICE ? ` — it resolves to "${resolved}"` : ""),
      )
    } else {
      const variant = variantOfCase(corpus.node(entry.nodeId), entry)
      if (variant && variant.device && variant.device !== entry.device) {
        fail(
          `device "${entry.device}" contradicts the variant ${variant.nodeId} ` +
            `(${variant.name}), which declares "${variant.device}"`,
        )
      }
    }
  }
}

function validateMapping(entry: ParityCase, fail: CaseFailure) {
  if (entry?.layoutScope != null && !LAYOUT_SCOPES.includes(entry.layoutScope)) {
    fail(`layoutScope must be one of ${LAYOUT_SCOPES.join(" | ")}`)
  }
  const selectorFields = ["state", "root", "subjectRoot", "offsetOrigin", "stateEvidence"] as const
  for (const field of selectorFields) {
    if (entry?.[field] != null && !SELECTOR(entry[field]))
      fail(`${field} must be a selector or a state name`)
  }
  const numericFields = ["width", "viewport", "height", "depth"] as const
  for (const field of numericFields) {
    if (entry?.[field] != null && !NUMBER(entry[field])) fail(`${field} must be a positive number`)
  }
  if (entry?.compareBox != null && !["height", "full"].includes(entry.compareBox)) {
    fail('compareBox must be "height" or "full"')
  }
  if (
    entry?.compareOffset != null &&
    entry.compareOffset !== true &&
    !SELECTOR(entry.compareOffset)
  ) {
    fail("compareOffset must be true or an offset-origin selector")
  }
  if (entry?.subjects != null) {
    if (typeof entry.subjects !== "object" || Array.isArray(entry.subjects)) {
      fail("subjects must be an object of layer=selector pairs")
    } else {
      for (const [layer, selector] of Object.entries(entry.subjects)) {
        if (!SELECTOR(layer)) fail("a subject layer name is empty")
        if (!SELECTOR(selector)) fail(`subject ${layer} has no selector`)
      }
    }
  }
  if (entry?.fill != null) {
    if (!Array.isArray(entry.fill)) fail("fill must be an array of [selector, value] pairs")
    else
      for (const pair of entry.fill) {
        if (!Array.isArray(pair) || pair.length !== 2 || !SELECTOR(pair[0])) {
          fail("fill entries must be [selector, value] pairs")
        }
      }
  }
  for (const residue of entry?.residues ?? []) {
    if (!SELECTOR(residue?.path)) fail("a residue needs a delta path")
    if (!SELECTOR(residue?.reason)) fail(`residue ${residue?.path ?? "?"} has no reason`)
  }
  for (const path of entry?.ignores ?? []) {
    if (!SELECTOR(path)) fail("an ignore entry needs a delta path")
  }
  for (const key of Object.keys(entry ?? {})) {
    if (!CASE_FIELDS.includes(key)) fail(`unknown field ${key}`)
  }
}

function validateRegistry(
  corpus: CaseCorpus,
  entry: ParityCase,
  where: string,
  fail: CaseFailure,
  warnings: string[],
) {
  const known = corpus.registry.entries?.[entry?.nodeId]
  // `export` is the implementation the case covers (the registry target), the
  // `storyId` is the render surface. Both must agree with the registry where
  // it declares them; where it does not, the case is the only record and the
  // check warns instead of failing (decision D2: coverage stays a work list).
  const targetExports = [
    known?.target?.export,
    ...(known?.target?.additionalTargets ?? []).map((target) => target.export),
  ].filter(Boolean)
  if (entry?.export && targetExports.length && !targetExports.includes(entry.export)) {
    fail(
      `export ${entry.export} is not the registry target nor an additionalTargets export of ${entry.nodeId} (${targetExports.join(", ")})`,
    )
  }
  const declaredStories = registryStoryIds(corpus.workspace, known)
  if (declaredStories.length) {
    if (entry?.storyId && !declaredStories.includes(entry.storyId)) {
      fail(
        `storyId ${entry.storyId} is not among the declared story exports of ${entry.nodeId} (${declaredStories.join(", ")})`,
      )
    }
    if (!entry?.storyId) {
      warnings.push(`${where}: the registry declares storyExports; the case carries no storyId`)
    }
  } else if (known?.target) {
    warnings.push(
      `${where}: the registry declares no storyExports for ${entry?.nodeId}: the corpus is the only record of the story mapping`,
    )
  }
  if (!known) warnings.push(`${where}: no registry entry for ${entry?.nodeId}`)
}

// -------------------------------------------------------------- coverage

// The corpus read per device: it iterates the registry and the inventory, and
// asks itself for the entries each node carries, so no caller rebuilds that
// index.
function coverageOf(
  corpus: CaseCorpus,
  statuses: readonly string[] = ["implemented", "pending"],
): DeviceCoverage {
  const wanted = new Set(statuses)
  const rows: CoverageRow[] = []
  for (const [nodeId, entry] of Object.entries(corpus.registry.entries ?? {})) {
    const node = corpus.node(nodeId)
    if (!node) continue
    const declared = requiredDevices(corpus.policy, node)
    if (!declared.length) continue
    const matching = (device: string): readonly ParityCase[] =>
      corpus.of(nodeId).filter((item) => item.device === device)
    const covered = declared.filter((device) => matching(device).some((item) => !isDraftCase(item)))
    const drafts = declared.flatMap((device) =>
      matching(device)
        .filter(isDraftCase)
        .map((item) => item.id ?? ""),
    )
    const missing = declared.filter((device) => !covered.includes(device))
    rows.push({
      nodeId,
      name: node.name,
      status: entry.status,
      export: entry.target?.export ?? null,
      story: entry.target?.story ?? null,
      declared,
      covered,
      missing,
      drafts,
    })
  }
  rows.sort((a, b) => a.nodeId.localeCompare(b.nodeId, undefined, { numeric: true }))
  // `all` keeps every status: the exception rules need the nodes the coverage
  // line does not count (a reasoned entry must name a node that really misses a
  // device, whatever its status), the line and the gate read the filtered rows.
  const all = rows
  const filtered = rows.filter((row) => wanted.has(row.status))
  return {
    rows: filtered,
    all,
    omitted: rows.length - filtered.length,
    totals: {
      nodes: filtered.length,
      declared: filtered.reduce((count, row) => count + row.declared.length, 0),
      covered: filtered.reduce((count, row) => count + row.covered.length, 0),
      missing: filtered.reduce((count, row) => count + row.missing.length, 0),
      drafts: filtered.reduce((count, row) => count + row.drafts.length, 0),
    },
  }
}

// ------------------------------------------------------- device proposals

function proposalsOf(corpus: CaseCorpus, options: ProposalOptions = {}): CaseProposals {
  const { nodeId, statuses = ["implemented", "pending"] } = options
  const coverage = corpus.coverage({ statuses })
  const proposals: CaseProposal[] = []
  const skipped: CaseSkip[] = []
  for (const row of coverage.rows) proposeDevicesForNode(row, nodeId, corpus, proposals, skipped)
  const states = corpus.stateProposals({ nodeId, statuses, coverage })
  return {
    proposals,
    skipped,
    stateProposals: states.proposals,
    stateSkipped: states.skipped,
    coverage,
  }
}

// The variants a non-draft case points at: the `variant` id when the case
// carries one, else the `state` tokens applied to the variants the case's
// device narrows to — the same reading `check` applies (`--device` narrows the
// set, then `--state` picks one record). A draft points nowhere: it still waits
// for the reviewed render, so it never silently shrinks the work list.
function pointedVariants(node: InventoryNode, cases: readonly ParityCase[]): Set<string> {
  const variants = node.variants ?? []
  const pointed = new Set<string>()
  for (const entry of cases) {
    if (isDraftCase(entry)) continue
    const pool = entry.device ? variants.filter((item) => item.device === entry.device) : variants
    if (entry.variant) {
      const match =
        pool.find((item) => item.nodeId === entry.variant) ??
        variants.find((item) => item.nodeId === entry.variant)
      if (match) pointed.add(match.nodeId)
      continue
    }
    if (!entry.state) continue
    const tokens = String(entry?.state)
      .split("|")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean)
    const matches = pool.filter((item) => stateMatches(item.name, tokens))
    if (matches.length === 1) pointed.add(matches[0].nodeId)
  }
  return pointed
}

// The axis a device came from on this set: the source may spell it `Device`,
// `Breakpoint`, `Layout` or something else (`Property 1`). The token is what the
// variant name carries, without the property key's `#id` suffix.
function axisOfDevice(
  policy: DevicePolicy,
  node: InventoryNode | undefined,
  device: string,
): string | undefined {
  if (!node) return undefined
  for (const axis of deviceAxes(policy, node)) {
    if (axis.values.some((item) => item.device === device)) return axis.token
  }
  return undefined
}

function proposeDevicesForNode(
  row: CoverageRow,
  nodeId: string | undefined,
  corpus: CaseCorpus,
  proposals: CaseProposal[],
  skipped: CaseSkip[],
) {
  if (nodeId && row.nodeId !== nodeId) return
  if (!row.missing.length) return
  const policy = corpus.policy
  const node = corpus.node(row.nodeId)
  const siblings = corpus.of(row.nodeId)
  if (!siblings.length) {
    // Nothing to copy: the first case of a node needs the review, not a
    // template.
    skipped.push({ nodeId: row.nodeId, missing: row.missing, reason: "no sibling case" })
    return
  }
  const sibling = siblings.find((item) => !isDraftCase(item)) ?? siblings[0]
  // The sibling's state carries the other axes (`MD Desktop|KO`): the device
  // token goes in, the device tokens come out, the rest is copied — a draft,
  // still, because the device is not the only axis.
  const otherTokens = String(sibling.state ?? "")
    .split("|")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => deviceOf(policy, token) === UNKNOWN_DEVICE)
  // Which variant of a device the draft points at: the sibling's own device
  // spelling when the set draws that width, otherwise the one closest to the
  // sibling's capture width.
  const siblingDeviceToken = String(sibling.state ?? "")
    .split("|")
    .map((token) => token.trim())
    .find((token) => ["mobile", "tablet", "desktop"].includes(deviceOf(policy, token)))
  const reference = Number(sibling.width ?? sibling.viewport ?? 0)
  for (const device of row.missing) {
    const variant = deviceVariant(node, device, siblingDeviceToken, reference)
    if (!variant) {
      skipped.push({
        nodeId: row.nodeId,
        missing: [device],
        reason: `no variant declares ${device}`,
      })
      continue
    }
    const width = variant.box?.width
    const axis = axisOfDevice(policy, node, device)
    const value = axis ? variantState(variant.name)[axis] : undefined
    proposals.push(deviceProposal(row.nodeId, sibling, device, value, width, otherTokens))
  }
}

function deviceVariant(
  node: InventoryNode | undefined,
  device: string,
  siblingDeviceToken: string | undefined,
  reference: number,
) {
  const candidates = (node?.variants ?? []).filter((item) => item.device === device)
  const exact = siblingDeviceToken
    ? candidates.find((item) => item.name.includes(siblingDeviceToken))
    : undefined
  if (exact) return exact
  if (!reference) return candidates[0]
  return [...candidates].sort(
    (a, b) => Math.abs((a.box?.width ?? 0) - reference) - Math.abs((b.box?.width ?? 0) - reference),
  )[0]
}

// ------------------------------------------------- state/property proposals

// The companion of the device proposals: for a node whose corpus already has a
// case, one draft per variant no reviewed case points at, so the states and the
// visual properties of the set enter the burn-down like the devices. The draft
// copies the sibling mapping and pins the variant, its device and its width; the
// note keeps it out of the coverage (R9). A variant whose device still misses
// its own case is left to the device proposal, which owns the first capture at
// that width.
function stateProposalsOf(
  corpus: CaseCorpus,
  options: StateProposalOptions = {},
): CaseStateProposals {
  const { nodeId, statuses = ["implemented", "pending"], coverage } = options
  const wanted = new Set(statuses)
  const deviceRows = new Map(
    (coverage ?? corpus.coverage({ statuses })).rows.map((row) => [row.nodeId, row]),
  )
  const proposals: CaseProposal[] = []
  const skipped: CaseSkip[] = []
  const proposedIds = new Set<string>()
  for (const [id, entry] of Object.entries(corpus.registry.entries ?? {}))
    proposeStatesForNode(
      id,
      entry,
      nodeId,
      wanted,
      corpus,
      deviceRows,
      proposedIds,
      proposals,
      skipped,
    )
  return { proposals, skipped }
}

function proposeStatesForNode(
  id: string,
  entry: RegistryEntry,
  nodeId: string | undefined,
  wanted: Set<string>,
  corpus: CaseCorpus,
  deviceRows: Map<string, CoverageRow>,
  proposedIds: Set<string>,
  proposals: CaseProposal[],
  skipped: CaseSkip[],
) {
  if (nodeId && id !== nodeId) return
  if (!wanted.has(entry.status)) return
  const node = corpus.node(id)
  if (!node) return
  const policy = corpus.policy
  const deviceNames = new Set(deviceAxes(policy, node).map((axis) => axisName(axis.name)))
  const stateAxes = Object.entries(node.properties ?? {}).filter(
    ([name, definition]) => definition?.type === "VARIANT" && !deviceNames.has(axisName(name)),
  )
  if (!stateAxes.length) return
  const siblings = corpus.of(id)
  if (!siblings.length) {
    skipped.push({ nodeId: id, reason: "no sibling case" })
    return
  }
  const pointed = corpus.pointed(id)
  const missingDevices = new Set(deviceRows.get(id)?.missing ?? [])
  const stateTokens = new Set(stateAxes.map(([name]) => axisName(name)))
  const sibling = siblings.find((item) => !isDraftCase(item)) ?? siblings[0]
  for (const variant of node.variants ?? [])
    proposeStateVariant(
      id,
      variant,
      sibling,
      pointed,
      missingDevices,
      stateTokens,
      corpus,
      proposedIds,
      proposals,
      skipped,
    )
}

function proposeStateVariant(
  id: string,
  variant: NonNullable<InventoryNode["variants"]>[number],
  sibling: ParityCase,
  pointed: ReadonlySet<string>,
  missingDevices: Set<string>,
  stateTokens: Set<string>,
  corpus: CaseCorpus,
  proposedIds: Set<string>,
  proposals: CaseProposal[],
  skipped: CaseSkip[],
) {
  if (pointed.has(variant.nodeId)) return
  if (variant.device && missingDevices.has(variant.device)) {
    skipped.push({
      nodeId: id,
      variant: variant.nodeId,
      reason: `device ${variant.device} waits for its device case`,
    })
    return
  }
  const values = Object.entries(variantState(variant.name))
    .filter(([key]) => stateTokens.has(axisName(key)))
    .map(([, value]) => value)
  if (!values.length) return
  const spec = stateProposal(id, sibling, variant, values)
  // The id is the identity `saveCase` replaces on: a proposal must never
  // take the identity of a reviewed case, and one run must not propose two
  // variants under the same identity (two records can share a state and a
  // device, e.g. two source spellings of the same canonical device).
  const identity = caseIdFor(spec)
  const owner = corpus.byId.get(identity)
  if (proposedIds.has(identity)) {
    skipped.push({
      nodeId: id,
      variant: variant.nodeId,
      reason: `identity ${identity} already proposed by another variant`,
    })
    return
  }
  if (owner && !isDraftCase(owner)) {
    skipped.push({
      nodeId: id,
      variant: variant.nodeId,
      reason: `identity ${identity} is owned by a reviewed case`,
    })
    return
  }
  proposedIds.add(identity)
  proposals.push(spec)
}

function stateProposal(
  id: string,
  sibling: ParityCase,
  variant: NonNullable<InventoryNode["variants"]>[number],
  values: string[],
): CaseProposal {
  const width = variant.box?.width
  const spec: CaseProposal = {
    nodeId: id,
    export: sibling.export,
    storyId: sibling.storyId,
    state: values.join("|"),
    variant: variant.nodeId,
    ...(variant.device ? { device: variant.device } : {}),
    ...(width ? { width, viewport: width } : {}),
    ...(sibling.root ? { root: sibling.root } : {}),
    ...(sibling.subjectRoot ? { subjectRoot: sibling.subjectRoot } : {}),
    ...(sibling.offsetOrigin ? { offsetOrigin: sibling.offsetOrigin } : {}),
    ...(sibling.subjects ? { subjects: { ...sibling.subjects } } : {}),
    ...(sibling.compareOffset ? { compareOffset: true } : {}),
    ...(sibling.compareBox ? { compareBox: sibling.compareBox } : {}),
    ...(sibling.compareText ? { compareText: true } : {}),
    ...(sibling.interactive ? { interactive: true } : {}),
    ...(sibling.depth ? { depth: sibling.depth } : {}),
    note: DRAFT_NOTE,
  }
  return spec
}

function deviceProposal(
  nodeId: string,
  sibling: ParityCase,
  device: string,
  value: string | undefined,
  width: number | undefined,
  otherTokens: string[],
): CaseProposal {
  return {
    nodeId,
    export: sibling.export,
    storyId: sibling.storyId,
    state: [value ?? device, ...otherTokens].join("|"),
    device,
    ...(width ? { width, viewport: width } : {}),
    ...(sibling.root ? { root: sibling.root } : {}),
    ...(sibling.subjectRoot ? { subjectRoot: sibling.subjectRoot } : {}),
    ...(sibling.offsetOrigin ? { offsetOrigin: sibling.offsetOrigin } : {}),
    ...(sibling.subjects ? { subjects: { ...sibling.subjects } } : {}),
    ...(sibling.compareOffset ? { compareOffset: true } : {}),
    ...(sibling.compareBox ? { compareBox: sibling.compareBox } : {}),
    ...(sibling.compareText ? { compareText: true } : {}),
    ...(sibling.interactive ? { interactive: true } : {}),
    ...(sibling.depth ? { depth: sibling.depth } : {}),
    note: DRAFT_NOTE,
  }
}

function axisName(name: string): string {
  return axisToken(name).toLowerCase()
}
