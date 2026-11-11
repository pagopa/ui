// The node card: one bounded record per node, the verdict a session reads before
// it opens a file. `buildBrief` gathers the prose a hand-off needs; the card is
// the same data in a fixed shape — one line per section, a stated absence where
// a source has nothing, and a marker wherever a section was cut.
import fs from "node:fs"

import type { Workspace } from "../adapters/workspace.ts"
import { readJson } from "../lib/json.ts"
import { isDraftCase } from "../parity/cases.ts"
import { EVIDENCE_DIR, evidencePaths, loadManifest } from "../parity/evidence.ts"
import { committedFile, readCases, readDevicePolicy, readInventory } from "../records/committed.ts"
import type { Inventory, InventoryNode } from "../schemas/catalogue.ts"
import type { RuleDisposition } from "../schemas/rules.ts"
import { buildBrief, compact, componentForNode, type NodeBrief } from "./brief.ts"
import { readCatalogueDiagnostics } from "./catalogue/index.ts"
import { canonicalWidth, checkDevices, declaredDevices } from "./devices.ts"
import { readLedger, readRulesSnapshot, rulesForNode } from "./rules.ts"
import { checkRules } from "./rules-workflow.ts"
import { compareSnapshots, normalizeLive } from "./snapshot.ts"

const LIVE_SNAPSHOT_PATH = ".figma/live-rest.json"
/** Where `--card` writes the full brief the card only summarises. */
export const CARD_DETAIL_DIR = ".figma/briefs"

// The card's ceiling. `formatNodeCard` trims to it, so a node's record never
// costs more than this to read; `node-card.test.mjs` asserts every node of the
// committed inventory fits it.
export const CARD_BUDGET = 1536
const ITEM_LIMIT = 240
const NOTE_LIMIT = 80
const THREAD_LIMIT = 120
const LABEL_WIDTH = 11

export type NodeCardDevice = { device: string; width: number | null }

export type NodeCardCase = {
  id: string
  device: string
  width: number | null
  layoutScope: string
  verdict: "reviewed" | "draft"
  note: string | null
}

export type NodeCardThread = {
  /** The layer the thread is pinned to; `null` when Figma anchored it to nothing. */
  anchor: string | null
  author: string
  date: string
  message: string
  replies: number
}

export type NodeCard = {
  node: string
  name: string | null
  page: string | null
  status: string | null
  module: string | null
  export: string | null
  story: string | null
  storyExports: string[]
  note: string | null
  devices: NodeCardDevice[]
  cases: NodeCardCase[]
  rules: {
    total: number
    pending: number
    cards: Array<{ card: string; disposition: string; title: string }>
    guides: string[]
  }
  /** `null` when the comments snapshot is absent, which is not "no comments". */
  comments: {
    open: number
    answeredBySource: number
    needsDesignRequest: number
    /** The open threads themselves: a count alone cannot be acted on. */
    threads: NodeCardThread[]
  } | null
  requests: string[]
  /** `null` when the pinned export is absent, which is not "no change". */
  delta: { variants: Array<{ nodeId: string; class: string }>; changed: string[] } | null
  verdict: string[]
  evidence: Array<{ path: string; stale: boolean }>
  /**
   * The path of the full brief written next to the card, or `null` when the
   * caller did not write one. The card names it so a session can read the
   * thread texts and rule bodies the ceiling keeps out of the card itself.
   */
  detail: string | null
}

type CardSection = { label: string; parts: string[] }

function nodeCases(workspace: Workspace, node: string): NodeCardCase[] {
  return (
    (readCases(workspace.root) ?? [])
      .filter((item) => item.nodeId === node)
      .map((item) => ({
        id: item.id,
        device: item.device ?? "any",
        width: item.width ?? item.viewport ?? null,
        layoutScope: item.layoutScope ?? "viewport",
        verdict: isDraftCase(item) ? ("draft" as const) : ("reviewed" as const),
        note: item.note ? compact(item.note) : null,
      }))
      // Narrowest capture first, the order the device policy declares: the card
      // must not depend on the order the case file happens to list them in.
      .sort(
        (left, right) =>
          (left.width ?? 0) - (right.width ?? 0) ||
          left.device.localeCompare(right.device) ||
          left.id.localeCompare(right.id),
      )
  )
}

