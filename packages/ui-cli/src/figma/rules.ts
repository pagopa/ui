// The rules boxes of the Figma library, read-only.
//
// Every component page carries a `.Regole` instance: a stack of card instances
// grouped under "Consolidate" and "Da commentare". The boxes are siblings of
// the published component set, so the catalogue snapshot and the design
// fingerprint cannot see them. This module reads them, keeps the committed
// ledger of the decisions taken on each card, and answers "which rules apply to
// this node?" for the implementation brief.
//
// The Italian body never leaves the local snapshot: the ledger keeps the
// verbatim title as identity and the English title and summary as the reviewed
// record. The guide holds the rules that bind a consumer, in its own words.
import fs from "node:fs"
import path from "node:path"

import { readJson, writeJson } from "../lib/json.ts"
import { sha256 } from "../lib/hash.ts"
import { walkFiles } from "../lib/fs.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { InventorySchema, RegistrySchema } from "../schemas/catalogue.ts"
import {
  type ExtractedCard,
  type ExtractedContainer,
  type ExtractedPage,
  type RuleCard,
  type RuleDisposition,
  type RulesLedger,
  type RulesSnapshot,
  ExtractedCardSchema,
  RuleCardSchema,
  RuleScopeSchema,
  RulesLedgerSchema,
  RulesSnapshotSchema,
} from "../schemas/rules.ts"
import { fetchFilePages, fetchNodeTrees, type FigmaPage } from "./rest.ts"

export const RULES_PATH = "src/catalog/figma/rules.json"
export const RULES_SNAPSHOT_PATH = ".figma/rules.json"
const INVENTORY_PATH = "src/catalog/figma/inventory.json"
const REGISTRY_PATH = "src/catalog/figma/registry.json"
const FILE_MODULE = "src/catalog/figma/file.ts"
const GUIDES_DIR = "apps/storybook/src/guides"
const PLACEHOLDER_TITLE = "Nome della regola"
const PLACEHOLDER_BODY = "Spiegazione della regola a beneficio dei colleghi."

const KNOWN_STATUSES = new Set(["Ok!", "Da approvare", "Da fare", "Bozza"])

// The rules block is delimited so the check can find it without parsing prose.
// The markers are comments: they never render in Storybook.
export const RULES_START = "<!-- component-rules:start -->"
export const RULES_END = "<!-- component-rules:end -->"

export function componentRulesBlock(text: string): { start: number; end: number } | null {
  const start = text.indexOf(RULES_START)
  if (start < 0) return null
  const end = text.indexOf(RULES_END, start)
  if (end < 0) return null
  return { start, end }
}

export function hasComponentRules(text: string): boolean {
  return componentRulesBlock(text) !== null
}

// The block is the first thing in the guide: only whitespace may precede it.
export function componentRulesFirst(text: string): boolean {
  const block = componentRulesBlock(text)
  return block !== null && text.slice(0, block.start).trim() === ""
}

// ------------------------------------------------------------------ helpers

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {}
}

function children(node: unknown): Array<Record<string, unknown>> {
  const value = record(node).children
  return Array.isArray(value) ? value.map(record) : []
}

function text(node: unknown): string {
  const value = record(node).characters
  return typeof value === "string" ? value : ""
}

function nodeId(node: unknown): string | null {
  const value = record(node).id
  return typeof value === "string" ? value : null
}

function nodeName(node: unknown): string {
  const value = record(node).name
  return typeof value === "string" ? value : ""
}

function nodeType(node: unknown): string {
  const value = record(node).type
  return typeof value === "string" ? value : ""
}

function collectTexts(node: unknown, found: string[] = []): string[] {
  if (nodeType(node) === "TEXT") {
    const value = text(node).trim()
    if (value) found.push(value)
  }
  for (const child of children(node)) collectTexts(child, found)
  return found
}

function isCardInstance(node: unknown): boolean {
  return (
    nodeType(node) === "INSTANCE" && children(node).some((child) => nodeName(child) === "Frame 5")
  )
}

