// Figma parity — registry cases.
//
// Joins the reviewed registry (`registry.json`) with the story files it points
// at: the case list the queue prints and the defaults `check` uses. Story ids
// come from the Storybook slug of the story title plus the export name, the same
// identity the iframe URL needs (`components-inputs-textfield--playground`).
import fs from "node:fs"
import path from "node:path"

import {
  LAYOUT_SCOPES,
  UNKNOWN_DEVICE,
  axisToken,
  deviceAxes,
  deviceOf,
  loadDevicePolicy,
  loadInventoryNodes as loadInventory,
  requiredDevices,
} from "../figma/devices.ts"
import { storyDesignNodes, storyTitle } from "../lib/source-modules.ts"
import { absolutePath, rootPath } from "../lib/paths.ts"
import { readJson } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import {
  RegistrySchema,
  type InventoryNode,
  type Registry,
  type RegistryEntry,
} from "../schemas/catalogue.ts"
import { DeviceExceptionsSchema } from "../schemas/devices.ts"
import { ParityCaseFileSchema, ParityCaseSchema, type ParityCase } from "../schemas/parity.ts"

export const REGISTRY_PATH = "src/catalog/figma/registry.json"
export const INVENTORY_PATH = "src/catalog/figma/inventory.json"
export const CASES_PATH = "src/catalog/figma/parity-cases.json"
export const DEVICE_EXCEPTIONS_PATH = "src/catalog/figma/device-exceptions.json"

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

export function loadRegistry(file: string = rootPath(REGISTRY_PATH)): Registry {
  return parseSchema(RegistrySchema, readJson(file), file)
}

// One case per registry target: the identity, the declared story exports and
// the Design-panel nodes each export shows. A target without a story (the
// mocked templates before their wave, a node whose evidence is still missing)
// is listed with an empty story set: that absence is the signal.
export type CaseRow = {
  nodeId: string
  status: string
  module: string
  export: string
  additionalTargets: Array<{ module: string; export: string }>
  story: string | null
  title: string | null
  exports: string[]
  storyIds: string[]
  design: Record<string, string[] | undefined>
}

export type CaseList = CaseRow[] & { missing: Array<{ nodeId: string; story: string }> }

export function buildCases({
  registry = loadRegistry(),
  statuses = ["pending", "implemented"],
}: { registry?: Registry; statuses?: string[] } = {}): CaseList {
  const wanted = new Set(statuses)
  const titles = new Map<string, string | undefined>()
  const designs = new Map<string, ReturnType<typeof storyDesignNodes>>()
  const cases: CaseRow[] = []
  const missing: Array<{ nodeId: string; story: string }> = []
  for (const [nodeId, entry] of Object.entries(registry.entries ?? {})) {
    const target = entry.target
    if (!target || !wanted.has(entry.status)) continue
    if (!target.story) {
      cases.push({
        nodeId,
        status: entry.status,
        module: target.module,
        export: target.export,
        additionalTargets: target.additionalTargets ?? [],
        story: null,
        title: null,
        exports: [],
        storyIds: [],
        design: {},
      })
      continue
    }
    const file = target.story
    if (!fs.existsSync(absolutePath(file))) {
      // A registry pointer to a deleted story is a dangling reference, not a
      // silent skip: the queue reports it.
      missing.push({ nodeId, story: file })
      continue
    }
    if (!titles.has(file)) titles.set(file, storyTitle(file))
    if (!designs.has(file)) designs.set(file, storyDesignNodes(file))
    const title = titles.get(file)
    if (!title) continue
    const exports = target.storyExports ?? []
    cases.push({
      nodeId,
      status: entry.status,
      module: target.module,
      export: target.export,
      additionalTargets: target.additionalTargets ?? [],
      story: file,
      title,
      exports,
      storyIds: exports.map((name) => storyId(title, name)),
      design: Object.fromEntries(
        exports.map((name) => [
          name,
          [...(designs.get(file)?.stories.get(name) ?? designs.get(file)?.meta ?? new Set())],
        ]),
      ),
    })
  }
  cases.sort((a, b) => a.nodeId.localeCompare(b.nodeId, undefined, { numeric: true }))
  return Object.assign(cases, { missing })
}