// Only a reviewed card settles a thread: `imported` and `recorded` are the two
// dispositions that put an answer in the source. A deferred, conflicting,
// duplicated or out-of-scope card is a decision *about* the point, not an answer
// to it, and a pending one has not been read yet — all three leave the question
// with the design owner.
const ANSWERING: ReadonlySet<RuleDisposition> = new Set(["imported", "recorded"])

// A thread is pinned to whatever it was drawn on — the component, one of its
// variants, a child layer or the page — so it is answered by the component that
// owns its anchor. An anchor no component owns is assessed as unanswered rather
// than skipped: the reader still has to do something about it.
function nodeComments(
  workspace: Workspace,
  inventory: Inventory,
  brief: NodeBrief,
): NodeCard["comments"] {
  if (!brief.commentsSnapshot) return null
  const ledger = readLedger(workspace.root, false)
  const snapshot = ledger ? readRulesSnapshot(workspace.root, false) : null
  const answered = (anchor: string | null): boolean => {
    if (!ledger || !anchor) return false
    const owner = componentForNode(inventory, anchor)
    if (!owner) return false
    return rulesForNode(ledger, snapshot, workspace.root, owner.nodeId).some((rule) =>
      ANSWERING.has(rule.disposition),
    )
  }
  const threads: NodeCardThread[] = brief.openComments.map((thread) => ({
    anchor: thread.nodeId,
    author: thread.author,
    date: thread.createdAt,
    message: thread.message,
    replies: thread.replies.length,
  }))
  const answeredBySource = brief.openComments.filter((thread) => answered(thread.nodeId)).length
  return {
    open: threads.length,
    answeredBySource,
    needsDesignRequest: threads.length - answeredBySource,
    threads,
  }
}

function nodeDelta(workspace: Workspace, node: string): NodeCard["delta"] {
  const file = workspace.path(LIVE_SNAPSHOT_PATH)
  if (!fs.existsSync(file)) return null
  const inventory = readInventory(workspace.root)
  const live = normalizeLive(readJson(file), { workspace })
  // The scope spans the accepted *and* the live variant ids: a variant the file
  // added has no accepted record, and it is the change a session most needs to
  // see. Reading only the accepted side hid exactly those additions.
  const scope = new Set([
    node,
    ...(componentForNode(inventory, node)?.variants ?? []).map((variant) => variant.nodeId),
    ...(componentForNode({ components: live }, node)?.variants ?? []).map(
      (variant) => variant.nodeId,
    ),
  ])
  const delta = compareSnapshots(inventory.components, live)
  const variants = delta.changedVariants
    .filter((change) => scope.has(change.nodeId))
    .map((change) => ({ nodeId: change.nodeId, class: change.class }))
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId, undefined, { numeric: true }))
  const changed = [...delta.changed, ...delta.renamed, ...delta.moved]
    .filter((entry) => scope.has(entry.nodeId))
    .map((entry) => entry.change ?? "changed")
  return { variants, changed: [...new Set(changed)].sort() }
}

/** What a manifest entry can pin: a variant, or a component without variants. */
type CardPin = InventoryNode | NonNullable<InventoryNode["variants"]>[number]

// The fingerprint a pin is compared against: the variant's own, the component's
// design fingerprint, its contract fingerprint, or the marker a missing one gets.
function fingerprintOf(entry: CardPin): string {
  const design = entry.designFingerprint
  if (design) return design
  return (
    ("contractFingerprint" in entry ? entry.contractFingerprint : undefined) ?? "unfingerprinted"
  )
}

function nodeEvidence(workspace: Workspace, node: string): NodeCard["evidence"] {
  const paths = evidencePaths(workspace.workspaceRoot)
  if (!fs.existsSync(paths.manifest)) return []
  const inventory = readInventory(workspace.root)
  const component = componentForNode(inventory, node)
  // A component without variants pins its own PNG, and its own fingerprint is the
  // one the manifest carries — the same reading `pinnedVariant` makes. Indexing
  // only the variants reported that pin as stale on every read.
  const pinned: CardPin[] = component
    ? component.variants?.length
      ? component.variants
      : [component]
    : []
  const fingerprints = new Map(pinned.map((entry) => [entry.nodeId, fingerprintOf(entry)]))
  const scope = new Set([node, ...fingerprints.keys()])
  return Object.entries(loadManifest(paths.manifest).cases)
    .filter(([, entry]) => scope.has(entry.nodeId))
    .map(([, entry]) => ({
      path: `${EVIDENCE_DIR}/${entry.png}`,
      // The pin is the case's own variant, or the component itself when the case
      // names none: the manifest records the same choice `check` made.
      stale:
        fingerprints.get(entry.variant ?? component?.nodeId ?? node) !== entry.designFingerprint,
    }))
    .sort((left, right) => left.path.localeCompare(right.path))
}

