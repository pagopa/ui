import { declaredDevices, deviceAxes, type DeviceStats } from "./devices.ts"
import { implementationOrder, type DeltaNode, type SnapshotDelta } from "./snapshot.ts"
import { deltaWorkSet } from "./work-set.ts"
import type { Workspace } from "../adapters/workspace.ts"
import type { DevicePolicy } from "../schemas/devices.ts"
import type { InventoryNode, Registry } from "../schemas/catalogue.ts"
import type { TokenDrift } from "./tokens.ts"

export interface CatalogueRenderContext {
  workspace: Workspace
  inventory: { fileKey: string }
  registry: Registry
  delta: SnapshotDelta
  live: InventoryNode[] | null
  committed: InventoryNode[]
  liveVersion?: string
  devicePolicy: DevicePolicy | null
  deviceStats: DeviceStats | null
  bulkByNode: Map<string, { status?: string }>
  bulkByPage: Map<string, { status?: string }>
  entries: Registry["entries"]
  /** The variables the same run read, when the run asked for them. */
  tokenDrift?: TokenDrift | null
  /** The `.Regole` ledger compared with its snapshot, as `figma rules plan` reads it. */
  rulesDrift?: RulesDrift | null
  /** The comment threads the same run read, when it read them. */
  commentDrift?: CommentDrift | null
}

export type RulesDrift = {
  new: readonly string[]
  stale: readonly string[]
  removed: readonly string[]
  consolidated: number
}

export type CommentDrift = { threads: number; open: number }

type DeltaKey = "added" | "changed" | "renamed" | "moved" | "removed" | "affected" | "baseline"

const classes: Array<[DeltaKey, string]> = [
  ["added", "New nodes"],
  ["changed", "Changed nodes"],
  ["renamed", "Renamed identities"],
  ["moved", "Moved identities"],
  ["removed", "Removed nodes"],
  ["affected", "Affected implementations"],
  ["baseline", "Missing design baseline"],
]

const deviceInstruction =
  "A `Device` axis is part of the contract: inspect and render **every** declared " +
  "device (`.agents/skills/figma-to-code/references/devices/scope.md`); save one case per device."

function nodeLink(fileKey: string, nodeId: string): string {
  return `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(":", "-")}`
}

function boxText(box: { width: number; height: number } | undefined): string {
  return box ? `${box.width}×${box.height}` : "box unknown"
}

function renderDevices(
  fileKey: string,
  policy: DevicePolicy | null,
  node: InventoryNode,
  changed: Map<string, string>,
): string[] {
  if (!policy) return []
  const variants = node.variants ?? []
  const devices = declaredDevices(policy, node)
  if (!variants.length) {
    if (!devices.length) return []
    const axes = deviceAxes(policy, node)
      .map((axis) => `\`${axis.token}\``)
      .join(", ")
    return [
      `- devices (${devices.length} declared by ${axes}): ` +
        `${devices.map((device) => `\`${device}\``).join(" · ")} · no per-variant box in this export`,
      `  - ${deviceInstruction}`,
    ]
  }
  const lines = [`- devices (${devices.length} declared):`]
  for (const variant of variants) {
    const change = changed.get(variant.nodeId)
    lines.push(
      `  - \`${variant.device ?? "any"}\` · \`${variant.nodeId}\` · ${boxText(variant.box)} · ` +
        `[${variant.name}](${nodeLink(fileKey, variant.nodeId)}) · ${change ? `changed (${change})` : "unchanged"}`,
    )
  }
  lines.push(
    devices.length
      ? `  - ${deviceInstruction}`
      : "  - no device declared: one composition at every width",
  )
  return lines
}

function reviewInstructions(): string[] {
  return [
    "",
    "## Instructions — review",
    "",
    "For every node below, record one decision in `src/catalog/figma/registry.json`:",
    "",
    '1. still matches the source → set `status: "implemented"`;',
    "2. must change → update the component and its story in this PR, then set `implemented`;",
    "3. out of scope → set `excluded` with a reason.",
    "",
    "## Instructions — agent handoff",
    "",
    "This pull request is the handoff: a coding agent completes the alignment on this branch.",
    "",
    "- Procedure: follow `AGENTS.md`: the `figma-to-code` skill (Figma delta use case) for the alignment and the `pagopa-ui-standards` skill for every component it touches; Figma stays read-only.",
    "- Inspect each node below in Figma with the Figma MCP (`get_design_context`, `get_screenshot`) or `pnpm nx run pagopa-ui-cli:figma:export` when `FIGMA_TOKEN` is in the environment.",
    "- Record every decision in `src/catalog/figma/registry.json`; an `implemented` entry needs `target.module`, `target.export` and `target.story`, and a story that renders the export.",
    "- The public API is frozen (`src/pagopa-ui.ts`); historical `pending` nodes are reviewed per node on demand, never in bulk.",
    "- Run the verify chain below and report the results. Commit the alignment on this branch; the merge is the review record.",
    "",
    "## Instructions — verify",
    "",
    "Run and report the green chain documented in `CONTRIBUTING.md`:",
    "`pnpm nx run workspace:verify`",
    "",
  ]
}

