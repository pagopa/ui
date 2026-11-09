// The context budget: what a Figma session must read before it can work. Every
// skill file, every declared route's transitive read set and every rendered
// context carries a ceiling held in `context-budget-limits.ts`, and the committed
// baseline holds only the ratchet — how many entries are still over their ceiling
// and how many bytes the whole measurement takes — so both can fall and never rise.
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import type { Workspace } from "../adapters/workspace.ts"
import { buildNodeCard, formatNodeCard, readNodeCardGates } from "../figma/card.ts"
import { readInventory } from "../figma/brief.ts"
import { readLedger } from "../figma/rules.ts"
import { walkRelative } from "../lib/fs.ts"
import { readJson } from "../lib/json.ts"
import { CONTEXT_BUDGET_LIMITS, type ContextKind } from "./context-budget-limits.ts"
import { report, type CheckReport } from "./report.ts"

const NAME = "context budget"
const LABEL = "data/context-budget.json"
const GATE = "pnpm nx run pagopa-ui-cli:check:context-budget"

export const CONTEXT_BUDGET_BASELINE_PATH = LABEL

export { CONTEXT_BUDGET_LIMITS, CONTEXT_KINDS, type ContextKind } from "./context-budget-limits.ts"

// The ratchet state, and only that: the ceilings are code, so a commit that
// raises one edits `context-budget-limits.ts` and the test that pins it, never
// this file.
export const ContextBudgetBaselineSchema = z.strictObject({
  overBudget: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
})

export type ContextBudgetBaseline = z.infer<typeof ContextBudgetBaselineSchema>

export interface RouteDeclaration {
  /** Printed as the route's name in the report. */
  readonly name: string
  /** The file a session opens first, relative to the workspace root. */
  readonly root: string
  /**
   * Where the read set stops: the root of another declared route, or the
   * `SKILL.md` of another skill. A link across one is allowed and not followed,
   * so the route it enters counts those bytes.
   */
  readonly boundaries: readonly string[]
  /** Every corpus file the route reads, relative to the workspace root. */
  readonly files: readonly string[]
}

export interface RenderedContext {
  readonly kind: "card" | "preamble"
  readonly name: string
  /** `null` when the gitignored export this context needs is absent. */
  readonly render: (workspace: Workspace) => string | null
  /** Measured against its ceiling only where the export exists, and never in the total. */
  readonly snapshot?: boolean
}