function isPlaceholder(title: string, body: string): boolean {
  return title === PLACEHOLDER_TITLE || body.startsWith(PLACEHOLDER_BODY)
}

export function sourceHash(title: string, body: string): string {
  return sha256(`${title.trim()}\n${body.replace(/\s+/g, " ").trim()}`).slice(0, 16)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function fileKeyOf(root: string): string {
  const source = fs.readFileSync(path.join(root, FILE_MODULE), "utf8")
  const match = /FIGMA_FILE_KEY\s*=\s*"([^"]+)"/.exec(source)
  if (!match?.[1]) throw new Error(`${FILE_MODULE}: FIGMA_FILE_KEY is missing`)
  return match[1]
}

function inventoryNodes(root: string): Map<string, { pageId: string; setName: string }> {
  const inventory = readJson(path.join(root, INVENTORY_PATH), InventorySchema)
  const nodes = new Map<string, { pageId: string; setName: string }>()
  for (const component of inventory.components) {
    nodes.set(component.nodeId, { pageId: component.pageId, setName: component.nodeId })
    for (const variant of component.variants ?? []) {
      nodes.set(variant.nodeId, { pageId: component.pageId, setName: component.nodeId })
    }
  }
  return nodes
}

function implementedTargets(root: string, pageId: string): string[] {
  const inventory = readJson(path.join(root, INVENTORY_PATH), InventorySchema)
  const registry = readJson(path.join(root, REGISTRY_PATH), RegistrySchema)
  return inventory.components
    .filter((component) => component.pageId === pageId)
    .filter((component) => registry.entries[component.nodeId]?.status === "implemented")
    .map((component) => component.nodeId)
}

// ------------------------------------------------------------------ extract

// The two text children of `Frame 12 > Frame 2` are the card title and body;
// the status is one of the fixed labels the card template renders. Anything
// else in the subtree (deadline, author, labels) is template furniture.
function parseCard(card: unknown, section: ExtractedCard["section"]): ExtractedCard | null {
  const id = nodeId(card)
  if (!id) return null
  const texts = collectTexts(card)
  const title = texts[0] ?? ""
  const body = texts[1] ?? ""
  if (!title) return null
  const status = texts.find((value) => KNOWN_STATUSES.has(value)) ?? ""
  return ExtractedCardSchema.parse({
    nodeId: id,
    title,
    body,
    status,
    section,
    placeholder: isPlaceholder(title, body),
  })
}

export function extractContainer(document: unknown): ExtractedContainer {
  const id = nodeId(document)
  if (!id) throw new Error("rules container has no node id")
  const cards: ExtractedCard[] = []
  function walk(node: unknown, section: ExtractedCard["section"]): void {
    const kids = children(node)
    const first = kids[0]
    const label = first && nodeType(first) === "TEXT" ? text(first).trim() : ""
    const current: ExtractedCard["section"] =
      label === "Consolidate" || label === "Da commentare" ? label : section
    for (const child of kids) {
      if (isCardInstance(child)) {
        const card = parseCard(child, current)
        if (card) cards.push(card)
        continue
      }
      walk(child, current)
    }
  }
  walk(document, null)
  return { nodeId: id, cards }
}

export function extractPages(
  pages: FigmaPage[],
  containers: Map<string, unknown[]>,
): ExtractedPage[] {
  return pages.map((page) => ({
    pageId: page.id,
    pageName: page.name,
    containers: (containers.get(page.id) ?? []).map((document) => extractContainer(document)),
  }))
}

// ------------------------------------------------------------------ snapshot

export function readRulesSnapshot(root: string, required = true): RulesSnapshot | null {
  const file = path.join(root, RULES_SNAPSHOT_PATH)
  if (!fs.existsSync(file)) {
    if (required) throw new UsageError(`${RULES_SNAPSHOT_PATH} is missing: run figma rules refresh`)
    return null
  }
  return readJson(file, RulesSnapshotSchema)
}