function namesNode(node: string): (line: string) => boolean {
  const pattern = new RegExp(`(^|[^0-9])${node.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![0-9])`)
  return (line) => pattern.test(line)
}

/** What the whole-workspace gates said, read once by the caller. */
export interface NodeCardGates {
  readonly devices: readonly string[]
  /** `null` when the workspace has no rules ledger, which is not "no rule failed". */
  readonly rules: readonly string[] | null
  /** The catalogue's hermetic diagnostics; `[]` when the registry loads. */
  readonly catalogue: readonly string[]
}

// Every gate walks the whole workspace, so a caller that builds several cards
// reads them once and hands the same result to each.
export function readNodeCardGates(workspace: Workspace): NodeCardGates {
  return {
    devices: checkDevices(workspace).problems,
    rules: readLedger(workspace.root, false) ? checkRules(workspace, false).errors : null,
    catalogue: catalogueGate(workspace),
  }
}

// A node can name a module, a story or an export that does not exist, and no
// device or rule notices: the registry's own read is the gate that does. It is
// hermetic — the committed inventory and registry, never the live file — so a
// card costs no network read, and a registry that fails to load is reported
// rather than read as clean.
function catalogueGate(workspace: Workspace): string[] {
  try {
    return readCatalogueDiagnostics(workspace)
  } catch (error) {
    return [`registry unreadable: ${error instanceof Error ? error.message : String(error)}`]
  }
}

// The card is a verdict: every gate that already knows this node is wrong says
// so here, prefixed with the gate that says it.
function nodeVerdict(
  node: string,
  cards: readonly { card: string }[],
  guides: readonly string[],
  devices: NodeCardDevice[],
  cases: NodeCardCase[],
  status: string | null,
  hasTarget: boolean,
  gates: NodeCardGates,
): string[] {
  const names = namesNode(node)
  // A diagnostic names what failed, which is the node only for the catalogue. A
  // rule failure names the *card* and a guide failure the guide file, so the
  // node's own cards and guides are what ties those lines back to it; matching
  // node ids alone dropped every one of them.
  const owns = (line: string): boolean =>
    names(line) ||
    cards.some(({ card }) => line.startsWith(`${card}:`)) ||
    guides.some((guide) => line.startsWith(`${guide}:`))
  const verdicts: string[] = []
  if (status === "implemented" && !hasTarget) verdicts.push("catalogue implemented with no target")
  verdicts.push(...gates.catalogue.filter(owns).map((line) => `catalogue ${line}`))
  verdicts.push(...gates.devices.filter(names).map((line) => `devices ${line}`))
  if (gates.rules) {
    verdicts.push(...gates.rules.filter(owns).map((line) => `rules ${line}`))
  }
  for (const device of devices) {
    const covered = cases.some(
      (item) => item.device === device.device && item.verdict === "reviewed",
    )
    if (!covered) verdicts.push(`devices ${device.device} has no reviewed case`)
  }
  return [...new Set(verdicts)].sort()
}

// The width the source declares for a device: the variant's own box, else the
// width a case captured, else the policy's canonical width. The canonical width
// is the policy's default, not a measurement of this component, so it comes last.
function sourceWidth(
  component: InventoryNode,
  device: string,
  cases: readonly NodeCardCase[],
): number | null {
  const box = (component.variants ?? []).find((variant) => variant.device === device)?.box?.width
  if (box !== undefined) return box
  return cases.find((item) => item.device === device && item.width !== null)?.width ?? null
}

export interface NodeCardOptions {
  /**
   * Read the gitignored `.figma/` exports the card can show: the open comment
   * threads and the delta against the live file. The ceiling covers the card
   * both ways, so it bounds what a session actually reads.
   */
  readonly local?: boolean
  /** The gate results the verdict filters, read by the caller. */
  readonly gates: NodeCardGates
  /**
   * The workspace-relative path of the full brief the caller wrote beside the
   * card. The card names it so the ceiling hides nothing a session needs.
   */
  readonly detail?: string | null
}

