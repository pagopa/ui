#!/usr/bin/env node

// Figma parity — CLI.
//
//   queue    work list: registry cases with their story ids, Design-panel nodes
//            and the exports still undeclared (local files only)
//   check    one case: source spec, render capture, classified diff
//   capture  a wave: run a case list (or the registry filter) and write the
//            per-case probe/report and one summary into `--out`
//   report   aggregate a wave directory into a committed markdown + the JSON
//
// Exit codes: 0 clean, 1 deltas above tolerance, 2 invalid input or missing
// evidence. Missing evidence never becomes a pass.
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import {
  LAYOUT_SCOPES,
  loadDevicePolicy,
  loadInventoryNodes,
  requiredDevices,
  variantDevice,
} from "../figma/devices.ts"
import {
  buildCases,
  caseIdFor,
  type CaseRow,
  deviceCoverage,
  findCase,
  isDraftCase,
  loadCaseFile,
  loadRegistry,
  saveCase,
  syncProposals,
  validateCaseFile,
} from "./cases.ts"
import {
  compare,
  compositionSignature,
  formatResult,
  type Delta,
  type SourceSubject,
} from "./diff.ts"
import { enterRoot, rootPath } from "../lib/paths.ts"
import { parseSchema } from "../lib/validate.ts"
import { capture as captureStory, DEFAULT_ROOT, type CaptureOptions } from "./render.ts"
import { checkCaseEvidence, checkEvidence, evidenceCommand } from "./evidence.ts"
import {
  loadExport,
  namedLeaves,
  nodeSpec,
  offsetBetween,
  pickVariant,
  sourceNode,
  variantsOf,
  variantsWhere,
  type Project,
  type RawNode,
  type SpecNode,
  type VariantInfo,
} from "./source.ts"
import type { ParityCase } from "../schemas/parity.ts"

type Flags = Map<string, string | boolean>
type Parsed = {
  flags: Flags
  subjects: string[]
  residues: string[]
  ignores: string[]
  fill: string[]
  click: string[]
  focus: string[]
}

type CaseSpec = Partial<ParityCase> & {
  nodeId: string
  export: string
  storyId: string
  id?: string
  screenshot?: string
  strict?: boolean
}
type CaseReport = {
  nodeId: string
  variant: string
  variantName: string
  device: string | null
  storyId: string
  verdict: string
  deltas: Delta[]
  advisories: Delta[]
  residues: Array<Delta & { reason: string }>
  notes: Array<{ path: string; note: unknown }>
  responsive?: unknown
  scope?: Scope
  capture?: {
    dpr: number
    rulerWidth: number
    rootWidth: number
    focus?: string
    offsetOrigin?: string
    state?: { state?: string; ok?: boolean }
  }
  [key: string]: unknown
}
type Scope = {
  declared: string
  changed: Record<string, boolean>
  probes: number[]
  changedAt: number[]
  widthTarget: string | undefined
}

const DEFAULT_WAVE_DIR = rootPath(".figma/parity")
const DEFAULT_CASES = rootPath("src/catalog/figma/parity-cases.json")

// The widths the declared scope is verified against (RA5): the composition the
// case declares must follow the axis it declares. Two far values, one on each
// side of the library's breakpoints, because a single alternate can land in the
// same branch as the declared one and prove nothing (a container breakpoint at
// 32rem is crossed by 1200, not by 900).
const SCOPE_PROBES = [360, 1200]

const USAGE = `usage:
  figma-parity queue [--status pending,implemented] [--node <id>] [--cases <file>] [--unmapped] [--coverage] [--uncovered] [--json]
  figma-parity check --node <id> | --case <caseId> [--cases <file>]
    [--state filled|empty|<declared state>] [--variant <nodeId>] [--device <key>]
    [--layout-scope viewport|container] [--story <storyId>]
    [--width <px>] [--root <selector>] [--offset-origin <selector>]
    [--subject-root <source layer>] [--subject "<layer>=<selector>" ...]
    [--fill "<selector>=<value>" ...] [--click <selector> ...] [--focus <selector> ...]
    [--blur] [--keep-focus] [--expect-state <state>] [--state-evidence <selector>]
    [--compare-text] [--compare-box [height|full]] [--compare-offset] [--interactive]
    [--strict] [--save-case] [--note <text>]
    [--residue "<path>=<reason>" ...] [--ignore <path> ...]
    [--viewport <px>] [--height <px>] [--screenshot <file>] [--depth <n>] [--notes] [--json]
  figma-parity check --node <id> --devices [--cases <file>] [--json]
  figma-parity capture [--cases <file.json>] [--status pending] [--node <id,id>]
    [--device <key>] [--note <text>] [--limit <n>] [--include-catalogue] [--out <directory>]
    [--strict] [--dry-run]
  figma-parity cases --sync [--node <id>] [--dry-run] [--cases <file>]
  figma-parity evidence --write [--input <file>] | --check
  figma-parity verify [--cases <file>] [--json]
  figma-parity report --wave <name> [--dir <directory>] [--out <markdown>]

Profiles: the default verdict is the reviewed one (2px per property, residues with
a reason). Composition evidence (--compare-offset) is reported as ADVISORY and only
--strict promotes it into the verdict. The responsive verdict (RA5) is a delta: a
clipped box, paint outside the root, text lost to an ellipsis or a wrapped band
fails the case unless a residue records the adaptation. Exit codes: 0 verified, 1
deltas above tolerance, 2 invalid input or missing evidence.`

function parse(argv: string[]): Parsed {
  const flags: Flags = new Map()
  const subjects: string[] = []
  const residues: string[] = []
  const ignores: string[] = []
  // The interaction flags repeat: `--click` opens the popup, a second
  // `--click` picks the option before the probe runs.
  const fill: string[] = []
  const click: string[] = []
  const focus: string[] = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--subject") subjects.push(argv[++index])
    else if (arg === "--residue") residues.push(argv[++index])
    else if (arg === "--ignore") ignores.push(argv[++index])
    else if (arg === "--fill") fill.push(argv[++index])
    else if (arg === "--click") click.push(argv[++index])
    else if (arg === "--focus") focus.push(argv[++index])
    else if (arg === "--help" || arg === "-h") flags.set("help", true)
    else if (arg.startsWith("--")) {
      const name = arg.slice(2)
      const value = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : true
      flags.set(name, value)
    }
  }
  return { flags, subjects, residues, ignores, fill, click, focus }
}

function pairs(values: string[]): Array<[string, string]> {
  return values.map((value) => {
    const index = value.indexOf("=")
    if (index < 0) throw new Error(`${value}: expected key=value`)
    return [value.slice(0, index), value.slice(index + 1)]
  })
}

