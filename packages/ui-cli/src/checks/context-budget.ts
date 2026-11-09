// The context budget: what a Figma session must read before it can work. Every
// skill file, every declared route's transitive read set and every rendered
// context carries a ceiling here, and the committed baseline holds only how many
// entries are still over it, so the count can fall and never rise.
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import type { Workspace } from "../adapters/workspace.ts"
import { buildNodeCard, formatNodeCard } from "../figma/card.ts"
import { readInventory } from "../figma/brief.ts"
import { readLedger } from "../figma/rules.ts"
import { walkRelative } from "../lib/fs.ts"
import { readJson } from "../lib/json.ts"
import { report, type CheckReport } from "./report.ts"

const NAME = "context budget"
const LABEL = "data/context-budget.json"

export const CONTEXT_BUDGET_BASELINE_PATH = LABEL

// The ceilings live here and never in the baseline: a limit a commit can raise
// is not a limit. 1.5 KB is 1536 bytes, the size a card and an entry may reach.
export const CONTEXT_BUDGET_LIMITS = {
  entry: 1536,
  file: 4096,
  route: 8192,
  card: 1536,
  preamble: 1024,
} as const

export type ContextKind = keyof typeof CONTEXT_BUDGET_LIMITS

export const CONTEXT_KINDS: readonly ContextKind[] = ["entry", "file", "route", "card", "preamble"]

const CeilingsSchema = z.strictObject({
  entry: z.number().int().positive(),
  file: z.number().int().positive(),
  route: z.number().int().positive(),
  card: z.number().int().positive(),
  preamble: z.number().int().positive(),
})

export const ContextBudgetBaselineSchema = z.strictObject({
  ceilings: CeilingsSchema,
  overBudget: z.number().int().nonnegative(),
  note: z.string().min(1),
})

export type ContextBudgetBaseline = z.infer<typeof ContextBudgetBaselineSchema>

export interface RouteDeclaration {
  /** Printed as the route's name in the report. */
  readonly name: string
  /** The file a session opens first, relative to the workspace root. */
  readonly root: string
  /** Every corpus file the route may reach, relative to the workspace root. */
  readonly files: readonly string[]
}

export interface RenderedContext {
  readonly kind: "card" | "preamble"
  readonly name: string
  readonly render: (workspace: Workspace) => string
}

export interface BudgetEntry {
  readonly kind: ContextKind
  readonly name: string
  readonly bytes: number
  readonly ceiling: number
  /** The files a route's total is made of. */
  readonly files?: number
}

export interface ContextBudgetMeasurement {
  readonly entries: readonly BudgetEntry[]
  /** What could not be measured, or where a declaration drifts from the links. */
  readonly drift: readonly string[]
}

export interface MeasureOptions {
  readonly routes?: readonly RouteDeclaration[]
  readonly contexts?: readonly RenderedContext[]
}

export interface ContextBudgetOptions extends MeasureOptions {
  readonly baselineFile?: string
  readonly baseline?: ContextBudgetBaseline
  readonly report?: boolean
}

const SKILL_CORPUS = ".agents/skills"
// The third-party shadcn skill is installed for other work and no Figma route
// reads it; the doc-links check skips it for the same reason.
const THIRD_PARTY = ".agents/skills/shadcn/"
const WORKFLOW_SOURCE = ".github/extensions/figma-align/extension.mjs"