export function buildNodeCard(
  workspace: Workspace,
  requested: string,
  options: NodeCardOptions,
): NodeCard {
  const local = options.local ?? true
  const brief = buildBrief(workspace, requested)
  const inventory = readInventory(workspace.root)
  const component = componentForNode(inventory, requested)
  const policyFile = committedFile("device-policy", workspace.root)
  const policy = fs.existsSync(policyFile) ? readDevicePolicy(workspace.root) : null
  const cases = nodeCases(workspace, brief.node)
  const devices =
    policy && component
      ? declaredDevices(policy, component).map((device) => ({
          device,
          width: sourceWidth(component, device, cases) ?? canonicalWidth(policy, device) ?? null,
        }))
      : []
  return {
    node: brief.node,
    name: brief.name,
    page: brief.page,
    status: brief.status,
    module: brief.target?.module ?? null,
    export: brief.target?.export ?? null,
    story: brief.target?.story ?? null,
    storyExports: brief.target?.storyExports ?? [],
    note: brief.note,
    devices,
    cases,
    rules: {
      total: brief.rules.length,
      pending: brief.rules.filter((rule) => rule.disposition === "pending").length,
      cards: brief.rules.map((rule) => ({
        card: rule.card,
        disposition: rule.disposition,
        title: rule.title,
      })),
      guides: [...new Set(brief.rules.flatMap((rule) => (rule.guide ? [rule.guide] : [])))].sort(),
    },
    comments: local ? nodeComments(workspace, inventory, brief) : null,
    requests: brief.designRequests,
    delta: local ? nodeDelta(workspace, brief.node) : null,
    verdict: nodeVerdict(
      brief.node,
      brief.rules.map((rule) => ({ card: rule.card })),
      [...new Set(brief.rules.flatMap((rule) => (rule.guide ? [rule.guide] : [])))],
      devices,
      cases,
      brief.status,
      Boolean(brief.target),
      options.gates,
    ),
    evidence: nodeEvidence(workspace, brief.node),
    detail: options.detail ?? null,
  }
}

function clampItem(text: string, limit = ITEM_LIMIT): string {
  const flat = compact(text)
  return flat.length <= limit ? flat : `${flat.slice(0, limit - 1).trimEnd()}…`
}

function storyLine(card: NodeCard): string {
  if (!card.story) return "(no story declared)"
  return card.storyExports.length ? `${card.story} · ${card.storyExports.join(", ")}` : card.story
}

function deviceParts(card: NodeCard): string[] {
  if (!card.devices.length) return ["(no device declared)"]
  return card.devices.map((device) =>
    device.width === null ? device.device : `${device.device} ${device.width}`,
  )
}

function caseParts(card: NodeCard): string[] {
  if (!card.cases.length) return ["(no parity case)"]
  return card.cases.map((item) => {
    const head = `${item.device} ${item.width ?? "?"} ${item.layoutScope} ${item.verdict}`
    return item.note ? `${head} — ${clampItem(item.note, NOTE_LIMIT)}` : head
  })
}

function ruleParts(card: NodeCard): string[] {
  if (!card.rules.total) return ["no rule targets this node"]
  return [
    `${card.rules.total} (${card.rules.pending} pending)`,
    // The title is what the rule says: an id and a disposition tell a session
    // that a rule exists, not whether it binds the component it is reading.
    ...card.rules.cards.map((rule) =>
      rule.title
        ? `${rule.card} ${rule.disposition} — ${clampItem(rule.title, NOTE_LIMIT)}`
        : `${rule.card} ${rule.disposition}`,
    ),
    ...(card.rules.guides.length ? [`guide ${card.rules.guides.join(", ")}`] : []),
  ]
}

function commentParts(card: NodeCard): string[] {
  if (!card.comments) return ["(no snapshot: run figma comments --refresh)"]
  if (!card.comments.open) return ["no open thread"]
  return [
    `${card.comments.open} open · answered by source ${card.comments.answeredBySource} · needs design request ${card.comments.needsDesignRequest}`,
    // A count cannot be answered; the question has to be readable on the card.
    ...card.comments.threads.map((thread) => {
      const head = `${thread.anchor ?? "(unpinned)"} ${thread.author} ${thread.date}`
      const replies = thread.replies ? ` (+${thread.replies})` : ""
      return `${head}: ${clampItem(thread.message, THREAD_LIMIT)}${replies}`
    }),
  ]
}

