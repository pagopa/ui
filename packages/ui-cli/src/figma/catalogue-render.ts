import fs from "node:fs"

import { declaredDevices, deviceAxes, type DeviceStats } from "./devices.ts"
import { implementationOrder, type DeltaNode, type SnapshotDelta } from "./snapshot.ts"
import { deltaWorkSet } from "./work-set.ts"
import { EVIDENCE_DIR, evidencePaths, loadManifest } from "../parity/evidence.ts"
import { loadCaseFile } from "../parity/cases.ts"
import type { Workspace } from "../adapters/workspace.ts"
import type { DevicePolicy } from "../schemas/devices.ts"
import type { InventoryNode, Registry } from "../schemas/catalogue.ts"

export interface CatalogueCoverageSummary {
  sets: number
  covered: number
  missing: number
  drafts: number
  exceptions: number
}

export interface CatalogueRenderContext {
  workspace: Workspace
  inventory: { fileKey: string }
  registry: Registry
  delta: SnapshotDelta
  live: InventoryNode[] | null
  committed: InventoryNode[]
  liveVersion?: string
  ratchet: { from: number; to: number } | null
  evidenceBase?: string
  devicePolicy: DevicePolicy | null
  deviceStats: DeviceStats | null
  deviceCoverage: CatalogueCoverageSummary | null
  bulkByNode: Map<string, { status?: string }>
  bulkByPage: Map<string, { status?: string }>
  entries: Registry["entries"]
}

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

type NodeEvidence = { ids: string[]; links: Array<{ id: string; href: string }> }

function evidenceReader(workspace: Workspace, evidenceBase?: string) {
  let casesCache: ReturnType<typeof loadCaseFile> | undefined
  let manifestCache: ReturnType<typeof loadManifest> | null | undefined
  return (nodeId: string): NodeEvidence => {
    casesCache ??= loadCaseFile(workspace.path("src/catalog/figma/parity-cases.json"))
    const corpus = casesCache.filter((entry) => entry.nodeId === nodeId)
    if (!corpus.length) return { ids: [], links: [] }
    if (manifestCache === undefined) {
      const manifestPath = evidencePaths(workspace.workspaceRoot).manifest
      manifestCache = fs.existsSync(manifestPath) ? loadManifest(manifestPath) : null
    }
    const links = evidenceBase
      ? corpus.flatMap((entry) => {
          const record = manifestCache?.cases?.[entry.id]
          return record
            ? [{ id: entry.id, href: `${evidenceBase}/${EVIDENCE_DIR}/${record.png}` }]
            : []
        })
      : []
    return { ids: corpus.map((entry) => entry.id), links }
  }
}

function reviewInstructions(ratchet: CatalogueRenderContext["ratchet"]): string[] {
  return [
    "",
    "## Instructions — review",
    "",
    "For every node below, record one decision in `src/catalog/figma/registry.json`:",
    "",
    '1. still matches the source → set `status: "implemented"`;',
    "2. must change → update the component and its story in this PR, then set `implemented`;",
    "3. out of scope → set `excluded` with a reason.",
    ...(ratchet
      ? [
          "",
          `This refresh replaced the queued notes with the pending stub, so \`overLimit\` in \`src/catalog/figma/note-length-baseline.json\` ratcheted from ${ratchet.from} to ${ratchet.to}: a re-reviewed note stays under 600 characters, and the baseline is never raised.`,
        ]
      : []),
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

function renderDriftNode(
  context: CatalogueRenderContext,
  node: DeltaNode,
  key: DeltaKey,
  changedVariants: Map<string, string>,
  evidence: NodeEvidence,
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
  if (evidence.ids.length) {
    lines.push(`- evidence: ${evidence.ids.map((id) => `\`${id}\``).join(" · ")}`)
    if (evidence.links.length) {
      lines.push(
        `  - references: ${evidence.links.map((item) => `[${item.id}](${item.href})`).join(" · ")}`,
      )
    }
    lines.push(
      "  - attach the local render after `parity check --case <id> --screenshot <file>`; CI never embeds a component image.",
    )
  }
  return [...lines, ""]
}

export function renderCataloguePrBody(context: CatalogueRenderContext): string {
  const { workspace, inventory, delta, ratchet, evidenceBase } = context
  const date = new Date().toISOString().slice(0, 10)
  const changedVariants = new Map(
    delta.changedVariants.map((change) => [change.nodeId, change.class]),
  )
  const pages = new Map<string, number>()
  for (const [key] of classes) {
    for (const node of delta[key]) pages.set(node.pageName, (pages.get(node.pageName) ?? 0) + 1)
  }
  const evidenceFor = evidenceReader(workspace, evidenceBase)
  const lines = [
    `# Figma drift — ${date}`,
    "",
    `Live snapshot compared with \`src/catalog/figma/inventory.json\` (file \`${inventory.fileKey}\`).`,
    "The inventory is refreshed and every production node below is queued as `pending`; merging this PR is the review record.",
    "",
    "## Summary",
    "",
    ...classes.map(([key, label]) => `- ${label}: ${delta[key].length}`),
  ]
  if (pages.size)
    lines.push(
      "",
      `By page: ${[...pages].map(([page, count]) => `${page} (${count})`).join(" · ")}`,
    )
  lines.push(...reviewInstructions(ratchet))
  for (const [key, label] of classes) {
    const nodes = delta[key]
    if (!nodes.length) continue
    lines.push(`## ${label}`, "")
    for (const node of nodes) {
      lines.push(...renderDriftNode(context, node, key, changedVariants, evidenceFor(node.nodeId)))
    }
  }
  lines.push(
    "## Artifacts",
    "",
    "- `delta.json`: the machine-readable delta of this run.",
    "- `run.json`: the run metrics (`figmaChangeAt`, `handoffPrAt`, the counts).",
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
  const selected = new Set(deltaWorkSet(delta, entries).queue)
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
    coverage: context.deviceCoverage,
  }
}