// The four routes a session can take, each declaring every file it may read.
// The declaration is checked against the markdown links, so it cannot quietly
// stop describing the corpus. Today every reference links to every other, so the
// four sets coincide; splitting them is what the reference splits buy.
export const CONTEXT_ROUTES: readonly RouteDeclaration[] = [
  {
    name: "live delta",
    root: ".agents/skills/figma-to-code/SKILL.md",
    files: [
      ".agents/skills/figma-to-code/SKILL.md",
      ".agents/skills/figma-to-code/references/artwork.md",
      ".agents/skills/figma-to-code/references/catalogue.md",
      ".agents/skills/figma-to-code/references/definition-of-done.md",
      ".agents/skills/figma-to-code/references/delta.md",
      ".agents/skills/figma-to-code/references/design-request.md",
      ".agents/skills/figma-to-code/references/devices.md",
      ".agents/skills/figma-to-code/references/handoff.md",
      ".agents/skills/figma-to-code/references/init.md",
      ".agents/skills/figma-to-code/references/new-from-figma.md",
      ".agents/skills/figma-to-code/references/new-without-node.md",
      ".agents/skills/figma-to-code/references/node-review.md",
      ".agents/skills/figma-to-code/references/parity-tooling.md",
      ".agents/skills/figma-to-code/references/prop-conventions.md",
      ".agents/skills/figma-to-code/references/rules.md",
      ".agents/skills/figma-to-code/references/tokens.md",
      ".agents/skills/figma-to-code/references/visual-parity.md",
    ],
  },
  {
    name: "single-node review",
    root: ".agents/skills/figma-to-code/references/node-review.md",
    files: [
      ".agents/skills/figma-to-code/references/artwork.md",
      ".agents/skills/figma-to-code/references/catalogue.md",
      ".agents/skills/figma-to-code/references/definition-of-done.md",
      ".agents/skills/figma-to-code/references/delta.md",
      ".agents/skills/figma-to-code/references/design-request.md",
      ".agents/skills/figma-to-code/references/devices.md",
      ".agents/skills/figma-to-code/references/handoff.md",
      ".agents/skills/figma-to-code/references/init.md",
      ".agents/skills/figma-to-code/references/new-from-figma.md",
      ".agents/skills/figma-to-code/references/new-without-node.md",
      ".agents/skills/figma-to-code/references/node-review.md",
      ".agents/skills/figma-to-code/references/parity-tooling.md",
      ".agents/skills/figma-to-code/references/prop-conventions.md",
      ".agents/skills/figma-to-code/references/rules.md",
      ".agents/skills/figma-to-code/references/tokens.md",
      ".agents/skills/figma-to-code/references/visual-parity.md",
    ],
  },
  {
    name: "parity wave",
    root: ".agents/skills/figma-to-code/references/visual-parity.md",
    files: [
      ".agents/skills/figma-to-code/references/artwork.md",
      ".agents/skills/figma-to-code/references/catalogue.md",
      ".agents/skills/figma-to-code/references/definition-of-done.md",
      ".agents/skills/figma-to-code/references/delta.md",
      ".agents/skills/figma-to-code/references/design-request.md",
      ".agents/skills/figma-to-code/references/devices.md",
      ".agents/skills/figma-to-code/references/handoff.md",
      ".agents/skills/figma-to-code/references/init.md",
      ".agents/skills/figma-to-code/references/new-from-figma.md",
      ".agents/skills/figma-to-code/references/new-without-node.md",
      ".agents/skills/figma-to-code/references/node-review.md",
      ".agents/skills/figma-to-code/references/parity-tooling.md",
      ".agents/skills/figma-to-code/references/prop-conventions.md",
      ".agents/skills/figma-to-code/references/rules.md",
      ".agents/skills/figma-to-code/references/tokens.md",
      ".agents/skills/figma-to-code/references/visual-parity.md",
    ],
  },
  {
    name: "eval and preflight",
    root: ".agents/skills/start-figma-to-code/SKILL.md",
    files: [
      ".agents/skills/figma-to-code/references/artwork.md",
      ".agents/skills/figma-to-code/references/catalogue.md",
      ".agents/skills/figma-to-code/references/definition-of-done.md",
      ".agents/skills/figma-to-code/references/delta.md",
      ".agents/skills/figma-to-code/references/design-request.md",
      ".agents/skills/figma-to-code/references/devices.md",
      ".agents/skills/figma-to-code/references/handoff.md",
      ".agents/skills/figma-to-code/references/init.md",
      ".agents/skills/figma-to-code/references/new-from-figma.md",
      ".agents/skills/figma-to-code/references/new-without-node.md",
      ".agents/skills/figma-to-code/references/node-review.md",
      ".agents/skills/figma-to-code/references/parity-tooling.md",
      ".agents/skills/figma-to-code/references/prop-conventions.md",
      ".agents/skills/figma-to-code/references/rules.md",
      ".agents/skills/figma-to-code/references/tokens.md",
      ".agents/skills/figma-to-code/references/visual-parity.md",
      ".agents/skills/start-figma-to-code/SKILL.md",
    ],
  },
]

export const RENDERED_CONTEXTS: readonly RenderedContext[] = [
  { kind: "card", name: "node card", render: renderNodeCard },
  { kind: "preamble", name: "workflow preamble", render: renderWorkflowPreamble },
]