export interface BudgetEntry {
  readonly kind: ContextKind
  readonly name: string
  readonly bytes: number
  readonly ceiling: number
  /** The files a route's total is made of. */
  readonly files?: number
  /** A card a session reads only where the gitignored `.figma/` exports exist. */
  readonly snapshot?: boolean
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

const FIGMA = ".agents/skills/figma-to-code"
const FIGMA_REFERENCES = `${FIGMA}/references`
const STANDARDS = ".agents/skills/pagopa-ui-standards"
const STANDARDS_REFERENCES = `${STANDARDS}/references`
const PREFLIGHT = ".agents/skills/start-figma-to-code"

// The routes a session can take, named for the work and each declaring every
// file it reads. The declaration is checked against the markdown links, so it
// cannot quietly stop describing the corpus: a file reachable but undeclared, or
// declared but unreachable, fails the check. Routes overlap where a session
// shares a file, and a boundary is what keeps the overlap from counting twice:
// the read set stops at another route's root and at another skill's entry, so a
// skill links its branches and its sibling skill normally.
export const CONTEXT_ROUTES: readonly RouteDeclaration[] = [
  {
    name: "live delta",
    root: `${FIGMA}/SKILL.md`,
    boundaries: [
      `${FIGMA_REFERENCES}/artwork.md`,
      `${FIGMA_REFERENCES}/catalogue/files.md`,
      `${FIGMA_REFERENCES}/catalogue/statuses.md`,
      `${FIGMA_REFERENCES}/definition-of-done.md`,
      `${FIGMA_REFERENCES}/design-request.md`,
      `${FIGMA_REFERENCES}/devices/vocabulary.md`,
      `${FIGMA_REFERENCES}/new-from-figma.md`,
      `${FIGMA_REFERENCES}/new-without-node.md`,
      `${FIGMA_REFERENCES}/node-review.md`,
      `${FIGMA_REFERENCES}/tokens.md`,
      `${FIGMA_REFERENCES}/visual-parity.md`,
      `${STANDARDS}/SKILL.md`,
    ],
    files: [`${FIGMA}/SKILL.md`, `${FIGMA_REFERENCES}/delta.md`, `${FIGMA_REFERENCES}/init.md`],
  },
  {
    name: "single-node review",
    root: `${FIGMA_REFERENCES}/node-review.md`,
    boundaries: [`${FIGMA_REFERENCES}/catalogue/statuses.md`],
    files: [`${FIGMA_REFERENCES}/node-review.md`, `${FIGMA_REFERENCES}/rules.md`],
  },
  {
    name: "closing gates",
    root: `${FIGMA_REFERENCES}/definition-of-done.md`,
    boundaries: [`${STANDARDS}/SKILL.md`],
    files: [`${FIGMA_REFERENCES}/definition-of-done.md`],
  },
  {
    name: "node statuses",
    root: `${FIGMA_REFERENCES}/catalogue/statuses.md`,
    boundaries: [],
    files: [`${FIGMA_REFERENCES}/catalogue/statuses.md`],
  },
  {
    name: "parity wave",
    root: `${FIGMA_REFERENCES}/visual-parity.md`,
    boundaries: [],
    files: [`${FIGMA_REFERENCES}/parity-tooling.md`, `${FIGMA_REFERENCES}/visual-parity.md`],
  },
  {
    name: "eval and preflight",
    root: `${PREFLIGHT}/SKILL.md`,
    boundaries: [`${FIGMA_REFERENCES}/definition-of-done.md`],
    files: [`${FIGMA_REFERENCES}/handoff.md`, `${PREFLIGHT}/SKILL.md`],
  },
  {
    name: "new component from a node",
    root: `${FIGMA_REFERENCES}/new-from-figma.md`,
    boundaries: [`${STANDARDS_REFERENCES}/prop-conventions.md`],
    files: [`${FIGMA_REFERENCES}/new-from-figma.md`],
  },
  {
    name: "new component without a node",
    root: `${FIGMA_REFERENCES}/new-without-node.md`,
    boundaries: [],
    files: [`${FIGMA_REFERENCES}/new-without-node.md`],
  },
  {
    name: "design request",
    root: `${FIGMA_REFERENCES}/design-request.md`,
    boundaries: [],
    files: [`${FIGMA_REFERENCES}/design-request.md`],
  },
  {
    name: "device vocabulary",
    root: `${FIGMA_REFERENCES}/devices/vocabulary.md`,
    boundaries: [],
    files: [
      `${FIGMA_REFERENCES}/devices/loop.md`,
      `${FIGMA_REFERENCES}/devices/scope.md`,
      `${FIGMA_REFERENCES}/devices/vocabulary.md`,
    ],
  },
  {
    name: "catalogue data",
    root: `${FIGMA_REFERENCES}/catalogue/files.md`,
    boundaries: [],
    files: [
      `${FIGMA_REFERENCES}/catalogue/files.md`,
      `${FIGMA_REFERENCES}/catalogue/page-surface.md`,
    ],
  },
  {
    name: "artwork",
    root: `${FIGMA_REFERENCES}/artwork.md`,
    boundaries: [],
    files: [`${FIGMA_REFERENCES}/artwork.md`],
  },
  {
    name: "foundation tokens",
    root: `${FIGMA_REFERENCES}/tokens.md`,
    boundaries: [],
    files: [`${FIGMA_REFERENCES}/tokens.md`],
  },
  {
    name: "component standards",
    root: `${STANDARDS}/SKILL.md`,
    boundaries: [`${STANDARDS_REFERENCES}/prop-conventions.md`],
    files: [
      `${STANDARDS}/SKILL.md`,
      `${STANDARDS_REFERENCES}/definition-of-done.md`,
      `${STANDARDS_REFERENCES}/story-contracts.md`,
    ],
  },
  {
    name: "prop conventions",
    root: `${STANDARDS_REFERENCES}/prop-conventions.md`,
    boundaries: [],
    files: [`${STANDARDS_REFERENCES}/prop-conventions.md`],
  },
]

// The card is measured twice. The clean one is what CI renders and what pins the
// bytes a clean checkout reads; the local one adds the comment threads and the
// delta, which is what a session on a laptop actually reads, so the ceiling has
// to cover it too. It is skipped where the gitignored `.figma/` exports are
// absent, which is every clean checkout.
export const RENDERED_CONTEXTS: readonly RenderedContext[] = [
  {
    kind: "card",
    name: "node card",
    render: (workspace) => renderNodeCard(workspace, false),
  },
  {
    kind: "card",
    name: "node card with local comments and delta",
    render: (workspace) => renderNodeCard(workspace, true),
    snapshot: true,
  },
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

function reachableRouteFiles(
  workspace: Workspace,
  root: string,
  boundaries: ReadonlySet<string>,
): string[] {
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
      if (target && !boundaries.has(target) && !reached.has(target)) pending.push(target)
    }
  }
  return [...reached].sort()
}

