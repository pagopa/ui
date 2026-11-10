// The node card: one bounded record per node, the verdict a session reads before
// it opens a file. `buildBrief` gathers the prose a hand-off needs; the card is
// the same data in a fixed shape — one line per section, a stated absence where
// a source has nothing, and a marker wherever a section was cut.
import fs from "node:fs"

import type { Workspace } from "../adapters/workspace.ts"
import { readJson } from "../lib/json.ts"
import { CASES_PATH, isDraftCase, loadCaseFile } from "../parity/cases.ts"
import { EVIDENCE_DIR, evidencePaths, loadManifest } from "../parity/evidence.ts"
import { buildBrief, compact, componentForNode, readInventory } from "./brief.ts"
import { canonicalWidth, checkDevices, declaredDevices, loadDevicePolicy } from "./devices.ts"
import { readLedger, readRulesSnapshot, rulesForNode } from "./rules.ts"
import { checkRules } from "./rules-workflow.ts"
import { compareSnapshots, normalizeLive } from "./snapshot.ts"

const DEVICE_POLICY_PATH = "src/catalog/figma/device-policy.json"
const LIVE_SNAPSHOT_PATH = ".figma/live-rest.json"

// The card's ceiling. `formatNodeCard` trims to it, so a node's record never
// costs more than this to read; `node-card.test.mjs` asserts every node of the
// committed inventory fits it.
export const CARD_BUDGET = 1536
const ITEM_LIMIT = 240
const NOTE_LIMIT = 80
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
    cards: Array<{ card: string; disposition: string }>
    guides: string[]
  }
  /** `null` when the comments snapshot is absent, which is not "no comments". */
  comments: { open: number; answeredBySource: number; needsDesignRequest: number } | null
  requests: string[]
  /** `null` when the pinned export is absent, which is not "no change". */
  delta: { variants: Array<{ nodeId: string; class: string }>; changed: string[] } | null
  verdict: string[]
  evidence: Array<{ path: string; stale: boolean }>
}

type CardSection = { label: string; parts: string[] }

function nodeCases(workspace: Workspace, node: string): NodeCardCase[] {
  return (
    loadCaseFile(workspace.path(CASES_PATH))
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

// A thread is answered by the source when a reviewed rule card already targets
// the node it is pinned to; otherwise the question is still the design owner's.
function splitComments(
  workspace: Workspace,
  threads: ReturnType<typeof buildBrief>["openComments"],
): NodeCard["comments"] {
  const ledger = readLedger(workspace.root, false)
  const snapshot = ledger ? readRulesSnapshot(workspace.root, false) : null
  const answeredBySource = threads.filter((thread) => {
    if (!ledger || !thread.nodeId) return false
    return rulesForNode(ledger, snapshot, workspace.root, thread.nodeId).some(
      (rule) => rule.disposition !== "pending",
    )
  }).length
  return {
    open: threads.length,
    answeredBySource,
    needsDesignRequest: threads.length - answeredBySource,
  }
}

function nodeDelta(workspace: Workspace, node: string): NodeCard["delta"] {
  const file = workspace.path(LIVE_SNAPSHOT_PATH)
  if (!fs.existsSync(file)) return null
  const inventory = readInventory(workspace)
  const component = componentForNode(inventory, node)
  const scope = new Set([node, ...(component?.variants ?? []).map((variant) => variant.nodeId)])
  const delta = compareSnapshots(inventory.components, normalizeLive(readJson(file), { workspace }))
  const variants = delta.changedVariants
    .filter((change) => scope.has(change.nodeId))
    .map((change) => ({ nodeId: change.nodeId, class: change.class }))
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId, undefined, { numeric: true }))
  const changed = [...delta.changed, ...delta.renamed, ...delta.moved]
    .filter((entry) => scope.has(entry.nodeId))
    .map((entry) => entry.change ?? "changed")
  return { variants, changed: [...new Set(changed)].sort() }
}