const kilobytes = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`

const labelled = (entry: BudgetEntry): string =>
  entry.kind === "file" || entry.kind === "entry" ? entry.name : `"${entry.name}"`

const overBudget = (entry: BudgetEntry): boolean => entry.bytes > entry.ceiling

function overBudgetError(entry: BudgetEntry): string {
  const files = entry.kind === "route" ? ` (${entry.files ?? 0} files)` : ""
  return `${entry.kind} ${labelled(entry)}: ${kilobytes(entry.bytes)} over the ${kilobytes(entry.ceiling)} ceiling${files}`
}

function row(entry: BudgetEntry): string {
  const verdict = overBudget(entry) ? `over ${kilobytes(entry.ceiling)}` : "ok"
  return `${entry.kind.padEnd(9)}${labelled(entry).padEnd(72)}${kilobytes(entry.bytes).padStart(9)}  ${verdict}`
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error))

function size(root: string, file: string): number {
  return fs.statSync(path.join(root, file)).size
}

const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g

function links(file: string): string[] {
  const text = fs.readFileSync(file, "utf8")
  return [...text.matchAll(LINK)].map((match) => match[1].split("#")[0])
}

// A link only extends a route when it stays inside the skill corpus: the CLI
// README, CONTRIBUTING and the sources a reference points at are workspace
// documents a session reads once, not part of what the route must load.
function resolveLink(from: string, link: string): string | null {
  if (!link || link.startsWith("/") || link.includes(":")) return null
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(from), link))
  return target.startsWith(`${SKILL_CORPUS}/`) ? target : null
}

function reachableRouteFiles(workspace: Workspace, root: string): string[] {
  const pending = [root]
  const reached = new Set<string>()
  for (let index = 0; index < pending.length; index += 1) {
    const file = pending[index]
    if (reached.has(file)) continue
    reached.add(file)
    const absolute = path.join(workspace.workspaceRoot, file)
    if (!fs.existsSync(absolute)) continue
    for (const link of links(absolute)) {
      const target = resolveLink(file, link)
      if (target && !reached.has(target)) pending.push(target)
    }
  }
  return [...reached].sort()
}

function routeMeasurement(
  workspace: Workspace,
  route: RouteDeclaration,
): { files: string[]; errors: string[] } {
  if (!fs.existsSync(path.join(workspace.workspaceRoot, route.root))) {
    return { files: [], errors: [`route "${route.name}": root ${route.root} is missing`] }
  }
  const reachable = reachableRouteFiles(workspace, route.root)
  const declared = new Set(route.files)
  const errors = [
    ...reachable
      .filter((file) => !declared.has(file))
      .map(
        (file) => `route "${route.name}": ${file} is reachable from ${route.root} but not declared`,
      ),
    ...[...declared]
      .filter((file) => !reachable.includes(file))
      .map(
        (file) => `route "${route.name}": ${file} is declared but not reachable from ${route.root}`,
      ),
  ]
  return { files: reachable, errors }
}

// The card is measured as a clean checkout renders it: the `.figma/` exports
// that carry comments and the delta against the live file are gitignored, so
// letting them in would make the budget differ between a laptop and CI.
function renderNodeCard(workspace: Workspace): string {
  const inventory = readInventory(workspace)
  const ledger = readLedger(workspace.root, false)
  const counts = new Map<string, number>()
  for (const card of Object.values(ledger?.cards ?? {})) {
    for (const target of card.targets) counts.set(target, (counts.get(target) ?? 0) + 1)
  }
  const nodes = inventory.components.flatMap((component) => [
    component.nodeId,
    ...(component.variants ?? []).map((variant) => variant.nodeId),
  ])
  const node = nodes.sort((left, right) => (counts.get(right) ?? 0) - (counts.get(left) ?? 0))[0]
  if (!node) throw new Error("the inventory has no component to render a card for")
  return formatNodeCard(buildNodeCard(workspace, node, { local: false })).join("\n")
}

// The preamble is one template literal: its source is the text every agent of
// the workflow receives, whatever the run interpolates into it.
function renderWorkflowPreamble(workspace: Workspace): string {
  const source = fs.readFileSync(path.join(workspace.workspaceRoot, WORKFLOW_SOURCE), "utf8")
  const start = source.indexOf("function preamble(config) {")
  if (start === -1) throw new Error(`${WORKFLOW_SOURCE} has no preamble`)
  const open = source.indexOf("return `", start)
  if (open === -1) throw new Error(`${WORKFLOW_SOURCE} has no preamble template`)
  const from = open + "return `".length
  const end = source.indexOf("`\n}", from)
  if (end === -1) throw new Error(`${WORKFLOW_SOURCE} does not close the preamble template`)
  return source.slice(from, end)
}