// ------------------------------------------------------- the reviewed corpus

// The corpus is the committed record of *how* each variant was compared; the
// registry stays the record of *what* the node maps to. Absent file, empty
// corpus: the queue reports the coverage instead of failing.
export function loadCaseFile(file: string = rootPath(CASES_PATH)): ParityCase[] {
  if (!fs.existsSync(file)) return []
  return parseSchema(ParityCaseFileSchema, readJson(file), file)
}

// The inventory as the corpus reads it: the full node records, because a case's
// `device` must be checkable against the variants the node declares (RA3).
export function loadInventoryNodes(file: string = rootPath(INVENTORY_PATH)): InventoryNode[] {
  return loadInventory(file)
}

// Fan-in: how many inventory components depend on a node. A fix in a shared
// part lands before the components that contain it, so the queue can order the
// work by reuse instead of by node id.
export function fanInCounts(nodes: InventoryNode[] = loadInventoryNodes()): Map<string, number> {
  const counts = new Map<string, number>()
  for (const node of nodes) {
    for (const dependency of node.dependencies ?? []) {
      if (dependency.external) continue
      counts.set(dependency.nodeId, (counts.get(dependency.nodeId) ?? 0) + 1)
    }
  }
  return counts
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

// Canonical field order, empty collections dropped: the writer and the reviewer
// see the same file.
export function canonicalCase(
  spec: Partial<ParityCase> & Pick<ParityCase, "nodeId">,
  id?: string,
): ParityCase {
  const entry: Record<string, unknown> = {}
  const source: Record<string, unknown> = { ...spec }
  for (const field of CASE_FIELDS) {
    const value = field === "id" ? (id ?? spec.id ?? caseIdFor(spec)) : source[field]
    if (value === undefined || value === null) continue
    if (Array.isArray(value) && !value.length) continue
    if (value === false) continue
    entry[field] = value
  }
  return parseSchema(ParityCaseSchema, entry, "parity case")
}

export function findCase(cases: ParityCase[], id: string): ParityCase {
  const entry = cases.find((item) => item.id === id)
  if (!entry) {
    const known = cases.map((item) => item.id).join(", ") || "none"
    throw new Error(`${id}: no case with that id in the corpus (known: ${known})`)
  }
  return entry
}

// Appends or replaces one entry and writes the file back in canonical order.
// A refined mapping must be saved through this path, never by hand-editing a
// command line into the report (the pre-2026-10-15 way).
//
// The id is the corpus identity and the key is the comparison: a refinement
// replaces on either. Without the id rule, gaining a `device` (or a `layoutScope`
// with a device) would change the key and append a second entry under the same
// id — the corpus must stay addressable by `--case <id>` (R5).
export function saveCase(
  file: string,
  spec: Partial<ParityCase> & Pick<ParityCase, "nodeId">,
  { id }: { id?: string } = {},
): { file: string; entry: ParityCase; replaced: boolean; total: number } {
  const cases = loadCaseFile(file)
  const entry = canonicalCase(spec, id)
  const index = cases.findIndex((item) => item.id === entry.id || caseKey(item) === caseKey(entry))
  if (index >= 0) cases[index] = entry
  else cases.push(entry)
  const ordered = [...cases].sort((a, b) =>
    caseKey(a).localeCompare(caseKey(b), undefined, { numeric: true }),
  )
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(ordered, null, 2)}\n`)
  return { file, entry, replaced: index >= 0, total: ordered.length }
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
// exactly one of the node's variants matches it.
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

// Hermetic validation: no snapshot, no browser. The corpus may only reference
// nodes the inventory knows and story exports the registry declares; when the
// registry declares none (a node reviewed before the story exports were
// recorded) the case carries the story id and the check warns instead of
// failing.
export function validateCaseFile(
  cases: ParityCase[],
  {
    registry = loadRegistry(),
    nodes = loadInventoryNodes(),
    policy = loadDevicePolicy(),
  }: {
    registry?: Registry
    nodes?: Array<InventoryNode | string>
    policy?: ReturnType<typeof loadDevicePolicy>
  } = {},
): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const seen = new Set<string>()
  const byNode = new Map<string, InventoryNode | undefined>()
  for (const node of Array.isArray(nodes) ? nodes : [...nodes]) {
    if (typeof node === "string") byNode.set(node, undefined)
    else byNode.set(node.nodeId, node)
  }
  for (const entry of cases) {
    const where = entry?.id ?? entry?.nodeId ?? "(entry without id)"
    const fail = (message: string): void => {
      errors.push(`${where}: ${message}`)
    }
    if (!SELECTOR(entry?.id)) fail("a case needs a non-empty id")
    else if (seen.has(entry.id)) fail("duplicate case id")
    else seen.add(entry.id)
    if (!/^\d+:\d+$/.test(String(entry?.nodeId ?? ""))) fail("nodeId must look like 529:6111")
    else if (!byNode.has(entry.nodeId)) fail(`${entry.nodeId} is not in inventory.json`)
    if (!SELECTOR(entry?.export)) fail("export is required")
    if (entry?.storyId != null && !/^[a-z0-9-]+--[a-z0-9-]+$/.test(String(entry.storyId))) {
      fail("storyId must look like components-inputs-textfield--playground")
    }
    if (entry?.variant != null && !/^\d+:\d+$/.test(String(entry.variant))) {
      fail("variant must be a node id")
    }
    // The device dimension (RA3): the field names a canonical device the policy
    // declares, and it cannot contradict the variant the case points at.
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
        const variant = variantOfCase(byNode.get(entry.nodeId), entry)
        if (variant && variant.device && variant.device !== entry.device) {
          fail(
            `device "${entry.device}" contradicts the variant ${variant.nodeId} ` +
              `(${variant.name}), which declares "${variant.device}"`,
          )
        }
      }
    }
    if (entry?.layoutScope != null && !LAYOUT_SCOPES.includes(entry.layoutScope)) {
      fail(`layoutScope must be one of ${LAYOUT_SCOPES.join(" | ")}`)
    }
    const selectorFields = [
      "state",
      "root",
      "subjectRoot",
      "offsetOrigin",
      "stateEvidence",
    ] as const
    for (const field of selectorFields) {
      if (entry?.[field] != null && !SELECTOR(entry[field]))
        fail(`${field} must be a selector or a state name`)
    }
    const numericFields = ["width", "viewport", "height", "depth"] as const
    for (const field of numericFields) {
      if (entry?.[field] != null && !NUMBER(entry[field]))
        fail(`${field} must be a positive number`)
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
    const known = registry.entries?.[entry?.nodeId]
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
    const declaredStories = registryStoryIds(known)
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
  return { errors, warnings }
}

// The story ids a registry entry declares, resolved through the same join the
// queue uses (the story title and the declared exports, cached per file).
const titleCache = new Map<string, string | undefined>()

function registryStoryIds(entry: RegistryEntry | undefined): string[] {
  if (!entry?.target?.story || !entry?.target?.storyExports?.length) return []
  const file = entry.target.story
  if (!titleCache.has(file))
    titleCache.set(file, fs.existsSync(absolutePath(file)) ? storyTitle(file) : undefined)
  const title = titleCache.get(file)
  if (!title) return []
  return entry.target.storyExports.map((name: string) => storyId(title, name))
}

// ------------------------------------------------------ device coverage (RA3)

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

export function deviceCoverage({
  policy = loadDevicePolicy(),
  nodes = loadInventoryNodes(),
  registry = loadRegistry(),
  cases = [],
  statuses = ["implemented", "pending"],
}: {
  policy?: ReturnType<typeof loadDevicePolicy>
  nodes?: InventoryNode[]
  registry?: Registry
  cases?: ParityCase[]
  statuses?: string[]
} = {}): DeviceCoverage {
  const wanted = new Set(statuses)
  const byNode = new Map(nodes.map((node) => [node.nodeId, node]))
  const rows: CoverageRow[] = []
  for (const [nodeId, entry] of Object.entries(registry.entries ?? {})) {
    const node = byNode.get(nodeId)
    if (!node) continue
    const declared = requiredDevices(policy, node)
    if (!declared.length) continue
    const matching = (device: string): ParityCase[] =>
      cases.filter((item) => item.nodeId === nodeId && item.device === device)
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

// The reasoned exceptions (RA4): one node id per entry, a non-empty reason, and
// nothing else. The file is a burn-down list: an entry whose node no longer
// misses a device is an error, not a permission that lingers.
export function loadDeviceExceptions(
  file: string = rootPath(DEVICE_EXCEPTIONS_PATH),
): Record<string, string> {
  if (!fs.existsSync(file)) return {}
  return parseSchema(DeviceExceptionsSchema, readJson(file), file)
}

// ------------------------------------------------------- device case proposals

// What `cases --sync` proposes (RA6): for a node that declares more devices than
// the corpus covers and already has a sibling case, the missing device case —
// the sibling's selector mapping over the device's own variant, at the variant's
// own width. The mapping is a draft by construction (R9): the note says so, the
// coverage ignores it, and the wave replaces both after the reviewed render.
export function syncProposals({
  policy = loadDevicePolicy(),
  nodes = loadInventoryNodes(),
  registry = loadRegistry(),
  cases = [],
  nodeId,
  statuses = ["implemented", "pending"],
}: {
  policy?: ReturnType<typeof loadDevicePolicy>
  nodes?: InventoryNode[]
  registry?: Registry
  cases?: ParityCase[]
  nodeId?: string
  statuses?: string[]
} = {}) {
  const coverage = deviceCoverage({ policy, nodes, registry, cases, statuses })
  const byNode = new Map(nodes.map((node) => [node.nodeId, node]))
  const proposals: CaseProposal[] = []
  const skipped: Array<{ nodeId: string; variant?: string; missing?: string[]; reason: string }> =
    []
  for (const row of coverage.rows) {
    if (nodeId && row.nodeId !== nodeId) continue
    if (!row.missing.length) continue
    const siblings = cases.filter((item) => item.nodeId === row.nodeId)
    if (!siblings.length) {
      // Nothing to copy: the first case of a node needs the review, not a
      // template.
      skipped.push({ nodeId: row.nodeId, missing: row.missing, reason: "no sibling case" })
      continue
    }
    const sibling = siblings.find((item) => !isDraftCase(item)) ?? siblings[0]
    const node = byNode.get(row.nodeId)
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
    const variantFor = (device: string) => {
      const candidates = (node?.variants ?? []).filter((item) => item.device === device)
      const exact = siblingDeviceToken
        ? candidates.find((item) => item.name.includes(siblingDeviceToken))
        : undefined
      if (exact) return exact
      if (!reference) return candidates[0]
      return [...candidates].sort(
        (a, b) =>
          Math.abs((a.box?.width ?? 0) - reference) - Math.abs((b.box?.width ?? 0) - reference),
      )[0]
    }
    for (const device of row.missing) {
      const variant = variantFor(device)
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
      proposals.push({
        nodeId: row.nodeId,
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
      })
    }
  }
  const states = stateProposals({ policy, nodes, registry, cases, nodeId, statuses, coverage })
  return {
    proposals,
    skipped,
    stateProposals: states.proposals,
    stateSkipped: states.skipped,
    coverage,
  }
}

// ------------------------------------------------- state/property case proposals

// The variants a non-draft case points at: the `variant` id when the case
// carries one, else the `state` tokens applied to the variants the case's
// device narrows to — the same reading `check` applies (`--device` narrows the
// set, then `--state` picks one record). A draft points nowhere: it still waits
// for the reviewed render, so it never silently shrinks the work list.
export function pointedVariants(node: InventoryNode, cases: ParityCase[]): Set<string> {
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

// The companion of the device proposals: for a node whose corpus already has a
// case, one draft per variant no reviewed case points at, so the states and the
// visual properties of the set enter the burn-down like the devices. The draft
// copies the sibling mapping and pins the variant, its device and its width; the
// note keeps it out of the coverage (R9). A variant whose device still misses
// its own case is left to the device proposal, which owns the first capture at
// that width.
export type CaseProposal = Partial<ParityCase> & Pick<ParityCase, "nodeId" | "export">

export function stateProposals({
  policy = loadDevicePolicy(),
  nodes = loadInventoryNodes(),
  registry = loadRegistry(),
  cases = [],
  nodeId,
  statuses = ["implemented", "pending"],
  coverage,
}: {
  policy?: ReturnType<typeof loadDevicePolicy>
  nodes?: InventoryNode[]
  registry?: Registry
  cases?: ParityCase[]
  nodeId?: string
  statuses?: string[]
  coverage?: DeviceCoverage
} = {}): {
  proposals: CaseProposal[]
  skipped: Array<{ nodeId: string; variant?: string; missing?: string[]; reason: string }>
} {
  const wanted = new Set(statuses)
  const byNode = new Map(nodes.map((item) => [item.nodeId, item]))
  const deviceRows = new Map(
    (coverage ?? deviceCoverage({ policy, nodes, registry, cases, statuses })).rows.map((row) => [
      row.nodeId,
      row,
    ]),
  )
  const proposals: CaseProposal[] = []
  const skipped: Array<{ nodeId: string; variant?: string; missing?: string[]; reason: string }> =
    []
  const proposedIds = new Set()
  const corpusIds = new Map(cases.map((item) => [item.id, item]))
  const token = (name: string): string => axisToken(name).toLowerCase()
  for (const [id, entry] of Object.entries(registry.entries ?? {})) {
    if (nodeId && id !== nodeId) continue
    if (!wanted.has(entry.status)) continue
    const node = byNode.get(id)
    if (!node) continue
    const deviceNames = new Set(deviceAxes(policy, node).map((axis) => token(axis.name)))
    const stateAxes = Object.entries(node.properties ?? {}).filter(
      ([name, definition]) => definition?.type === "VARIANT" && !deviceNames.has(token(name)),
    )
    if (!stateAxes.length) continue
    const siblings = cases.filter((item) => item.nodeId === id)
    if (!siblings.length) {
      skipped.push({ nodeId: id, reason: "no sibling case" })
      continue
    }
    const pointed = pointedVariants(node, siblings)
    const missingDevices = new Set(deviceRows.get(id)?.missing ?? [])
    const stateTokens = new Set(stateAxes.map(([name]) => token(name)))
    const sibling = siblings.find((item) => !isDraftCase(item)) ?? siblings[0]
    for (const variant of node.variants ?? []) {
      if (pointed.has(variant.nodeId)) continue
      if (variant.device && missingDevices.has(variant.device)) {
        skipped.push({
          nodeId: id,
          variant: variant.nodeId,
          reason: `device ${variant.device} waits for its device case`,
        })
        continue
      }
      const values = Object.entries(variantState(variant.name))
        .filter(([key]) => stateTokens.has(token(key)))
        .map(([, value]) => value)
      if (!values.length) continue
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
      // The id is the identity `saveCase` replaces on: a proposal must never
      // take the identity of a reviewed case, and one run must not propose two
      // variants under the same identity (two records can share a state and a
      // device, e.g. two source spellings of the same canonical device).
      const identity = caseIdFor(spec)
      const owner = corpusIds.get(identity)
      if (proposedIds.has(identity)) {
        skipped.push({
          nodeId: id,
          variant: variant.nodeId,
          reason: `identity ${identity} already proposed by another variant`,
        })
        continue
      }
      if (owner && !isDraftCase(owner)) {
        skipped.push({
          nodeId: id,
          variant: variant.nodeId,
          reason: `identity ${identity} is owned by a reviewed case`,
        })
        continue
      }
      proposedIds.add(identity)
      proposals.push(spec)
    }
  }
  return { proposals, skipped }
}

// The axis a device came from on this set: the source may spell it `Device`,
// `Breakpoint`, `Layout` or something else (`Property 1`). The token is what the
// variant name carries, without the property key's `#id` suffix.
function axisOfDevice(
  policy: ReturnType<typeof loadDevicePolicy>,
  node: InventoryNode | undefined,
  device: string,
): string | undefined {
  if (!node) return undefined
  for (const axis of deviceAxes(policy, node)) {
    if (axis.values.some((item) => item.device === device)) return axis.token
  }
  return undefined
}