function writeRulesSnapshot(root: string, snapshot: RulesSnapshot): void {
  writeJson(path.join(root, RULES_SNAPSHOT_PATH), snapshot)
}

export function readLedger(root: string, required = true): RulesLedger | null {
  const file = path.join(root, RULES_PATH)
  if (!fs.existsSync(file)) {
    if (required) throw new UsageError(`${RULES_PATH} is missing: run figma rules init`)
    return null
  }
  return readJson(file, RulesLedgerSchema)
}

function canonicalCard(card: RuleCard): RuleCard {
  const ordered: Record<string, unknown> = {}
  for (const key of [
    "pageId",
    "page",
    "container",
    "section",
    "status",
    "title",
    "titleEn",
    "summary",
    "sourceHash",
    "targets",
    "scope",
    "disposition",
    "provisionalTargets",
    "duplicateOf",
    "guide",
    "reason",
    "request",
    "reviewedAt",
    "removedAt",
    "figmaVersion",
  ]) {
    const value = Object.entries(card).find(([name]) => name === key)?.[1]
    if (value === undefined) continue
    if (key === "provisionalTargets" && value === false) continue
    ordered[key] = value
  }
  return RuleCardSchema.parse(ordered)
}

export function canonicalLedger(ledger: RulesLedger): RulesLedger {
  const cards = Object.entries(ledger.cards)
    .sort(([leftId, left], [rightId, right]) => {
      const byPage = left.pageId.localeCompare(right.pageId)
      if (byPage !== 0) return byPage
      const byContainer = left.container.localeCompare(right.container)
      if (byContainer !== 0) return byContainer
      return leftId.localeCompare(rightId, "en", { numeric: true })
    })
    .map(([id, card]) => [id, canonicalCard(card)])
  return { schemaVersion: 1, fileKey: ledger.fileKey, cards: Object.fromEntries(cards) }
}

export function writeRulesLedger(root: string, ledger: RulesLedger): void {
  writeJson(path.join(root, RULES_PATH), canonicalLedger(ledger))
}

// ------------------------------------------------------------------ refresh

export async function refresh(
  workspace: Workspace,
  token: string,
  args: { pageId?: string; nodeId?: string },
): Promise<RulesSnapshot> {
  const root = workspace.root
  const fileKey = fileKeyOf(root)
  // One read answers both: the page list is pinned to the same version the
  // node reads below use.
  const { version, pages } = await fetchFilePages(fileKey, token)

  let selected = pages
  if (args.pageId) selected = pages.filter((page) => page.id === args.pageId)
  if (args.nodeId) {
    const inventory = inventoryNodes(root)
    const entry = inventory.get(args.nodeId)
    if (!entry) throw new UsageError(`${args.nodeId} is not a node of the inventory`)
    selected = pages.filter((page) => page.id === entry.pageId)
  }
  if (selected.length === 0) throw new UsageError("no page matched the requested scope")

  // Page children at depth 2 hold the `.Regole` instances; their subtree needs
  // the full depth, and `fetchNodeTrees` batches it.
  const pageDocuments = await fetchNodeTrees(
    fileKey,
    version,
    selected.map((page) => page.id),
    token,
    2,
  )
  const containers = new Map<string, string[]>()
  for (const page of selected) {
    const document = pageDocuments.get(page.id)
    containers.set(
      page.id,
      children(document)
        .filter((child) => [".Regole", "Regole"].includes(nodeName(child).trim()))
        .map((child) => nodeId(child))
        .filter((id): id is string => Boolean(id)),
    )
  }
  const ids = [...containers.values()].flat()
  const documents = await fetchNodeTrees(fileKey, version, ids, token)
  const extracted = extractPages(
    selected,
    new Map(
      [...containers.entries()].map(([pageId, containerIds]) => [
        pageId,
        containerIds.map((id) => {
          const document = documents.get(id)
          if (!document) throw new Error(`Figma returned no document for rules container ${id}`)
          return document
        }),
      ]),
    ),
  )

  const previous = readRulesSnapshot(root, false)
  const merged: RulesSnapshot = {
    fileKey,
    version,
    fetchedAt: new Date().toISOString(),
    pages:
      args.pageId || args.nodeId
        ? [
            ...(previous?.pages ?? []).filter(
              (page) => !selected.some((selectedPage) => selectedPage.id === page.pageId),
            ),
            ...extracted,
          ].sort((left, right) => left.pageId.localeCompare(right.pageId))
        : extracted,
  }
  writeRulesSnapshot(root, merged)
  return merged
}