function statusesFrom(flags: Flags, fallback = "pending"): string[] {
  return String(flags.get("status") ?? fallback)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

function waveDir(flags: Flags): string {
  return String(flags.get("dir") ?? DEFAULT_WAVE_DIR)
}

// The device vocabulary and the inventory: the CLI resolves a `--device` (or a
// case's `device`) against what the set declares, never against a list here.
let policyCache: ReturnType<typeof loadDevicePolicy> | null = null
let inventoryCache: ReturnType<typeof loadInventoryNodes> | null = null

function devicePolicy(): ReturnType<typeof loadDevicePolicy> {
  if (!policyCache) policyCache = loadDevicePolicy()
  return policyCache
}

function inventoryNodes(): ReturnType<typeof loadInventoryNodes> {
  if (!inventoryCache) inventoryCache = loadInventoryNodes()
  return inventoryCache
}

function inventoryNode(nodeId: string): ReturnType<typeof inventoryNodes>[number] | undefined {
  return inventoryNodes().find((node) => node.nodeId === nodeId)
}

// `--device mobile` narrows a set to the variants that declare that device (RA1)
// before the state rules apply: the review names the device instead of reading
// the first variant, which is the desktop one.
function deviceNarrowing(spec: CaseSpec, node: RawNode): RawNode | undefined {
  if (!spec.device) return undefined
  const inventory = inventoryNode(spec.nodeId)
  const declared = inventory ? requiredDevices(devicePolicy(), inventory) : []
  if (!declared.length) {
    throw new Error(`${spec.nodeId} declares no device: --device has nothing to resolve`)
  }
  if (!declared.includes(spec.device)) {
    throw new Error(
      `${spec.nodeId} declares ${declared.join(", ")}: "${spec.device}" is not among them`,
    )
  }
  if (!inventory) throw new Error(`${spec.nodeId} is not in inventory.json`)
  return variantsWhere(
    node,
    (name) => variantDevice(devicePolicy(), inventory, name).device === spec.device,
  )
}

// The variant a case captures: `--variant` is explicit, `--device` narrows the
// set, `--state` selects inside it. The resolved device is returned with it so
// the report always names the device it compared.
function resolveVariant(spec: CaseSpec, node: RawNode): VariantInfo {
  if (spec.variant) {
    const variant = pickVariant(node, { variant: spec.variant })
    const inventory = inventoryNode(spec.nodeId)
    if (spec.device && inventory) {
      const declared = variantDevice(devicePolicy(), inventory, variant.name).device
      if (declared !== spec.device) {
        throw new Error(
          `variant ${variant.nodeId} (${variant.name}) declares "${declared ?? "no device"}": ` +
            `it contradicts --device ${spec.device}`,
        )
      }
    }
    return variant
  }
  const narrowed = deviceNarrowing(spec, node)
  if (narrowed && !(narrowed.children ?? []).length) {
    throw new Error(`${spec.nodeId} has no variant that declares "${spec.device}"`)
  }
  return pickVariant(narrowed ?? node, { state: spec.state })
}

function declaredDeviceOf(spec: CaseSpec, variant: VariantInfo): string | undefined {
  if (spec.device) return spec.device
  const inventory = inventoryNode(spec.nodeId)
  if (!inventory) return undefined
  return variantDevice(devicePolicy(), inventory, variant.name).device ?? undefined
}

// The source frames whose padding the case does not compare: the root box alone
// does not prove the inner insets, so the per-node loop names the layers to
// map. Padding only keeps the nudge to the visible insets (the root gap is
// already compared); the reviewer decides which frame drives the composition.
function mappingGaps(root: SpecNode, mapped: string[]): string[] {
  const names = new Set(mapped)
  const found: string[] = []
  const walk = (node: SpecNode): void => {
    for (const child of node.children ?? []) {
      const padded = Boolean(child.layout?.padding.some((value) => value > 0))
      if (child.type !== "TEXT" && padded && !names.has(child.name)) {
        found.push(`${child.name} (${child.nodeId})`)
      }
      walk(child)
    }
  }
  walk(root)
  return [...new Set(found)]
}

// One case: the source variant, the story, the subject mapping and the stated
// residues in, the classified report and the probe out.
const CaptureInfoSchema = z.looseObject({
  dpr: z.number(),
  rulerWidth: z.number(),
  rootWidth: z.number(),
  focus: z.string().optional(),
  offsetOrigin: z.string().optional(),
  state: z.looseObject({ state: z.string().optional(), ok: z.boolean().optional() }).optional(),
})

async function evaluateCase(
  spec: CaseSpec,
  { project }: { project: Project },
): Promise<{ report: CaseReport; probe: Record<string, unknown>; mapping: string[] }> {
  const node = sourceNode(project, spec.nodeId)
  if (!node) throw new Error(`${spec.nodeId} is not in the pinned export`)
  const variant = resolveVariant(spec, node)
  const variantNode = sourceNode(project, variant.nodeId)
  if (!variantNode) throw new Error(`${variant.nodeId} is not in the pinned export`)
  const spec_ = nodeSpec(variantNode, { depth: spec.depth ?? 3 })
  const rootWidth = Number(spec.width ?? variant.box?.width ?? 0)
  if (!rootWidth) throw new Error(`${variant.nodeId} has no box: pass a width`)

  // The story root is always forced to the source width; `root` chooses the
  // element the variant is compared against (the story wrapper only when the
  // component fills it).
  const selectors: Record<string, string> = { field: spec.root ?? DEFAULT_ROOT }
  const rootSubject = spec.subjectRoot ? namedLeaves(spec_, spec.subjectRoot)[0] : undefined
  if (spec.subjectRoot && !rootSubject) {
    throw new Error(`${spec.subjectRoot}: no source layer with that name in ${variant.nodeId}`)
  }
  // The source origin of the composition check: the same layer the case maps to
  // its root element, so the two offsets describe the same relationship.
  const sourceOrigin = rootSubject ?? spec_
  const sources: Record<string, SourceSubject> = {
    field: { ...sourceOrigin, offset: offsetBetween(sourceOrigin, sourceOrigin) },
  }
  for (const [name, selector] of Object.entries(spec.subjects ?? {})) {
    const matches = namedLeaves(spec_, name)
    const leaf = matches.find((item) => item.text) ?? matches[0]
    if (!leaf) throw new Error(`${name}: no source layer named "${name}" in ${variant.nodeId}`)
    sources[name] = { ...leaf, offset: offsetBetween(leaf, sourceOrigin) }
    selectors[name] = selector
  }

  const declaredViewport = Number(spec.viewport ?? rootWidth)
  const runCapture = (overrides: Partial<CaptureOptions>) =>
    captureStory({
      storyId: spec.storyId,
      rootWidth,
      viewport: declaredViewport,
      viewportHeight: spec.height ?? 1400,
      rootSelector: DEFAULT_ROOT,
      // The band structure is measured on the element the case maps as its root
      // (the variant-root counterpart), the story root when it maps none.
      bandRoot: spec.root ?? DEFAULT_ROOT,
      subjects: selectors,
      // The offsets are measured from the element the case declares as its root
      // (the variant-root counterpart), or from an explicit origin selector.
      offsetOrigin:
        typeof spec.compareOffset === "string"
          ? spec.compareOffset
          : (spec.offsetOrigin ?? spec.root),
      screenshot: spec.screenshot,
      fill: (spec.fill ?? []).map(([selector, value]) => [selector, value]),
      click: spec.click ?? [],
      focus: spec.focus ?? [],
      blur: Boolean(spec.blur),
      keepFocus: Boolean(spec.keepFocus),
      expectState: spec.expectState,
      stateEvidence: spec.stateEvidence,
      ...overrides,
    })
  const probe = await runCapture({})
  // The far values the declared axis is probed at: both sides, so a scope that
  // only flips at one of them is still confirmed.
  const probes = (declared: number): number[] =>
    SCOPE_PROBES.filter((value) => value !== Number(declared))

  // The declared scope is verified, not trusted (RA5, R4): a viewport-scoped
  // case must change when only the viewport changes, a container-scoped case
  // when only the root width changes at a fixed viewport — at least at one of
  // the far values. A mismatch is a finding: the declaration and the
  // implementation disagree about what decides the composition.
  let scope: Scope | undefined
  if (spec.layoutScope) {
    const base = compositionSignature(probe)
    const axis =
      spec.layoutScope === "viewport"
        ? { key: "viewport", values: probes(declaredViewport) }
        : { key: "rootWidth", values: probes(rootWidth) }
    const changedAt: number[] = []
    for (const value of axis.values) {
      const other = await runCapture({
        ...(axis.key === "viewport"
          ? { viewport: value }
          : {
              // The container the case declares is the element it maps as its
              // root: the capture forces that box, not a component dimension
              // (R1/R4), and the viewport stays fixed.
              rootWidth: value,
              widthTarget: spec.root,
              expectRootWidth: !spec.root,
            }),
        screenshot: undefined,
      })
      if (compositionSignature(other) !== base) changedAt.push(value)
    }
    scope = {
      declared: spec.layoutScope,
      changed: { [axis.key]: changedAt.length > 0 },
      probes: axis.values,
      changedAt,
      widthTarget: axis.key === "rootWidth" ? (spec.root ?? DEFAULT_ROOT) : undefined,
    }
  }

  const ignored = (spec.ignores ?? []).map((path_: string) => ({
    path: path_,
    reason: "ignored by the case mapping",
  }))
  const result = compare({
    sources,
    probe,
    subject: {
      interactive: Boolean(spec.interactive),
      compareText: Boolean(spec.compareText),
      compareBox: spec.compareBox,
      compareOffset: spec.compareOffset,
    },
    // The band check reads the layer the case maps to its root element (the
    // variant root, or the `subjectRoot` it narrows to) — its layout mode and
    // its children — so a wrapped band is a number, not an opinion.
    band: sourceOrigin,
    scope,
    residues: [...(spec.residues ?? []), ...ignored],
    strict: Boolean(spec.strict),
  })
  return {
    report: {
      nodeId: spec.nodeId,
      variant: variant.nodeId,
      variantName: variant.name,
      device: declaredDeviceOf(spec, variant) ?? null,
      responsive: probe.responsive,
      ...(scope ? { scope } : {}),
      storyId: String(probe.storyId ?? ""),
      variants: variantsOf(node).length,
      capture: probe.capture
        ? parseSchema(CaptureInfoSchema, probe.capture, "capture preflight")
        : undefined,
      ...result,
    },
    probe,
    mapping: mappingGaps(spec_, Object.keys(spec.subjects ?? {})),
  }
}

// The flags of one `check` run as a case spec (the same shape a wave file uses).
function stringFlag(flags: Flags, name: string): string | undefined {
  const value = flags.get(name)
  return typeof value === "string" ? value : undefined
}

function numberFlag(value: unknown): number | undefined {
  if (value === undefined || value === null || value === true) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function caseFromFlags(known: CaseRow | undefined, flags: Flags, parsed: Parsed): CaseSpec {
  const storyId = stringFlag(flags, "story") ?? known?.storyIds?.[0]
  if (!storyId) throw new Error(`${known?.nodeId ?? "case"}: no declared story export to capture`)
  if (!known) throw new Error("case: no registry target")
  const exportName = stringFlag(flags, "export") ?? known.export
  if (!exportName) throw new Error(`${known.nodeId}: no implementation export to capture`)
  return {
    nodeId: stringFlag(flags, "node") ?? known.nodeId,
    export: exportName,
    storyId,
    state: stringFlag(flags, "state"),
    device: deviceFrom(flags.get("device")),
    layoutScope: layoutScopeFrom(flags.get("layout-scope")),
    variant: stringFlag(flags, "variant"),
    // The corpus validator wants numbers: a saved case must not carry the raw
    // command-line strings.
    width: numberFlag(flags.get("width")),
    viewport: numberFlag(flags.get("viewport")),
    height: numberFlag(flags.get("height")),
    root: stringFlag(flags, "root"),
    subjectRoot: stringFlag(flags, "subject-root"),
    offsetOrigin: stringFlag(flags, "offset-origin"),
    subjects: Object.fromEntries(pairs(parsed.subjects)),
    residues: pairs(parsed.residues).map(([path_, reason]) => ({ path: path_, reason })),
    ignores: parsed.ignores,
    fill: pairs(parsed.fill),
    click: parsed.click,
    focus: parsed.focus,
    blur: Boolean(flags.get("blur")),
    keepFocus: Boolean(flags.get("keep-focus")),
    compareText: Boolean(flags.get("compare-text")),
    compareBox: compareBoxFrom(flags.get("compare-box")),
    compareOffset: compareOffsetFrom(flags),
    expectState: stringFlag(flags, "expect-state"),
    stateEvidence: stringFlag(flags, "state-evidence"),
    interactive: Boolean(flags.get("interactive")),
    strict: Boolean(flags.get("strict")),
    note: noteFrom(flags),
    depth: Number(flags.get("depth") ?? 3),
    screenshot: stringFlag(flags, "screenshot"),
  }
}

// `--compare-box` bare means the safe default for a TEXT layer (its height);
// `full` adds the width the bundled font cannot match.
function compareBoxFrom(value: unknown): "height" | "full" | undefined {
  if (value === undefined) return undefined
  if (value === true) return "height"
  if (value === "height" || value === "full") return value
  throw new Error(`--compare-box expects "height" or "full", not ${value}`)
}

// `--device mobile`: the canonical device the policy declares, resolved by
// `evaluateCase` against what the set declares.
function deviceFrom(value: unknown): string | undefined {
  if (value === undefined || value === true) return undefined
  return String(value).trim().toLowerCase()
}

// `--layout-scope viewport|container`: the axis the case expects to decide its
// composition. The tool verifies it (RA5), it does not take it on faith.
function layoutScopeFrom(value: unknown): "viewport" | "container" | undefined {
  if (value === undefined || value === true) return undefined
  if (value !== "viewport" && value !== "container") {
    throw new Error(`--layout-scope expects ${LAYOUT_SCOPES.join(" or ")}, not ${value}`)
  }
  return value
}

// `--compare-offset` enables the composition check; its value (or
// `--offset-origin`) chooses the element the offsets are measured from.
function compareOffsetFrom(flags: Flags): boolean | string | undefined {
  const origin = flags.get("offset-origin")
  if (flags.has("compare-offset")) return flags.get("compare-offset") ?? true
  if (origin !== undefined) return origin === true ? true : origin
  return undefined
}

// `--note <text>`: the review note a refined case carries. It replaces the
// `note: "draft — refine the mapping"` a `cases --sync` proposal wrote, so a
// draft becomes coverage without re-typing the whole mapping (R9: the note is
// what says the render was reviewed).
function noteFrom(flags: Flags): string | undefined {
  const value = flags.get("note")
  return typeof value === "string" && value.trim() ? value : undefined
}

// A case from the reviewed corpus, with the command line overriding the stored
// mapping (a refinement is saved back through `--save-case`).
function specFromCase(entry: ParityCase, flags: Flags, parsed: Parsed): CaseSpec {
  const storyId = stringFlag(flags, "story") ?? entry.storyId ?? ""
  return {
    ...entry,
    nodeId: String(flags.get("node") ?? entry.nodeId),
    storyId: String(storyId),
    state: stringFlag(flags, "state") ?? entry.state,
    device: deviceFrom(flags.get("device")) ?? entry.device,
    layoutScope: layoutScopeFrom(flags.get("layout-scope")) ?? entry.layoutScope,
    variant: stringFlag(flags, "variant") ?? entry.variant,
    width: numberFlag(flags.get("width")) ?? entry.width,
    viewport: numberFlag(flags.get("viewport")) ?? entry.viewport,
    height: numberFlag(flags.get("height")) ?? entry.height,
    root: stringFlag(flags, "root") ?? entry.root,
    subjectRoot: stringFlag(flags, "subject-root") ?? entry.subjectRoot,
    offsetOrigin: stringFlag(flags, "offset-origin") ?? entry.offsetOrigin,
    subjects:
      parsed.subjects.length > 0
        ? Object.fromEntries(pairs(parsed.subjects))
        : (entry.subjects ?? {}),
    residues:
      parsed.residues.length > 0
        ? pairs(parsed.residues).map(([path_, reason]) => ({ path: path_, reason }))
        : (entry.residues ?? []),
    ignores: parsed.ignores.length ? parsed.ignores : (entry.ignores ?? []),
    fill: parsed.fill.length ? pairs(parsed.fill) : (entry.fill ?? []),
    click: parsed.click.length ? parsed.click : (entry.click ?? []),
    focus: parsed.focus.length ? parsed.focus : (entry.focus ?? []),
    blur: flags.has("blur") ? true : entry.blur,
    keepFocus: flags.has("keep-focus") ? true : entry.keepFocus,
    interactive: flags.has("interactive") ? true : entry.interactive,
    compareText: flags.has("compare-text") ? true : entry.compareText,
    compareBox: flags.has("compare-box")
      ? compareBoxFrom(flags.get("compare-box"))
      : entry.compareBox,
    compareOffset:
      flags.has("compare-offset") || flags.has("offset-origin")
        ? compareOffsetFrom(flags)
        : entry.compareOffset,
    expectState: stringFlag(flags, "expect-state") ?? entry.expectState,
    stateEvidence: stringFlag(flags, "state-evidence") ?? entry.stateEvidence,
    // The note a case already carries stays unless `--note <text>` replaces it:
    // a draft stops being a draft exactly through this flag.
    note: noteFrom(flags) ?? entry.note,
    strict: flags.has("strict") ? true : undefined,
    depth: Number(flags.get("depth") ?? entry.depth ?? 3),
    screenshot: stringFlag(flags, "screenshot"),
  }
}

function registryCase(nodeId: string): CaseRow {
  const known = buildCases({ statuses: ["pending", "implemented", "mocked"] }).find(
    (item) => item.nodeId === nodeId,
  )
  if (!known) throw new Error(`${nodeId} has no registry target with a story`)
  return known
}

function printResult(report: CaseReport, { notes }: { notes?: boolean }): void {
  console.log(`${report.nodeId} ${report.variant} "${report.variantName}" -> ${report.storyId}`)
  if (report.device) console.log(`  device ${report.device}`)
  console.log(formatResult(report))
  const responsive = responsiveCounts(report)
  console.log(
    `  responsive: ${responsiveSummary(responsive)}` +
      (report.scope ? ` · scope ${scopeSummary(report.scope)}` : ""),
  )
  if (notes) {
    for (const note of report.notes) console.log(`  note ${note.path}: ${note.note}`)
    const capture = report.capture
    if (capture) {
      console.log(
        `  capture devicePixelRatio ${capture.dpr} · ruler ${capture.rulerWidth}px · root ${capture.rootWidth}px` +
          ` · focus ${capture.focus} · offsets from ${capture.offsetOrigin}` +
          (capture.state ? ` · state ${capture.state.state}: ${capture.state.ok}` : ""),
      )
    }
  }
}

// The responsive findings of one report, split by kind: what the responsive
// verdict added on top of the geometry (RA5). The gating kinds are the deltas;
// a recorded residue keeps the reason visible without gating.
function responsiveCounts(report: CaseReport) {
  const counts: Record<string, number> = {
    clipped: 0,
    escaped: 0,
    truncated: 0,
    scrollable: 0,
    band: 0,
    scope: 0,
    residues: 0,
  }
  for (const delta of report.deltas ?? []) {
    if (!delta.path.startsWith("responsive.")) continue
    const kind = delta.path.split(".")[1]
    if (typeof counts[kind] === "number") counts[kind] += 1
  }
  for (const residue of report.residues ?? []) {
    if (residue.path.startsWith("responsive.")) counts.residues += 1
  }
  return counts
}

function responsiveSummary(counts: ReturnType<typeof responsiveCounts>): string {
  const findings = counts.clipped + counts.escaped + counts.truncated + counts.band + counts.scope
  if (!findings) return counts.residues ? `${counts.residues} residue(s)` : "clean"
  return (
    `${findings} finding(s): ` +
    [
      counts.clipped ? `clipped ${counts.clipped}` : undefined,
      counts.escaped ? `escaped ${counts.escaped}` : undefined,
      counts.truncated ? `truncated ${counts.truncated}` : undefined,
      counts.band ? `band ${counts.band}` : undefined,
      counts.scope ? `scope ${counts.scope}` : undefined,
      counts.scrollable ? `scrollable ${counts.scrollable}` : undefined,
    ]
      .filter(Boolean)
      .join(" · ")
  )
}

function scopeSummary(scope: Scope | undefined): string {
  if (!scope) return "none"
  const axis = scope.declared === "viewport" ? "viewport" : "rootWidth"
  return `${scope.declared}: ${scope.changed?.[axis] ? "verified" : "NOT confirmed"}`
}

function corpusPath(flags: Flags): string {
  return typeof flags.get("cases") === "string" ? String(flags.get("cases")) : DEFAULT_CASES
}

// `queue --coverage` prints, per node, the devices the set declares against the
// cases the corpus commits; `--uncovered` prints only the missing (node, device)
// pairs — the burn-down work list, ordered like the registry queue. Nothing here
// names a component: the rows come from the inventory, the registry and the
// corpus (R8).
function printCoverage({ flags }: { flags: Flags }, path_: string, corpus: ParityCase[]): number {
  const uncovered = flags.has("uncovered")
  const statuses = statusesFrom(flags, "implemented,pending")
  const coverage = deviceCoverage({ registry: loadRegistry(), cases: corpus, statuses })
  const rows = coverage.rows.filter((row) => (uncovered ? row.missing.length : true))
  if (flags.has("json")) {
    console.log(
      JSON.stringify(
        {
          corpus: path_,
          statuses,
          uncovered: coverage.rows.flatMap((row) =>
            row.missing.map((device) => ({ nodeId: row.nodeId, device })),
          ),
          rows,
          totals: coverage.totals,
        },
        null,
        2,
      ),
    )
    return 0
  }
  if (uncovered) {
    for (const row of coverage.rows) {
      for (const device of row.missing) {
        console.log(
          `uncovered ${row.nodeId} ${row.status.padEnd(11)} ${String(row.export ?? "-").padEnd(24)} ${device}`,
        )
      }
    }
    console.log(
      `${coverage.totals.missing} device case(s) missing on ${coverage.totals.nodes} node(s) ` +
        `with a device axis (${coverage.omitted} node(s) outside the status filter)`,
    )
    return 0
  }
  for (const row of rows) {
    console.log(
      `${row.nodeId} ${row.status.padEnd(11)} ${String(row.export ?? "-").padEnd(24)} ` +
        `declared ${row.declared.join(",")} · covered ${row.covered.join(",") || "-"} · ` +
        `missing ${row.missing.join(",") || "-"}`,
    )
  }
  console.log(
    `${coverage.totals.covered}/${coverage.totals.declared} device case(s) covered · ` +
      `${coverage.totals.missing} missing on ${coverage.totals.nodes} node(s) ` +
      `(${coverage.omitted} node(s) outside the status filter)`,
  )
  return 0
}

function filteredCases(
  cases: ReturnType<typeof buildCases>,
  predicate: (item: ReturnType<typeof buildCases>[number]) => boolean,
): ReturnType<typeof buildCases> {
  return Object.assign(cases.filter(predicate), { missing: cases.missing })
}

function queue({ flags }: Parsed): number {
  let cases = buildCases({ statuses: statusesFrom(flags) })
  const node = flags.get("node")
  if (node) {
    const wanted = new Set(String(node).split(","))
    cases = filteredCases(cases, (item) => wanted.has(item.nodeId))
  }
  const path_ = corpusPath(flags)
  const corpus = loadCaseFile(path_)
  const mapped = new Set(corpus.map((entry) => entry.nodeId))
  if (flags.has("coverage") || flags.has("uncovered")) {
    return printCoverage({ flags }, path_, corpus)
  }
  if (flags.has("unmapped")) {
    const unmapped = cases.filter((item) => !mapped.has(item.nodeId))
    if (flags.has("json")) {
      console.log(
        JSON.stringify(
          { corpus: path_, unmapped, total: cases.length, mapped: mapped.size },
          null,
          2,
        ),
      )
    } else {
      for (const item of unmapped) {
        console.log(
          `unmapped ${item.nodeId} ${item.status.padEnd(11)} ${item.export.padEnd(24)} ` +
            `${item.storyIds.join(" ") || "(no declared story export)"}`,
        )
      }
      console.log(
        `${unmapped.length} of ${cases.length} case(s) without a committed mapping (${path_})`,
      )
    }
    return 0
  }
  if (flags.has("json")) {
    console.log(
      JSON.stringify(
        { cases, missing: cases.missing ?? [], corpus: path_, mapped: mapped.size },
        null,
        2,
      ),
    )
  } else {
    for (const item of cases) {
      const design = Object.entries(item.design)
        .map(([name, nodes]) => `${name}:${Array.isArray(nodes) ? nodes.join(",") || "-" : "-"}`)
        .join(" ")
      console.log(
        `${item.nodeId} ${item.status.padEnd(11)} ${item.export.padEnd(24)} ${item.storyIds.join(" ")} [${design}]`,
      )
    }
    for (const item of cases.missing ?? []) {
      console.log(`  dangling: ${item.nodeId} -> ${item.story} (file missing)`)
    }
    console.log(`${cases.length} case(s) · ${mapped.size} mapped in ${path_}`)
  }
  return 0
}

async function check(parsed: Parsed): Promise<number> {
  const { flags } = parsed
  const caseId = flags.get("case") === true ? undefined : flags.get("case")
  const nodeId = flags.get("node") === true ? undefined : flags.get("node")
  if (!caseId && !nodeId) throw new Error("check requires --node <id> or --case <caseId>")
  if (flags.has("devices")) {
    if (!nodeId) throw new Error("--devices needs --node <id>: it runs the node's device cases")
    return await checkDevices({ nodeId: String(nodeId), flags, parsed })
  }
  const path_ = corpusPath(flags)
  let spec
  let caseEntry: ParityCase | undefined
  if (caseId) {
    caseEntry = findCase(loadCaseFile(path_), String(caseId))
    spec = specFromCase(caseEntry, flags, parsed)
    if (!spec.storyId)
      throw new Error(`${caseId}: the case declares no storyId and none was passed`)
  } else {
    spec = caseFromFlags(registryCase(String(nodeId)), flags, parsed)
  }
  const project = loadExport(stringFlag(flags, "input"))
  if (!flags.has("json")) console.log(`source: ${project.file} (${project.origin})`)
  // The slice is evidence, not a live read: before capturing, prove it still
  // describes the case and the inventory it was pinned against. A stale slice
  // is missing evidence, so the run stops before Storybook. An explicit
  // `--input <slice>` is the same evidence and gets the same check.
  if (project.raw.kind === "parity-source" && caseEntry) {
    const evidenceErrors = checkCaseEvidence({
      entry: spec,
      node: inventoryNode(spec.nodeId),
    })
    if (evidenceErrors.length) {
      for (const error of evidenceErrors) console.error(`error: ${error}`)
      return 2
    }
    if (!flags.has("json")) console.log("evidence: bundle matches the committed inventory")
  }
  const { report, probe, mapping } = await evaluateCase(spec, { project })
  if (flags.has("save-case")) {
    const saved = saveCase(
      path_,
      { ...spec, storyId: report.storyId },
      { id: caseId ? String(caseId) : caseIdFor(spec) },
    )
    console.log(`case saved: ${saved.entry.id} -> ${saved.file} (${saved.total} case(s))`)
  }
  if (flags.has("json"))
    console.log(
      JSON.stringify(
        {
          report,
          probe,
          case: spec,
          source: { file: project.file, origin: project.origin },
          mapping,
        },
        null,
        2,
      ),
    )
  else {
    printResult(report, { notes: flags.has("notes") })
    // The mapping nudge belongs to the per-node loop, where the case is written:
    // a reviewed `--case` run reproduces the stored mapping and stays quiet.
    if (!caseId && mapping.length) {
      const shown = mapping.slice(0, 6).join(", ")
      const more = mapping.length > 6 ? `, +${mapping.length - 6} more` : ""
      console.log(
        `  mapping: ${mapping.length} source frame(s) with padding not mapped (${shown}${more}) ` +
          "— map them as --subject or record the adaptation",
      )
    }
  }
  return report.deltas.length ? 1 : 0
}

// One command for a node's whole device dimension (RA5): every device the set
// declares, its committed case, and one table. A device without a reviewed case
// is missing evidence, and the command exits 1 — the coverage is never inferred
// from a sibling device.
async function checkDevices({
  nodeId,
  flags,
  parsed,
}: {
  nodeId: string
  flags: Flags
  parsed: Parsed
}): Promise<number> {
  const path_ = corpusPath(flags)
  const corpus = loadCaseFile(path_)
  const inventory = inventoryNode(nodeId)
  if (!inventory) throw new Error(`${nodeId} is not in inventory.json`)
  const devices = requiredDevices(devicePolicy(), inventory)
  if (!devices.length) {
    throw new Error(`${nodeId} declares no device axis: there is no device case to run`)
  }
  const project = loadExport(stringFlag(flags, "input"))
  if (!flags.has("json")) console.log(`source: ${project.file} (${project.origin})`)
  if (project.raw.kind === "parity-source") {
    const evidenceErrors = [
      ...new Set(
        devices.flatMap((device) => {
          const entry = corpus.find((item) => item.nodeId === nodeId && item.device === device)
          return entry ? checkCaseEvidence({ entry, node: inventory }) : []
        }),
      ),
    ]
    if (evidenceErrors.length) {
      for (const error of evidenceErrors) console.error(`error: ${error}`)
      return 2
    }
    if (!flags.has("json")) console.log("evidence: bundle matches the committed inventory")
  }
  type DeviceRow = {
    device: string
    variant: string
    verdict: string
    deltas: number
    responsive: string
  }
  const rows: DeviceRow[] = []
  for (const device of devices) {
    const entry = corpus.find((item) => item.nodeId === nodeId && item.device === device)
    if (!entry) {
      rows.push({ device, variant: "-", verdict: "missing-case", deltas: 0, responsive: "-" })
      continue
    }
    try {
      const spec = specFromCase(entry, new Map(), parsed)
      const { report } = await evaluateCase(spec, { project })
      const counts = responsiveCounts(report)
      rows.push({
        device,
        variant: report.variant,
        verdict: report.verdict,
        deltas: report.deltas.length,
        responsive: responsiveSummary(counts),
      })
    } catch (error) {
      rows.push({
        device,
        variant: "-",
        verdict: "error",
        deltas: 0,
        responsive: error instanceof Error ? error.message : String(error),
      })
    }
  }
  const failed = rows.some((row) => row.verdict === "missing-case" || row.verdict === "error")
  const deltas = rows.some((row) => (row.deltas ?? 0) > 0)
  if (flags.has("json")) console.log(JSON.stringify({ nodeId, devices: rows }, null, 2))
  else {
    console.log(`${nodeId} ${inventory.name} — ${devices.length} declared device(s)`)
    console.log("device   variant    verdict              deltas  responsive")
    for (const row of rows) {
      console.log(
        `${String(row.device).padEnd(8)} ${String(row.variant).padEnd(10)} ` +
          `${String(row.verdict).padEnd(20)} ${String(row.deltas).padEnd(7)} ${row.responsive}`,
      )
    }
  }
  return failed || deltas ? 1 : 0
}

// A wave of cases: an explicit case file when given, otherwise the registry
// filter. The catalogue stories (the icon and pictogram sheets) are skipped
// unless asked for: they are artwork sheets, not per-node renders.
async function captureWave(parsed: Parsed): Promise<number> {
  const { flags } = parsed
  const out = String(flags.get("out") ?? DEFAULT_WAVE_DIR)
  const project = loadExport(stringFlag(flags, "input"))
  const limit = flags.get("limit") ? Number(flags.get("limit")) : Number.POSITIVE_INFINITY

  let specs
  if (flags.get("cases") && flags.get("cases") !== true) {
    specs = JSON.parse(fs.readFileSync(String(flags.get("cases")), "utf8"))
    if (!Array.isArray(specs)) throw new Error(`${flags.get("cases")}: expected a case array`)
  } else {
    let cases = buildCases({ statuses: statusesFrom(flags) })
    if (!flags.has("include-catalogue")) {
      cases = filteredCases(cases, (item) => !(item.title ?? "").startsWith("Foundations/"))
    }
    if (flags.get("node") && flags.get("node") !== true) {
      const wanted = new Set(String(flags.get("node")).split(","))
      cases = filteredCases(cases, (item) => wanted.has(item.nodeId))
    }
    // `--device mobile` captures every selected node at that device: the wave
    // iteration is one device per pass (RA8), not one node per pass.
    const device = deviceFrom(flags.get("device"))
    specs = cases.map((item) => ({
      nodeId: item.nodeId,
      storyId: item.storyIds[0],
      export: item.export,
      ...(device ? { device } : {}),
    }))
  }

  if (flags.has("dry-run")) {
    for (const spec of specs) console.log(`${spec.nodeId} ${spec.storyId ?? "(no story)"}`)
    console.log(`${specs.length} case(s)`)
    return 0
  }
  // The strict profile promotes the composition advisories into the verdict:
  // it is a case-level switch, and the command line forces it on the whole wave.
  if (flags.has("strict")) specs = specs.map((spec) => ({ ...spec, strict: true }))
  // `--note <text>` annotates every case of the wave: the captured report
  // carries it, and a later `--save-case` writes it into the corpus.
  const note = noteFrom(flags)
  if (note) specs = specs.map((spec) => ({ ...spec, note }))

  fs.mkdirSync(out, { recursive: true })
  type WaveResult = {
    file?: string
    nodeId: string
    variant?: string
    variantName?: string
    device?: string | null
    storyId?: string
    status: string
    deltas?: number
    advisories?: number
    residues?: number
    responsive?: string
    case?: unknown
    message?: string
  }
  const results: WaveResult[] = []
  for (const spec of specs.slice(0, limit)) {
    // A wave case may declare its story; otherwise the registry decides, and a
    // case without a declared story export is recorded as missing evidence.
    if (!spec.storyId) {
      try {
        const known = registryCase(spec.nodeId)
        const index = spec.export ? known.exports.indexOf(spec.export) : 0
        spec.storyId = known.storyIds[index >= 0 ? index : 0]
      } catch {
        spec.storyId = undefined
      }
    }
    if (!spec.storyId) {
      results.push({ nodeId: spec.nodeId, status: "missing-story" })
      console.log(`missing-story ${spec.nodeId}`)
      continue
    }
    try {
      // Two cases can share a node (two variants): the file name carries both,
      // and a device case carries its device after the selector.
      const selector = `${spec.variant ?? spec.state ?? "case"}${spec.device ? `-${spec.device}` : ""}`
      const fileBase = `${spec.nodeId.replace(":", "-")}-${selector}`
      const { report, probe } = await evaluateCase(
        { ...spec, screenshot: path.join(out, `${fileBase}.png`) },
        { project },
      )
      fs.writeFileSync(
        path.join(out, `${fileBase}.json`),
        `${JSON.stringify({ report, probe, case: spec }, null, 1)}\n`,
      )
      results.push({
        file: `${fileBase}.json`,
        nodeId: report.nodeId,
        variant: report.variant,
        variantName: report.variantName,
        device: report.device ?? spec.device ?? null,
        storyId: String(report.storyId ?? ""),
        status: report.verdict,
        deltas: report.deltas.length,
        advisories: report.advisories.length,
        residues: report.residues.length,
        responsive: responsiveSummary(responsiveCounts(report)),
        case: spec,
      })
      console.log(
        `${report.verdict.padEnd(22)} ${report.nodeId} ${report.variant}` +
          `${report.device ? ` ${report.device}` : ""}`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ nodeId: spec.nodeId, status: "error", message })
      console.log(`error ${spec.nodeId}: ${message}`)
    }
  }
  const summary = {
    schemaVersion: 1,
    wave: String(flags.get("wave") ?? new Date().toISOString().slice(0, 10)),
    generatedAt: new Date().toISOString(),
    cases: results,
    counts: results.reduce((counts: Record<string, number>, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1
      return counts
    }, {}),
  }
  fs.writeFileSync(path.join(out, "summary.json"), `${JSON.stringify(summary, null, 1)}\n`)
  console.log(`${results.length} case(s) -> ${out}/summary.json`)
  return results.some((item) => (item.deltas ?? 0) > 0 || item.status === "error") ? 1 : 0
}

// `cases --sync [--node <id>] [--dry-run]`: propose the cases the corpus misses
// from the sibling a node already has (RA6) — one draft per missing device and
// one per variant no reviewed case points at (the states and the visual
// properties). A proposal is a draft (`note: "draft — refine the mapping"`):
// the coverage ignores it, so it cannot silence the queue before the reviewed
// render replaces the note (R9).
function cases({ flags }: Parsed): number {
  const path_ = corpusPath(flags)
  const corpus = loadCaseFile(path_)
  const nodeId =
    flags.get("node") && flags.get("node") !== true ? String(flags.get("node")) : undefined
  const result = syncProposals({ cases: corpus, nodeId })
  const dryRun = flags.has("dry-run")
  for (const proposal of result.proposals) {
    if (dryRun) {
      console.log(
        `propose ${proposal.nodeId} ${String(proposal.device).padEnd(8)} ` +
          `state=${JSON.stringify(proposal.state)} width=${proposal.width ?? "-"} ` +
          `-> ${proposal.storyId}`,
      )
      continue
    }
    const saved = saveCase(path_, proposal)
    console.log(
      `case saved: ${saved.entry.id} -> ${saved.file}${saved.replaced ? " (replaced)" : ""}`,
    )
  }
  for (const proposal of result.stateProposals) {
    if (dryRun) {
      console.log(
        `propose ${proposal.nodeId} property state=${JSON.stringify(proposal.state)} ` +
          `variant=${proposal.variant} width=${proposal.width ?? "-"} -> ${proposal.storyId}`,
      )
      continue
    }
    const saved = saveCase(path_, proposal)
    console.log(
      `case saved: ${saved.entry.id} -> ${saved.file}${saved.replaced ? " (replaced)" : ""}`,
    )
  }
  for (const skip of result.skipped) {
    console.log(`skip    ${skip.nodeId} ${(skip.missing ?? []).join(",")} — ${skip.reason}`)
  }
  for (const skip of result.stateSkipped) {
    console.log(`skip    ${skip.nodeId} ${skip.variant ?? "state"} — ${skip.reason}`)
  }
  console.log(
    `${result.proposals.length} device + ${result.stateProposals.length} state/property ` +
      `${dryRun ? "proposal(s)" : "case(s) written"} · ` +
      `${result.skipped.length + result.stateSkipped.length} skip(s) · ` +
      `${result.coverage.totals.missing} device case(s) missing before this run`,
  )
  return 0
}

// `verify`: the hermetic verdict of the corpus and its device coverage. No
// snapshot, no Storybook, no network: a clone can prove the reviewed cases are
// well formed and that every implemented device set is covered before a render
// exists. A broken case is an error; a pending burn-down row is a warning.
function verify({ flags }: Parsed): number {
  const path_ = corpusPath(flags)
  const cases = loadCaseFile(path_)
  const registry = loadRegistry()
  const nodes = inventoryNodes()
  const policy = devicePolicy()
  const corpus = validateCaseFile(cases, { registry, nodes, policy })
  const errors = [...corpus.errors]
  const warnings = [...corpus.warnings]
  const coverage = deviceCoverage({
    policy,
    nodes,
    registry,
    cases,
    statuses: ["implemented", "pending"],
  })
  for (const row of coverage.rows) {
    if (!row.missing.length) continue
    const message = `${row.nodeId} (${row.status}) misses device case(s): ${row.missing.join(", ")}`
    if (row.status === "implemented") errors.push(message)
    else warnings.push(message)
  }
  const drafts = cases.filter(isDraftCase).length
  const evidence = checkEvidence({ cases, nodes })
  for (const warning of evidence.warnings) warnings.push(`evidence: ${warning}`)
  for (const error of evidence.errors) errors.push(`evidence: ${error}`)
  if (flags.has("json")) {
    console.log(
      JSON.stringify(
        {
          corpus: path_,
          cases: cases.length,
          drafts,
          errors,
          warnings,
          evidence: {
            entries: evidence.entries,
            bytes: evidence.bytes,
          },
          coverage: coverage.totals,
          rows: coverage.rows,
        },
        null,
        2,
      ),
    )
  } else {
    for (const warning of warnings) console.warn(`warn: ${warning}`)
    for (const error of errors) console.error(`error: ${error}`)
    console.log(
      `cases: ${cases.length} case(s) · errors ${errors.length} · ` +
        `warnings ${warnings.length} · drafts ${drafts}`,
    )
    console.log(
      `devices: ${coverage.totals.nodes} node(s) with an axis · declared ${coverage.totals.declared} · ` +
        `covered ${coverage.totals.covered} · missing ${coverage.totals.missing} · ` +
        `drafts ${coverage.totals.drafts}`,
    )
    console.log(
      `evidence: ${evidence.entries}/${evidence.cases} manifest entr(ies) · ${evidence.bytes} bytes`,
    )
    console.log(errors.length ? "verify: failed" : "verify: ok")
  }
  return errors.length ? 1 : 0
}

function reRunCommand(entry: { nodeId: string; case?: CaseSpec; status: string }): string {
  const spec = entry.case
  // A reviewed case is addressed by its id: the corpus owns the mapping.
  if (spec?.id) return `pnpm nx run pagopa-ui-cli:figma:parity:check --case ${spec.id}`
  if (!spec) return `pnpm nx run pagopa-ui-cli:figma:parity:check --node ${entry.nodeId}`
  const parts = ["pnpm nx run pagopa-ui-cli:figma:parity:check", `--node ${entry.nodeId}`]
  if (spec?.state) parts.push(`--state ${spec.state}`)
  if (spec?.device) parts.push(`--device ${spec.device}`)
  if (spec?.layoutScope) parts.push(`--layout-scope ${spec.layoutScope}`)
  if (spec?.variant) parts.push(`--variant ${spec.variant}`)
  if (spec?.storyId) parts.push(`--story ${spec.storyId}`)
  if (spec?.width) parts.push(`--width ${spec.width}`)
  if (spec?.viewport) parts.push(`--viewport ${spec.viewport}`)
  if (spec.height) parts.push(`--height ${spec.height}`)
  if (spec.root) parts.push(`--root ${JSON.stringify(spec.root)}`)
  if (spec.subjectRoot) parts.push(`--subject-root ${JSON.stringify(spec.subjectRoot)}`)
  if (spec.offsetOrigin) parts.push(`--offset-origin ${JSON.stringify(spec.offsetOrigin)}`)
  for (const [layer, selector] of Object.entries(spec.subjects ?? {})) {
    parts.push(`--subject ${JSON.stringify(`${layer}=${selector}`)}`)
  }
  for (const [selector, value] of spec.fill ?? []) {
    parts.push(`--fill ${JSON.stringify(`${selector}=${value}`)}`)
  }
  for (const selector of spec.click ?? []) parts.push(`--click ${JSON.stringify(selector)}`)
  for (const selector of spec.focus ?? []) parts.push(`--focus ${JSON.stringify(selector)}`)
  if (spec.blur) parts.push("--blur")
  if (spec.keepFocus) parts.push("--keep-focus")
  if (spec.compareBox) parts.push(`--compare-box ${spec.compareBox}`)
  if (spec.compareOffset) parts.push("--compare-offset")
  if (spec.expectState) parts.push(`--expect-state ${spec.expectState}`)
  if (spec.stateEvidence) parts.push(`--state-evidence ${JSON.stringify(spec.stateEvidence)}`)
  if (spec.strict) parts.push("--strict")
  for (const residue of spec.residues ?? []) {
    parts.push(`--residue ${JSON.stringify(`${residue.path}=${residue.reason}`)}`)
  }
  for (const ignore of spec.ignores ?? []) parts.push(`--ignore ${ignore}`)
  return parts.join(" ")
}

// The wave directory becomes one committed markdown: the counts, the per-case
// verdicts with their numbers and the residues with their reasons. The JSON
// stays in the wave directory (gitignored), the markdown is the record.
function report({ flags }: Parsed): number {
  const dir = waveDir(flags)
  const summaryPath = path.join(dir, "summary.json")
  if (!fs.existsSync(summaryPath)) throw new Error(`${summaryPath} is missing: run capture first`)
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"))
  const wave = String(flags.get("wave") ?? summary.wave)
  const out = String(flags.get("out") ?? `docs/reports/${wave}-figma-parity.md`)

  type SummaryEntry = {
    nodeId: string
    status: string
    file?: string
    device?: string | null
    variant?: string
    variantName?: string
    storyId?: string
    message?: string
    deltas?: number
    advisories?: number
    residues?: number
    responsive?: string
  }
  type Detail = {
    deltas?: Delta[]
    advisories?: Delta[]
    residues?: Array<{ path: string; reason: string }>
  }
  const entries: SummaryEntry[] = summary.cases ?? []
  const lines: string[] = []
  lines.push(`# Figma parity — wave ${wave}`)
  lines.push("")
  lines.push(
    `Generated by \`pnpm nx run pagopa-ui-cli:figma:parity:capture\` + \`report\` on ${summary.generatedAt.slice(0, 10)} ` +
      `from the pinned export and the running Storybook. Evidence: \`${dir}/\` (renders, probes, summary.json).`,
  )
  lines.push("")
  lines.push("## Counts")
  lines.push("")
  lines.push("| verdict | cases |")
  lines.push("| --- | --- |")
  for (const [status, count] of Object.entries(summary.counts ?? {})) {
    lines.push(`| ${status} | ${count} |`)
  }
  lines.push("")
  lines.push("## Cases")
  lines.push("")
  lines.push(
    "| node | device | variant | story | verdict | deltas | advisories | residues | responsive |",
  )
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |")
  for (const entry of entries) {
    lines.push(
      `| \`${entry.nodeId}\` | ${entry.device ?? "-"} | ${entry.variant ? `\`${entry.variant}\`` : "-"} | ${
        entry.storyId ? `\`${entry.storyId}\`` : "-"
      } | ${entry.status}${entry.message ? ` (${entry.message})` : ""} | ${entry.deltas ?? "-"} | ${
        entry.advisories ?? "-"
      } | ${entry.residues ?? "-"} | ${entry.responsive ?? "-"} |`,
    )
  }
  lines.push("")

  const withDetail = entries.filter((entry) => entry.status !== "missing-story")
  const residuesByReason = new Map<string, Array<{ nodeId: string; path: string }>>()
  const deltas: Array<Delta & { nodeId: string }> = []
  const advisories: Array<Delta & { nodeId: string }> = []
  for (const entry of withDetail) {
    const file = path.join(dir, entry.file ?? `${entry.nodeId.replace(":", "-")}.json`)
    if (!fs.existsSync(file)) continue
    const { report: detail }: { report: Detail } = JSON.parse(fs.readFileSync(file, "utf8"))
    for (const delta of detail.deltas ?? []) {
      deltas.push({ nodeId: entry.nodeId, ...delta })
    }
    for (const advisory of detail.advisories ?? []) {
      advisories.push({ nodeId: entry.nodeId, ...advisory })
    }
    for (const residue of detail.residues ?? []) {
      if (!residuesByReason.has(residue.reason)) residuesByReason.set(residue.reason, [])
      residuesByReason.get(residue.reason)?.push({ nodeId: entry.nodeId, path: residue.path })
    }
  }

  lines.push("## Residues")
  lines.push("")
  if (!residuesByReason.size) lines.push("None: every captured case matched within tolerance.")
  else {
    for (const [reason, items] of residuesByReason) {
      lines.push(`- **${reason}**`)
      for (const item of items) lines.push(`  - \`${item.nodeId}\` \`${item.path}\``)
    }
  }
  lines.push("")
  lines.push("## Deltas still open")
  lines.push("")
  if (!deltas.length) lines.push("None.")
  else {
    lines.push("| node | path | source | render | token |")
    lines.push("| --- | --- | --- | --- | --- |")
    for (const delta of deltas) {
      lines.push(
        `| \`${delta.nodeId}\` | \`${delta.path}\` | ${delta.source} | ${delta.render} | ${
          delta.token ? `${delta.token.kind}${delta.token.name ? `: ${delta.token.name}` : ""}` : ""
        } |`,
      )
    }
  }
  lines.push("")
  lines.push("## Advisories (composition — not gating)")
  lines.push("")
  if (!advisories.length) lines.push("None.")
  else {
    lines.push(
      "Reported by the `--compare-offset` cases; `--strict` promotes them into the verdict.",
    )
    lines.push("")
    lines.push("| node | path | source | render | token |")
    lines.push("| --- | --- | --- | --- | --- |")
    for (const advisory of advisories) {
      lines.push(
        `| \`${advisory.nodeId}\` | \`${advisory.path}\` | ${advisory.source} | ${advisory.render} | ${
          advisory.token
            ? `${advisory.token.kind}${advisory.token.name ? `: ${advisory.token.name}` : ""}`
            : ""
        } |`,
      )
    }
  }
  lines.push("")
  lines.push("## How to re-run")
  lines.push("")
  lines.push("```bash")
  for (const entry of entries) lines.push(reRunCommand(entry))
  lines.push("```")
  lines.push("")

  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, `${lines.join("\n")}`)
  console.log(`report written: ${out} (${entries.length} case(s))`)
  return 0
}

async function main(argv: string[]): Promise<number> {
  enterRoot()
  const command = argv[0]
  const parsed = parse(argv.slice(1))
  if (!command) {
    console.log(USAGE)
    return 2
  }
  if (command === "--help" || command === "-h" || parsed.flags.has("help")) {
    console.log(USAGE)
    return 0
  }
  if (command === "queue") return queue(parsed)
  if (command === "check") return await check(parsed)
  if (command === "capture") return await captureWave(parsed)
  if (command === "cases") return cases(parsed)
  if (command === "evidence") return await evidenceCommand(argv.slice(1))
  if (command === "verify") return verify(parsed)
  if (command === "report") return report(parsed)
  console.error(`unknown command ${command}\n${USAGE}`)
  return 2
}

const invoked = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (invoked) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code
    })
    .catch((error) => {
      console.error(`error: ${error.message}`)
      process.exitCode = 2
    })
}

export {
  main,
  queue,
  check,
  captureWave,
  report,
  evaluateCase,
  caseFromFlags,
  specFromCase,
  mappingGaps,
}