const valueOf = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value ?? null)

/** The token half of the summary: named only when the run read the variables. */
function tokenSummary(drift: TokenDrift | null | undefined): string[] {
  if (!drift) return []
  const total =
    drift.added.length +
    drift.changed.length +
    drift.renamed.length +
    drift.removed.length +
    drift.unmapped.length +
    drift.unreadable.length
  return [`- Tokens: ${total}`]
}

/**
 * The variables the same run compared with `packages/tokens/src/manifest.json`.
 * A variable nobody curated is `unmapped` rather than silence: it is drift the
 * review has to see, and the run never fails the scheduled job over it.
 */
// The boxes and the comments sit outside the design fingerprint, so the delta
// above cannot see them: a session reads this section to know whether the review
// record it is merging is the whole of what moved.
function renderRulesAndComments(
  rules: RulesDrift | null | undefined,
  comments: CommentDrift | null | undefined,
): string[] {
  if (!rules && !comments) return []
  const lines: string[] = ["## Rules and comments", ""]
  if (rules) {
    const behind = rules.new.length + rules.stale.length + rules.removed.length
    lines.push(
      `- \`.Regole\` cards: ${rules.new.length} new · ${rules.stale.length} stale · ${rules.removed.length} removed · ${rules.consolidated} consolidated in the ledger`,
    )
    if (behind)
      lines.push(
        "",
        "A new or stale card needs `pnpm ui-cli figma rules mark <cardId> --disposition <disposition>` in the session that read it, a removed one needs `pnpm ui-cli figma rules sync`. The ledger stays a reviewed change, so this run only reports it.",
      )
  }
  if (comments) lines.push(`- comments: ${comments.threads} threads, ${comments.open} open`)
  return [...lines, ""]
}

function renderTokenDrift(drift: TokenDrift | null | undefined): string[] {
  if (!drift) return []
  const lines: string[] = ["## Token drift", ""]
  const entries = [
    ...drift.added.map(
      (entry) => `- added: \`${entry.name}\` (\`${entry.id}\`) = ${valueOf(entry.value)}`,
    ),
    ...drift.changed.map(
      (change) => `- changed: \`${change.name}\` ${valueOf(change.from)} → ${valueOf(change.to)}`,
    ),
    ...drift.renamed.map(
      (rename) => `- renamed: \`${rename.from}\` → \`${rename.to}\` (id \`${rename.id}\`)`,
    ),
    ...drift.removed.map((entry) => `- removed: \`${entry.name}\` (id \`${entry.id}\`)`),
    ...drift.unmapped.map((name) => `- unmapped: \`${name}\` — outside every curated namespace`),
    ...drift.unreadable.map((line) => `- unreadable: ${line}`),
  ]
  if (!entries.length) return [...lines, "None: the variables match the committed manifest.", ""]
  return [
    ...lines,
    "Compared with `packages/tokens/src/manifest.json`; `update tokens` pins the values once the review accepts them.",
    "",
    ...entries,
    "",
  ]
}

/** The record the review branch carries: what moved, one vector at a time. */
export function renderTokenDriftRecord(drift: TokenDrift, fileKey: string) {
  return {
    generatedAt: new Date().toISOString(),
    fileKey,
    counts: {
      added: drift.added.length,
      changed: drift.changed.length,
      renamed: drift.renamed.length,
      removed: drift.removed.length,
      unmapped: drift.unmapped.length,
      unreadable: drift.unreadable.length,
    },
    added: drift.added,
    changed: drift.changed,
    renamed: drift.renamed,
    removed: drift.removed,
    unmapped: drift.unmapped,
    unreadable: drift.unreadable,
  }
}