function nodeEvidence(workspace: Workspace, node: string): NodeCard["evidence"] {
  const paths = evidencePaths(workspace.workspaceRoot)
  if (!fs.existsSync(paths.manifest)) return []
  const inventory = readInventory(workspace)
  const component = componentForNode(inventory, node)
  const fingerprints = new Map(
    (component?.variants ?? []).map((variant) => [variant.nodeId, variant.designFingerprint]),
  )
  const scope = new Set([node, ...fingerprints.keys()])
  return Object.entries(loadManifest(paths.manifest).cases)
    .filter(([, entry]) => scope.has(entry.nodeId))
    .map(([, entry]) => ({
      path: `${EVIDENCE_DIR}/${entry.png}`,
      stale: fingerprints.get(entry.variant) !== entry.designFingerprint,
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
}

// Both gates walk the whole workspace, so a caller that builds several cards
// reads them once and hands the same result to each.
export function readNodeCardGates(workspace: Workspace): NodeCardGates {
  return {
    devices: checkDevices(workspace).problems,
    rules: readLedger(workspace.root, false) ? checkRules(workspace, false).errors : null,
  }
}

// The card is a verdict: every gate that already knows this node is wrong says
// so here, prefixed with the gate that says it.
function nodeVerdict(
  node: string,
  devices: NodeCardDevice[],
  cases: NodeCardCase[],
  status: string | null,
  hasTarget: boolean,
  gates: NodeCardGates,
): string[] {
  const names = namesNode(node)
  const verdicts: string[] = []
  if (status === "implemented" && !hasTarget) verdicts.push("catalogue implemented with no target")
  verdicts.push(...gates.devices.filter(names).map((line) => `devices ${line}`))
  if (gates.rules) {
    verdicts.push(...gates.rules.filter(names).map((line) => `rules ${line}`))
  }
  for (const device of devices) {
    const covered = cases.some(
      (item) => item.device === device.device && item.verdict === "reviewed",
    )
    if (!covered) verdicts.push(`devices ${device.device} has no reviewed case`)
  }
  return [...new Set(verdicts)].sort()
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
}

export function buildNodeCard(
  workspace: Workspace,
  requested: string,
  options: NodeCardOptions,
): NodeCard {
  const local = options.local ?? true
  const brief = buildBrief(workspace, requested)
  const inventory = readInventory(workspace)
  const component = componentForNode(inventory, requested)
  const policyFile = workspace.path(DEVICE_POLICY_PATH)
  const policy = fs.existsSync(policyFile) ? loadDevicePolicy(policyFile) : null
  const devices =
    policy && component
      ? declaredDevices(policy, component).map((device) => ({
          device,
          width: canonicalWidth(policy, device) ?? null,
        }))
      : []
  const cases = nodeCases(workspace, brief.node)
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
      cards: brief.rules.map((rule) => ({ card: rule.card, disposition: rule.disposition })),
      guides: [...new Set(brief.rules.flatMap((rule) => (rule.guide ? [rule.guide] : [])))].sort(),
    },
    comments: local && brief.commentsSnapshot ? splitComments(workspace, brief.openComments) : null,
    requests: brief.designRequests,
    delta: local ? nodeDelta(workspace, brief.node) : null,
    verdict: nodeVerdict(
      brief.node,
      devices,
      cases,
      brief.status,
      Boolean(brief.target),
      options.gates,
    ),
    evidence: nodeEvidence(workspace, brief.node),
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
    ...card.rules.cards.map((rule) => `${rule.card} ${rule.disposition}`),
    ...(card.rules.guides.length ? [`guide ${card.rules.guides.join(", ")}`] : []),
  ]
}

function commentParts(card: NodeCard): string[] {
  if (!card.comments) return ["(no snapshot: run figma comments --refresh)"]
  if (!card.comments.open) return ["no open thread"]
  return [
    `${card.comments.open} open`,
    `answered by source ${card.comments.answeredBySource}`,
    `needs design request ${card.comments.needsDesignRequest}`,
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