export function measureContextBudget(
  workspace: Workspace,
  options: MeasureOptions = {},
): ContextBudgetMeasurement {
  const entries: BudgetEntry[] = []
  const drift: string[] = []
  for (const file of walkRelative(workspace.workspaceRoot, SKILL_CORPUS, (name) =>
    name.endsWith(".md"),
  )) {
    if (file.startsWith(THIRD_PARTY)) continue
    const kind = path.posix.basename(file) === "SKILL.md" ? "entry" : "file"
    entries.push({
      kind,
      name: file,
      bytes: size(workspace.workspaceRoot, file),
      ceiling: CONTEXT_BUDGET_LIMITS[kind],
    })
  }
  for (const route of options.routes ?? CONTEXT_ROUTES) {
    const measured = routeMeasurement(workspace, route)
    drift.push(...measured.errors)
    if (!measured.files.length) continue
    entries.push({
      kind: "route",
      name: route.name,
      bytes: measured.files.reduce((total, file) => total + size(workspace.workspaceRoot, file), 0),
      ceiling: CONTEXT_BUDGET_LIMITS.route,
      files: measured.files.length,
    })
  }
  for (const context of options.contexts ?? RENDERED_CONTEXTS) {
    try {
      const rendered = context.render(workspace)
      entries.push({
        kind: context.kind,
        name: context.name,
        bytes: Buffer.byteLength(rendered, "utf8"),
        ceiling: CONTEXT_BUDGET_LIMITS[context.kind],
      })
    } catch (error) {
      drift.push(`${context.kind} "${context.name}": ${message(error)}`)
    }
  }
  entries.sort((left, right) => right.bytes - left.bytes || (left.name < right.name ? -1 : 1))
  return { entries, drift }
}

function ceilingErrors(baseline: ContextBudgetBaseline): string[] {
  return CONTEXT_KINDS.filter(
    (kind) => baseline.ceilings[kind] !== CONTEXT_BUDGET_LIMITS[kind],
  ).map(
    (kind) =>
      `${LABEL}: the ${kind} ceiling is ${baseline.ceilings[kind]}, the limit is ${CONTEXT_BUDGET_LIMITS[kind]} — the ceilings cannot change`,
  )
}

// The ratchet: the count of entries past their ceiling must equal the baseline.
// A new offender fails and names itself, and a fix asks to lower the baseline,
// so the count only ever goes down.
function ratchetErrors(entries: readonly BudgetEntry[], baseline: ContextBudgetBaseline): string[] {
  const over = entries.filter(overBudget)
  if (over.length > baseline.overBudget) {
    return [
      `${LABEL}: ${over.length} entries are over budget, the baseline allows ${baseline.overBudget} — make the context fit instead of raising the count`,
      ...over.map(overBudgetError),
    ]
  }
  if (over.length < baseline.overBudget) {
    return [`${LABEL}: ${over.length} entries are over budget, lower overBudget to ${over.length}`]
  }
  return []
}

function readBaseline(file: string): ContextBudgetBaseline | null {
  return fs.existsSync(file) ? readJson(file, ContextBudgetBaselineSchema) : null
}

export function checkContextBudget(
  workspace: Workspace,
  options: ContextBudgetOptions = {},
): CheckReport {
  const file =
    options.baselineFile ?? path.join(workspace.toolingRoot, CONTEXT_BUDGET_BASELINE_PATH)
  const baseline = options.baseline ?? readBaseline(file)
  const { entries, drift } = measureContextBudget(workspace, options)
  const over = entries.filter(overBudget).length
  const summary = `${entries.length} entries, ${over} over budget, the baseline allows ${baseline?.overBudget ?? "(none)"}`
  const details = entries.map(row)
  if (options.report) return report(NAME, summary, [], { details })
  const problems = [
    ...(baseline
      ? ceilingErrors(baseline)
      : [`${LABEL}: missing — commit the count of over-budget entries`]),
    ...drift,
    ...(baseline ? ratchetErrors(entries, baseline) : []),
  ]
  return report(NAME, summary, problems, { details })
}
