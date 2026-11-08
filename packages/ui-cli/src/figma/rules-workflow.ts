import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import {
  check,
  initLedger,
  mark,
  plan,
  readLedger,
  readRulesSnapshot,
  refresh,
  sync,
  writeRulesLedger,
  type CheckReport,
} from "./rules.ts"
import type {
  RuleDisposition,
  RuleCard,
  RulesLedger,
  RulesSnapshot,
  ExtractedCard,
} from "../schemas/rules.ts"

export type RulesPlanReport = {
  hasSnapshot: boolean
  version: string
  consolidated: number
  counts: Record<string, number>
  new: string[]
  stale: string[]
  removed: string[]
  titles: Record<string, string>
}

function requireSnapshot(workspace: Workspace): RulesSnapshot {
  const snapshot = readRulesSnapshot(workspace.root, false)
  if (!snapshot) throw new UsageError(".figma/rules.json is missing: run figma rules refresh")
  return snapshot
}

function requireLedger(workspace: Workspace): RulesLedger {
  const ledger = readLedger(workspace.root, false)
  if (!ledger) throw new UsageError("src/catalog/figma/rules.json is missing: run figma rules init")
  return ledger
}

export async function refreshRules(
  workspace: Workspace,
  token: string,
  options: { pageId?: string; nodeId?: string },
): Promise<RulesSnapshot> {
  return refresh(workspace, token, options)
}

export function initializeRules(workspace: Workspace): { added: number; total: number } {
  const snapshot = requireSnapshot(workspace)
  const ledger = readLedger(workspace.root, false) ?? {
    schemaVersion: 1 as const,
    fileKey: snapshot.fileKey,
    cards: {},
  }
  const added = initLedger(snapshot, ledger, workspace.root)
  writeRulesLedger(workspace.root, ledger)
  return { added, total: Object.keys(ledger.cards).length }
}

export function synchronizeRules(workspace: Workspace): { removed: number; total: number } {
  const snapshot = requireSnapshot(workspace)
  const ledger = requireLedger(workspace)
  const removed = sync(ledger, snapshot)
  writeRulesLedger(workspace.root, ledger)
  return { removed, total: Object.keys(ledger.cards).length }
}

export function markRule(
  workspace: Workspace,
  options: {
    cardId: string
    disposition: RuleDisposition
    titleEn?: string
    summary?: string
    guide?: string
    targets?: string
    reason?: string
    duplicateOf?: string
    request?: string
    scope?: string
    dryRun?: boolean
  },
): RuleCard {
  const snapshot = requireSnapshot(workspace)
  const ledger = requireLedger(workspace)
  const result = mark(ledger, snapshot, workspace.root, workspace.workspaceRoot, options)
  if (!options.dryRun) writeRulesLedger(workspace.root, ledger)
  return result
}

function titleCounts(ledger: RulesLedger): Record<string, number> {
  return Object.values(ledger.cards).reduce<Record<string, number>>((counts, card) => {
    counts[card.disposition] = (counts[card.disposition] ?? 0) + 1
    return counts
  }, {})
}

export function rulesPlan(workspace: Workspace): RulesPlanReport {
  const ledger = requireLedger(workspace)
  const snapshot = readRulesSnapshot(workspace.root, false)
  if (!snapshot) {
    return {
      hasSnapshot: false,
      version: ledger.fileKey,
      consolidated: 0,
      counts: titleCounts(ledger),
      new: [],
      stale: [],
      removed: [],
      titles: Object.fromEntries(
        Object.entries(ledger.cards).map(([id, card]) => [id, card.title]),
      ),
    }
  }
  const delta = plan(snapshot, ledger)
  return {
    hasSnapshot: true,
    version: snapshot.version,
    consolidated: [...delta.live.values()].filter((entry) => !entry.card.placeholder).length,
    counts: titleCounts(ledger),
    new: delta.fresh,
    stale: delta.stale,
    removed: delta.removed,
    titles: {
      ...Object.fromEntries(Object.entries(ledger.cards).map(([id, card]) => [id, card.title])),
      ...Object.fromEntries([...delta.live].map(([id, value]) => [id, value.card.title])),
    },
  }
}

export function checkRules(workspace: Workspace, strict: boolean): CheckReport {
  const ledger = requireLedger(workspace)
  const snapshot = readRulesSnapshot(workspace.root, false)
  return check(ledger, snapshot, workspace.root, workspace.workspaceRoot, strict)
}

export function readRulesForNode(workspace: Workspace, nodeId: string) {
  const ledger = requireLedger(workspace)
  const snapshot = readRulesSnapshot(workspace.root, false)
  return { snapshot, ledger, cards: importRulesForNode(ledger, snapshot, workspace.root, nodeId) }
}

export function readRuleCard(workspace: Workspace, cardId: string) {
  const snapshot = requireSnapshot(workspace)
  const ledger = requireLedger(workspace)
  const found = importRuleCard(snapshot, cardId)
  if (!found) throw new UsageError(`${cardId} is not in the live snapshot`)
  return { card: found.card, entry: ledger.cards[cardId] ?? null }
}

export function formatRulesPlan(report: RulesPlanReport): string[] {
  if (!report.version) return []
  const lines = [
    `rules: ${report.consolidated} consolidated · ${report.counts.imported ?? 0} imported · ` +
      `${report.counts.recorded ?? 0} recorded · ${report.counts.pending ?? 0} pending · ${report.stale.length} stale`,
    `cards: ${report.new.length} new · ${report.stale.length} stale · ${report.removed.length} removed`,
  ]
  for (const id of [...report.new, ...report.stale]) {
    lines.push(`  ${report.new.includes(id) ? "new  " : "stale"} ${id} ${report.titles[id] ?? ""}`)
  }
  for (const id of report.removed) lines.push(`  removed ${id} ${report.titles[id] ?? ""}`)
  return lines
}

export function formatRulesCheck(report: CheckReport, hasSnapshot: boolean): string[] {
  if (report.errors.length)
    return [
      `rules:check: ${report.errors.length} problem(s)`,
      ...report.errors.map((error) => `  ${error}`),
    ]
  const total = Object.values(report.counts).reduce((sum, value) => sum + value, 0)
  return [
    `rules:check: ok (${total} cards, ${report.counts.pending} pending${hasSnapshot ? ", snapshot compared" : ", no snapshot"})`,
  ]
}

import {
  rulesForNode as importRulesForNode,
  cardForNode as importRuleCard,
  sourceHash,
} from "./rules.ts"

export function formatRuleCard(card: ExtractedCard, entry: RuleCard | null): string[] {
  return [
    `card     ${card.nodeId} · ${card.section ?? "unfiled"} · ${card.status}`,
    `title    ${card.title}`,
    `body     ${card.body.replace(/\s+/g, " ")}`,
    `hash     ${sourceHash(card.title, card.body)}`,
    ...(entry
      ? [`decision ${entry.disposition}${entry.titleEn ? ` · ${entry.titleEn}` : ""}`]
      : []),
  ]
}
