// The offline implementation context for one Figma node or the pending queue.
import fs from "node:fs"
import path from "node:path"

import type { Workspace } from "../adapters/workspace.ts"
import { readJson } from "../lib/json.ts"
import { walkFiles } from "../lib/fs.ts"
import {
  InventorySchema,
  RegistrySchema,
  type Inventory,
  type InventoryNode,
} from "../schemas/catalogue.ts"
import { readComments, threadsForNode } from "./comments.ts"
import { readLedger, readRulesSnapshot, rulesForNode, rulesForUninventoriedNode } from "./rules.ts"

const INVENTORY_PATH = "src/catalog/figma/inventory.json"
const REGISTRY_PATH = "src/catalog/figma/registry.json"
const REQUESTS_DIR = "docs/design-requests"

export type NodeBrief = {
  node: string
  requested: string
  name: string | null
  page: string | null
  status: string | null
  target: ReturnType<typeof RegistrySchema.parse>["entries"][string]["target"] | null
  note: string | null
  rules: Array<{
    card: string
    disposition: string
    title: string
    titleSource: string
    summary: string | null
    body: string | null
    guide: string | null
  }>
  openComments: ReturnType<typeof threadsForNode>
  designRequests: string[]
  commentsSnapshot: string | null
}

function requestFiles(workspace: Workspace): Array<{ path: string; text: string }> {
  const directory = path.join(workspace.workspaceRoot, REQUESTS_DIR)
  return walkFiles(directory, (file) => file.endsWith(".md")).map((file) => ({
    path: path.relative(workspace.workspaceRoot, file).split(path.sep).join("/"),
    text: fs.readFileSync(file, "utf8"),
  }))
}

function designRequests(sources: BriefSources, nodeId: string): string[] {
  const dashed = nodeId.replace(":", "-")
  return sources.requests
    .filter((file) => file.text.includes(nodeId) || file.text.includes(`node-id=${dashed}`))
    .map((file) => file.path)
    .sort()
}

// `Pick` so the live side — an `InventoryNode[]` the file just produced — can ask
// the same question as the committed inventory, without inventing a fileKey.
export function componentForNode(
  inventory: Pick<Inventory, "components">,
  nodeId: string,
): InventoryNode | undefined {
  return (
    inventory.components.find((entry) => entry.nodeId === nodeId) ??
    inventory.components.find((entry) =>
      entry.variants?.some((variant) => variant.nodeId === nodeId),
    )
  )
}

export function readInventory(workspace: Workspace): Inventory {
  return readJson(workspace.path(INVENTORY_PATH), InventorySchema)
}

// Everything a brief reads from disk, so a caller that builds several briefs
// reads the catalogue, the ledger, the comment snapshot and the design requests
// once instead of once per node.
export function readBriefSources(workspace: Workspace) {
  return {
    inventory: readInventory(workspace),
    registry: readJson(workspace.path(REGISTRY_PATH), RegistrySchema),
    ledger: readLedger(workspace.root, false),
    snapshot: readRulesSnapshot(workspace.root, false),
    comments: readComments(workspace),
    requests: requestFiles(workspace),
  }
}

export type BriefSources = ReturnType<typeof readBriefSources>

export function buildBrief(
  workspace: Workspace,
  requested: string,
  sources: BriefSources = readBriefSources(workspace),
): NodeBrief {
  const { inventory, registry, ledger, snapshot, comments } = sources
  const component = componentForNode(inventory, requested)
  const identity = component?.nodeId ?? requested
  const entry = registry.entries[identity]
  const rules = ledger
    ? component
      ? rulesForNode(ledger, snapshot, workspace.root, identity)
      : rulesForUninventoriedNode(ledger, snapshot, identity)
    : []
  const openComments = comments
    ? threadsForNode(workspace, comments, requested, { openOnly: true })
    : []
  return {
    node: identity,
    requested,
    name: component?.name ?? null,
    page: component?.pageName ?? null,
    status: entry?.status ?? null,
    target: entry?.target ?? null,
    note: entry?.note ?? null,
    rules: rules.map((rule) => ({
      card: rule.id,
      disposition: rule.disposition,
      title: rule.titleEn ?? rule.title,
      titleSource: rule.title,
      summary: rule.summary ?? rule.reason ?? null,
      body: rule.body ?? null,
      guide: rule.guide ?? null,
    })),
    openComments,
    designRequests: designRequests(sources, identity),
    commentsSnapshot: comments?.fetchedAt ?? null,
  }
}

export function compact(value: string): string {
  return value.replace(/\s+/g, " ")
}

export function formatBrief(report: NodeBrief, hasLedger = true): string[] {
  const lines = [`node       ${report.node}${report.name ? ` · ${report.name}` : ""}`]
  if (report.page) lines.push(`page       ${report.page}`)
  lines.push(`status     ${report.status ?? "(no registry entry)"}`)
  if (report.target) lines.push(`target     ${report.target.module} · ${report.target.export}`)
  const guides = [...new Set(report.rules.map((rule) => rule.guide).filter(Boolean))]
  if (guides.length) lines.push(`guide      ${guides.join(", ")}`)
  if (hasLedger) appendRules(lines, report)
  else lines.push("rules      (no ledger yet: run figma rules init)")
  appendComments(lines, report)
  appendRequests(lines, report)
  return lines
}

function appendRules(lines: string[], report: NodeBrief): void {
  if (!report.rules.length) {
    lines.push(report.rules.length === 0 ? "rules      no rule targets this node" : "")
    return
  }
  const pending = report.rules.filter((rule) => rule.disposition === "pending").length
  lines.push(`rules      ${report.rules.length} (${pending} pending)`)
  for (const rule of report.rules) {
    const detail = rule.summary ?? rule.body ?? ""
    lines.push(
      `  ${rule.disposition.padEnd(12)} ${rule.title}${detail ? ` — ${compact(detail)}` : ""}`,
    )
    if (rule.guide) lines.push(`  ${"".padEnd(12)} in ${rule.guide}`)
  }
}

function appendComments(lines: string[], report: NodeBrief): void {
  if (!report.commentsSnapshot) {
    lines.push("comments   (no snapshot: run figma comments --refresh)")
  } else if (!report.openComments.length) {
    lines.push("comments   no open thread")
  } else {
    lines.push(`comments   ${report.openComments.length} open`)
    for (const thread of report.openComments) {
      lines.push(
        `  ${thread.createdAt.slice(0, 10)} ${thread.author || "unknown"}: ${compact(thread.message)}`,
      )
      for (const reply of thread.replies) {
        lines.push(
          `    ${reply.createdAt.slice(0, 10)} ${reply.author || "unknown"}: ${compact(reply.message)}`,
        )
      }
    }
  }
}

function appendRequests(lines: string[], report: NodeBrief): void {
  if (!report.designRequests.length) lines.push("requests   none")
  else for (const request of report.designRequests) lines.push(`request    ${request}`)
}