function renderDriftNode(
  context: CatalogueRenderContext,
  node: DeltaNode,
  key: DeltaKey,
  changedVariants: Map<string, string>,
): string[] {
  const { registry, inventory } = context
  const lines: string[] = []
  const entry = registry.entries[node.nodeId]
  const target = entry?.target
    ? ` · target \`${entry.target.module}#${entry.target.export}\`` +
      (entry.target.story ? ` · story \`${entry.target.story}\`` : "")
    : ""
  lines.push(
    `### ${node.name}`,
    "",
    `- node: \`${node.nodeId}\` · [open in Figma](${nodeLink(inventory.fileKey, node.nodeId)})`,
    `- class: ${key}${node.change ? ` · change: ${node.change}` : ""}`,
    `- page: ${node.pageName}`,
    `- registry status: \`${entry?.status ?? "unaccounted"}\`${target}`,
  )
  if (key !== "removed")
    lines.push(...renderDevices(inventory.fileKey, context.devicePolicy, node, changedVariants))
  return [...lines, ""]
}

export function renderCataloguePrBody(context: CatalogueRenderContext): string {
  const { inventory, delta } = context
  const date = new Date().toISOString().slice(0, 10)
  const changedVariants = new Map(
    delta.changedVariants.map((change) => [change.nodeId, change.class]),
  )
  const pages = new Map<string, number>()
  for (const [key] of classes) {
    for (const node of delta[key]) pages.set(node.pageName, (pages.get(node.pageName) ?? 0) + 1)
  }
  const lines = [
    `# Figma drift — ${date}`,
    "",
    `Live snapshot compared with \`src/catalog/figma/inventory.json\` (file \`${inventory.fileKey}\`).`,
    "The inventory is refreshed and every production node below is queued as `pending`; merging this PR is the review record.",
    "",
    "## Summary",
    "",
    ...classes.map(([key, label]) => `- ${label}: ${delta[key].length}`),
    ...tokenSummary(context.tokenDrift),
  ]
  if (pages.size)
    lines.push(
      "",
      `By page: ${[...pages].map(([page, count]) => `${page} (${count})`).join(" · ")}`,
    )
  lines.push(...reviewInstructions())
  for (const [key, label] of classes) {
    const nodes = delta[key]
    if (!nodes.length) continue
    lines.push(`## ${label}`, "")
    for (const node of nodes) {
      lines.push(...renderDriftNode(context, node, key, changedVariants))
    }
  }
  lines.push(...renderTokenDrift(context.tokenDrift))
  lines.push(...renderRulesAndComments(context.rulesDrift, context.commentDrift))
  lines.push(
    "## Artifacts",
    "",
    "- `delta.json`: the machine-readable delta of this run.",
    "- `run.json`: the run metrics (`figmaChangeAt`, `handoffPrAt`, the counts).",
    "- `rules-plan.txt`: the rules ledger compared with the snapshot, as the job log prints it.",
    "- `comments.txt`: the comment threads the same run read.",
    "- `pr-body.md`: this generated body.",
    "",
    "## Handoff and metrics",
    "",
    "- Local procedure: `docs/figma-drift-handoff.md`.",
    "- `handoffPrAt − figmaChangeAt`: recorded in `run.json`.",
    "- `mergedAt − handoffPrAt`: read after the merge with `gh pr view <number> --json mergedAt`.",
    "",
  )
  return lines.join("\n")
}

export function renderCatalogueDelta(context: CatalogueRenderContext) {
  const { inventory, delta, live, committed, entries, bulkByNode, bulkByPage } = context
  const statusOf = (node: InventoryNode): string =>
    entries[node.nodeId]?.status ??
    bulkByNode.get(node.nodeId)?.status ??
    bulkByPage.get(node.pageId)?.status ??
    "unaccounted"
  const selected = new Set(deltaWorkSet(delta, entries))
  return {
    generatedAt: new Date().toISOString(),
    fileKey: inventory.fileKey,
    liveVersion: context.liveVersion ?? null,
    counts: Object.fromEntries(classes.map(([key]) => [key, delta[key].length])),
    nodes: Object.fromEntries(
      classes.map(([key]) => [
        key,
        delta[key].map((node) => ({
          nodeId: node.nodeId,
          name: node.name,
          pageName: node.pageName,
          change: node.change ?? null,
          status: statusOf(node),
          target: entries[node.nodeId]?.target ?? null,
        })),
      ]),
    ),
    changedVariants: delta.changedVariants.map((change) => ({
      nodeId: change.nodeId,
      device: change.device ?? null,
      class: change.class,
    })),
    implementationOrder: implementationOrder(live ?? committed, selected),
    devices: context.deviceStats,
  }
}