// ------------------------------------------------------------------ ledger

function baseCard(extracted: ExtractedCard, page: ExtractedPage, pageTargets: string[]): RuleCard {
  const card: RuleCard = {
    pageId: page.pageId,
    page: page.pageName,
    container:
      page.containers.find((container) =>
        container.cards.some((card) => card.nodeId === extracted.nodeId),
      )?.nodeId ?? "",
    section: extracted.section,
    status: extracted.status,
    title: extracted.title,
    sourceHash: sourceHash(extracted.title, extracted.body),
    targets: pageTargets,
    scope: "component",
    disposition: "pending",
    provisionalTargets: true,
  }
  return card
}

function cardIndex(
  snapshot: RulesSnapshot,
): Map<string, { card: ExtractedCard; page: ExtractedPage }> {
  const index = new Map<string, { card: ExtractedCard; page: ExtractedPage }>()
  for (const page of snapshot.pages) {
    for (const container of page.containers) {
      for (const card of container.cards) index.set(card.nodeId, { card, page })
    }
  }
  return index
}

export function initLedger(snapshot: RulesSnapshot, ledger: RulesLedger, root: string): number {
  let added = 0
  for (const page of snapshot.pages) {
    const pageTargets = implementedTargets(root, page.pageId)
    for (const container of page.containers) {
      for (const card of container.cards) {
        if (card.placeholder || ledger.cards[card.nodeId]) continue
        ledger.cards[card.nodeId] = baseCard(card, page, pageTargets)
        added += 1
      }
    }
  }
  return added
}

export function plan(snapshot: RulesSnapshot, ledger: RulesLedger) {
  const live = cardIndex(snapshot)
  const fresh: string[] = []
  const stale: string[] = []
  const removed: string[] = []
  for (const [id, { card }] of live) {
    if (card.placeholder) continue
    const entry = ledger.cards[id]
    if (!entry) fresh.push(id)
    else if (
      entry.sourceHash !== sourceHash(card.title, card.body) ||
      entry.disposition === "removed"
    ) {
      stale.push(id)
    }
  }
  for (const [id, entry] of Object.entries(ledger.cards)) {
    if (live.has(id) || entry.disposition === "removed") continue
    removed.push(id)
  }
  return { fresh, stale, removed, live }
}

function normaliseTargets(root: string, values: string[]): string[] {
  const inventory = inventoryNodes(root)
  return [...new Set(values)].map((value) => {
    const entry = inventory.get(value)
    if (!entry) throw new UsageError(`${value} is not a node of the inventory`)
    return entry.setName
  })
}