function deltaParts(card: NodeCard): string[] {
  if (!card.delta) return ["(no live snapshot: run figma export to compare)"]
  const parts = [
    ...card.delta.variants.map((change) => `${change.nodeId} ${change.class}`),
    ...card.delta.changed,
  ]
  return parts.length ? parts : ["no change since the accepted version"]
}

function evidenceParts(card: NodeCard): string[] {
  if (!card.evidence.length) return ["(no evidence: run figma evidence)"]
  return card.evidence.map((entry) => (entry.stale ? `${entry.path} (stale)` : entry.path))
}

function sections(card: NodeCard): CardSection[] {
  return [
    { label: "node", parts: [card.name ? `${card.node} · ${card.name}` : card.node] },
    { label: "page", parts: [card.page ?? "(no inventory record)"] },
    { label: "status", parts: [card.status ?? "(no registry entry)"] },
    {
      label: "target",
      parts: [card.module ? [card.module, card.export].filter(Boolean).join(" · ") : "(no target)"],
    },
    { label: "story", parts: [storyLine(card)] },
    { label: "devices", parts: deviceParts(card) },
    { label: "cases", parts: caseParts(card) },
    { label: "rules", parts: ruleParts(card) },
    { label: "comments", parts: commentParts(card) },
    { label: "requests", parts: card.requests.length ? card.requests : ["none"] },
    { label: "delta", parts: deltaParts(card) },
    { label: "verdict", parts: card.verdict.length ? card.verdict : ["no check names this node"] },
    { label: "evidence", parts: evidenceParts(card) },
    { label: "note", parts: [card.note ? clampItem(card.note) : "(no registry note)"] },
    {
      label: "detail",
      parts: [card.detail ?? "(no detail written: figma brief --node <id> --card)"],
    },
  ]
}

const MARKER = "…"
const byteLength = (text: string): number => Buffer.byteLength(text, "utf8")

// The cut is a marker, never a silent drop: the last items of a section give way
// to `… +N more`, and the section that loses most is the one that is longest.
function renderSections(sections: readonly CardSection[], dropped: readonly number[]): string[] {
  return sections.map((section, index) => {
    const cut = dropped[index]
    const parts = [...section.parts]
    if (cut) parts.splice(parts.length - cut, cut, `${MARKER} +${cut} more`)
    return `${section.label.padEnd(LABEL_WIDTH)}${parts.join(" · ")}`.trimEnd()
  })
}

function trimToBudget(lines: string[], budget: number): string[] {
  const trimmed = [...lines]
  for (let guard = 0; guard < 4096; guard += 1) {
    const total = byteLength(trimmed.join("\n"))
    if (total <= budget) return trimmed
    let victim = 0
    for (let index = 1; index < trimmed.length; index += 1) {
      if (byteLength(trimmed[index]) > byteLength(trimmed[victim])) victim = index
    }
    const content = trimmed[victim].slice(LABEL_WIDTH)
    if (!content) return trimmed
    // The marker itself takes bytes: keeping the whole excess would leave the
    // card over the ceiling by the marker's length.
    const keep = Math.max(0, content.length - (total - budget) - byteLength(MARKER))
    const next = keep > 0 ? `${content.slice(0, keep).trimEnd()}${MARKER}` : ""
    trimmed[victim] = `${trimmed[victim].slice(0, LABEL_WIDTH)}${next}`
  }
  return trimmed
}

export function formatNodeCard(card: NodeCard): string[] {
  const blocks = sections(card)
  const dropped = blocks.map(() => 0)
  let lines = renderSections(blocks, dropped)
  while (byteLength(lines.join("\n")) > CARD_BUDGET) {
    let victim = -1
    for (let index = 0; index < blocks.length; index += 1) {
      if (blocks[index].parts.length - dropped[index] <= 1) continue
      if (victim < 0 || byteLength(lines[index]) >= byteLength(lines[victim])) victim = index
    }
    if (victim < 0) break
    dropped[victim] += 1
    lines = renderSections(blocks, dropped)
  }
  return trimToBudget(lines, CARD_BUDGET)
}