// A boundary is where another route or another skill begins, so nothing else may
// be declared as one: a route that named an arbitrary file would stop there and
// report a read set smaller than the bytes a session loads.
function boundaryErrors(routes: readonly RouteDeclaration[]): string[] {
  const roots = new Set(routes.map((route) => route.root))
  return routes.flatMap((route) =>
    route.boundaries
      .filter((boundary) => !roots.has(boundary) && path.posix.basename(boundary) !== "SKILL.md")
      .map(
        (boundary) =>
          `route "${route.name}": ${boundary} is declared as a boundary but is neither a route root nor a skill entry`,
      ),
  )
}

function routeMeasurement(
  workspace: Workspace,
  route: RouteDeclaration,
): { files: string[]; errors: string[] } {
  if (!fs.existsSync(path.join(workspace.workspaceRoot, route.root))) {
    return { files: [], errors: [`route "${route.name}": root ${route.root} is missing`] }
  }
  const reachable = reachableRouteFiles(workspace, route.root, new Set(route.boundaries))
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

// The card a clean checkout renders carries no `.figma/` export: the exports
// that hold comments and the delta against the live file are gitignored, so
// letting them into the deterministic measurement would make the budget differ
// between a laptop and CI. The local card measures them against the same ceiling.
const CARD_SNAPSHOTS = [".figma/live-rest.json", ".figma/comments.json"]

function hasCardSnapshot(workspace: Workspace): boolean {
  return CARD_SNAPSHOTS.some((snapshot) => fs.existsSync(workspace.path(snapshot)))
}

function renderNodeCard(workspace: Workspace, local: boolean): string | null {
  if (local && !hasCardSnapshot(workspace)) return null
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
  const gates = readNodeCardGates(workspace)
  return formatNodeCard(buildNodeCard(workspace, node, { local, gates })).join("\n")
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
  const routes = options.routes ?? CONTEXT_ROUTES
  const drift: string[] = boundaryErrors(routes)
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
  for (const route of routes) {
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
      if (rendered === null) continue
      entries.push({
        kind: context.kind,
        name: context.name,
        bytes: Buffer.byteLength(rendered, "utf8"),
        ceiling: CONTEXT_BUDGET_LIMITS[context.kind],
        ...(context.snapshot ? { snapshot: true } : {}),
      })
    } catch (error) {
      drift.push(`${context.kind} "${context.name}": ${message(error)}`)
    }
  }
  entries.sort((left, right) => right.bytes - left.bytes || (left.name < right.name ? -1 : 1))
  return { entries, drift }
}

// The ratchet's total is the corpus a session reads, file by file: a route, a
// card and the preamble are derived views that re-measure those bytes, so adding
// a route — the point of the model — never moves the total.
const corpus = (entry: BudgetEntry): boolean => entry.kind === "file" || entry.kind === "entry"

const totalBytes = (entries: readonly BudgetEntry[]): number =>
  entries.reduce((total, entry) => total + (corpus(entry) ? entry.bytes : 0), 0)

// The ratchet: the count of entries past their ceiling and the corpus the clean
// checkout measures must equal the baseline. A new offender or a larger total
// fails and names itself, and a fix asks to lower the baseline, so both only ever
// go down. The total is what keeps the ratchet live at zero offenders: a byte
// added to any skill file still fails.
function ratchetErrors(entries: readonly BudgetEntry[], baseline: ContextBudgetBaseline): string[] {
  const errors: string[] = []
  const over = entries.filter(overBudget)
  if (over.length > baseline.overBudget) {
    errors.push(
      `${LABEL}: ${over.length} entries are over budget, the baseline allows ${baseline.overBudget} — make the context fit instead of raising the count, then run \`${GATE}\``,
      ...over.map(overBudgetError),
    )
  }
  if (over.length < baseline.overBudget) {
    errors.push(
      `${LABEL}: ${over.length} entries are over budget, lower overBudget to ${over.length} and run \`${GATE}\``,
    )
  }
  const total = totalBytes(entries)
  if (total > baseline.totalBytes) {
    errors.push(
      `${LABEL}: the measured context is ${total} bytes, the baseline allows ${baseline.totalBytes} — cut the context instead of raising the total, then run \`${GATE}\``,
    )
  }
  if (total < baseline.totalBytes) {
    errors.push(
      `${LABEL}: the measured context is ${total} bytes, lower totalBytes to ${total} and run \`${GATE}\``,
    )
  }
  return errors
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
  const total = totalBytes(entries)
  const allows = baseline
    ? `${baseline.overBudget} over and ${baseline.totalBytes} bytes`
    : "(none)"
  const summary = `${entries.length} entries, ${over} over budget, ${total} bytes, the baseline allows ${allows}`
  const details = entries.map(row)
  if (options.report) return report(NAME, summary, [], { details })
  const problems = [
    ...(baseline
      ? []
      : [`${LABEL}: missing — commit the ratchet state \`check context-budget --report\` prints`]),
    ...drift,
    ...(baseline ? ratchetErrors(entries, baseline) : []),
  ]
  return report(NAME, summary, problems, { details })
}