export function mark(
  ledger: RulesLedger,
  snapshot: RulesSnapshot,
  root: string,
  workspaceRoot: string,
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
  },
): RuleCard {
  const found = cardIndex(snapshot).get(options.cardId)
  if (!found) throw new UsageError(`${options.cardId} is not a consolidated card of the snapshot`)
  if (found.card.placeholder) throw new UsageError(`${options.cardId} is a placeholder card`)

  const existing = ledger.cards[options.cardId]
  const card: RuleCard = {
    ...(existing ?? baseCard(found.card, found.page, implementedTargets(root, found.page.pageId))),
    title: found.card.title,
    section: found.card.section,
    status: found.card.status,
    sourceHash: sourceHash(found.card.title, found.card.body),
    disposition: options.disposition,
    figmaVersion: snapshot.version,
  }
  if (options.titleEn) card.titleEn = options.titleEn
  if (options.summary) card.summary = options.summary
  if (options.reason) card.reason = options.reason
  if (options.request) card.request = options.request
  if (options.guide) card.guide = options.guide
  if (options.duplicateOf) card.duplicateOf = options.duplicateOf
  if (options.targets) {
    card.targets = normaliseTargets(
      root,
      options.targets
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    )
  }
  if (options.scope) {
    const parsedScope = RuleScopeSchema.safeParse(options.scope)
    if (!parsedScope.success) throw new UsageError("invalid --scope")
    card.scope = parsedScope.data
  }
  card.provisionalTargets = card.targets.length === 0 && card.scope === "component"
  if (options.disposition === "removed") card.removedAt = today()
  if (options.disposition !== "pending") card.reviewedAt = today()

  if (options.disposition === "imported") {
    if (!card.guide) throw new UsageError("an imported rule needs --guide <path>")
    const guideFile = path.join(workspaceRoot, card.guide)
    if (!fs.existsSync(guideFile)) throw new UsageError(`${card.guide} does not exist`)
    const text = fs.readFileSync(guideFile, "utf8")
    if (!hasComponentRules(text)) {
      throw new UsageError(`${card.guide} has no component-rules block`)
    }
    if (!componentRulesFirst(text)) {
      throw new UsageError(`${card.guide} does not open with its component-rules block`)
    }
  }
  ledger.cards[options.cardId] = RuleCardSchema.parse(card)
  return ledger.cards[options.cardId]
}

export function sync(ledger: RulesLedger, snapshot: RulesSnapshot): number {
  const index = cardIndex(snapshot)
  let removed = 0
  for (const [id, card] of Object.entries(ledger.cards)) {
    if (index.has(id) || card.disposition === "removed") continue
    card.disposition = "removed"
    card.removedAt = today()
    removed += 1
  }
  return removed
}

// ------------------------------------------------------------------ check

export type CheckReport = {
  errors: string[]
  counts: Record<RuleDisposition | "stale", number>
}

const RULES_GATE = "pnpm nx run pagopa-ui-cli:check:rules"

export function check(
  ledger: RulesLedger,
  snapshot: RulesSnapshot | null,
  root: string,
  workspaceRoot: string,
  strict: boolean,
): CheckReport {
  const errors: string[] = []
  const inventory = inventoryNodes(root)
  const counts = {
    imported: 0,
    recorded: 0,
    duplicate: 0,
    "out-of-scope": 0,
    deferred: 0,
    conflict: 0,
    pending: 0,
    removed: 0,
    stale: 0,
  }
  const guidesWithBlock = new Set(
    walkFiles(path.join(workspaceRoot, GUIDES_DIR), (file) => file.endsWith(".md"))
      .filter((file) => hasComponentRules(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(workspaceRoot, file).split(path.sep).join("/")),
  )
  const importedGuides = new Set<string>()
  for (const [id, card] of Object.entries(ledger.cards)) {
    counts[card.disposition] += 1
    if (card.disposition === "pending" && strict) {
      errors.push(
        `${id}: pending rule on ${card.titleEn ?? card.title} — import it into a guide, defer it or consolidate it, then run \`${RULES_GATE}\``,
      )
    }
    for (const target of card.targets) {
      if (!inventory.has(target))
        errors.push(
          `${id}: unknown target ${target} — point the card at a node in the inventory, then run \`${RULES_GATE}\``,
        )
    }
    if (card.disposition === "imported") {
      if (!card.guide)
        errors.push(
          `${id}: imported rule has no guide — add "guide" to the card, then run \`${RULES_GATE}\``,
        )
      else {
        importedGuides.add(card.guide)
        if (!fs.existsSync(path.join(workspaceRoot, card.guide))) {
          errors.push(
            `${id}: guide ${card.guide} does not exist — write the guide or fix "guide", then run \`${RULES_GATE}\``,
          )
        } else {
          const text = fs.readFileSync(path.join(workspaceRoot, card.guide), "utf8")
          if (!hasComponentRules(text)) {
            errors.push(
              `${id}: guide ${card.guide} has no component-rules block — add the block, then run \`${RULES_GATE}\``,
            )
          } else if (!componentRulesFirst(text)) {
            errors.push(
              `${id}: guide ${card.guide} does not open with its component-rules block — move the block to the top, then run \`${RULES_GATE}\``,
            )
          }
        }
      }
    }
    if (card.disposition === "duplicate" && !ledger.cards[card.duplicateOf ?? ""]) {
      errors.push(
        `${id}: duplicateOf ${card.duplicateOf} is not in the ledger — point it at a ledger card, then run \`${RULES_GATE}\``,
      )
    }
    if (
      card.disposition === "conflict" &&
      card.request &&
      !fs.existsSync(path.join(workspaceRoot, card.request))
    ) {
      errors.push(
        `${id}: design request ${card.request} does not exist — write it under docs/design-requests, then run \`${RULES_GATE}\``,
      )
    }
  }
  for (const guide of guidesWithBlock) {
    if (!importedGuides.has(guide)) {
      errors.push(
        `${guide}: component-rules block with no imported rule — import the card or drop the block, then run \`${RULES_GATE}\``,
      )
    }
  }

  if (snapshot) {
    const diff = plan(snapshot, ledger)
    for (const id of diff.fresh)
      errors.push(
        `${id}: consolidated card not in the ledger (new) — record it with \`pnpm ui-cli figma rules mark\`, then run \`${RULES_GATE}\``,
      )
    for (const id of diff.stale)
      errors.push(
        `${id}: source changed since the review (stale) — read the current text with \`pnpm ui-cli figma rules show '${id}'\`, re-mark it with \`pnpm ui-cli figma rules mark '${id}' --disposition <disposition>\`, then run \`${RULES_GATE}\``,
      )
    for (const id of diff.removed)
      errors.push(
        `${id}: card disappeared from Figma — run \`pnpm ui-cli figma rules sync\`, then \`${RULES_GATE}\``,
      )
    counts.stale = diff.stale.length
  }
  return { errors, counts }
}

// ------------------------------------------------------------------ queries

export function rulesForNode(
  ledger: RulesLedger,
  snapshot: RulesSnapshot | null,
  root: string,
  requested: string,
): Array<RuleCard & { id: string; body?: string }> {
  const inventory = inventoryNodes(root)
  const entry = inventory.get(requested)
  if (!entry) throw new UsageError(`${requested} is not a node of the inventory`)
  const scope = new Set([requested, entry.setName])
  for (const [id, node] of inventory) if (node.setName === entry.setName) scope.add(id)
  return rulesInScope(ledger, snapshot, scope)
}

// A brief also reads the nodes the pinned inventory has not absorbed yet — the
// delta's additions — and those have no set to widen to, so they scope to
// themselves. The membership error stays where a node is named for the
// inventory, never where it is read.
export function rulesForUninventoriedNode(
  ledger: RulesLedger,
  snapshot: RulesSnapshot | null,
  requested: string,
): Array<RuleCard & { id: string; body?: string }> {
  return rulesInScope(ledger, snapshot, new Set([requested]))
}

function rulesInScope(
  ledger: RulesLedger,
  snapshot: RulesSnapshot | null,
  scope: Set<string>,
): Array<RuleCard & { id: string; body?: string }> {
  const live = snapshot ? cardIndex(snapshot) : new Map()
  return Object.entries(ledger.cards)
    .filter(([id, card]) => card.targets.some((target) => scope.has(target)) || scope.has(id))
    .filter(([, card]) => card.disposition !== "removed")
    .map(([id, card]) => ({ ...card, id, body: live.get(id)?.card.body }))
}

export function cardForNode(snapshot: RulesSnapshot, cardId: string) {
  return cardIndex(snapshot).get(cardId) ?? null
}
