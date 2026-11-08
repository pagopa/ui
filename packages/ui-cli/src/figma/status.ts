#!/usr/bin/env node
// Session report for the Figma catalogue. Read-only: no file is written, and no
// network call is made unless `--live` asks the file itself for its version.
//
// It answers, in one command, the questions a session used to answer by reading
// the snapshot, the inventory, the registry and the sources: is the token there,
// which snapshot is pinned, does the file differ from the inventory, who is
// still pending and why, which design requests are open, what comes next.
import fs from "node:fs"
import path from "node:path"

import { readJson } from "../lib/json.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { InventorySchema, RegistrySchema, type Inventory } from "../schemas/catalogue.ts"
import { fetchFileHeader } from "./rest.ts"
import { fileKeyFromSource } from "./snapshot.ts"
import { figmaToken } from "../adapters/figma-token.ts"
import { RULES_PATH, plan as planRules, readLedger, readRulesSnapshot } from "./rules.ts"
import { COMMENTS_SNAPSHOT_PATH, readComments } from "./comments.ts"
import { formatSurfaceLine, loadPageSurface, surfaceSummary, type SurfaceStats } from "./surface.ts"

const CONFIG_PATH = "figma-to-code.yaml"
const INVENTORY_PATH = "src/catalog/figma/inventory.json"
const REGISTRY_PATH = "src/catalog/figma/registry.json"
const SNAPSHOT_PATH = ".figma/live-rest.json"
const REQUESTS_PATH = "docs/design-requests"

type Counts = {
  implemented: number
  mocked: number
  pending: number
  excluded: number
  unaccounted: number
}

type PendingRow = {
  nodeId: string
  name: string | null
  target: string | null
  designRequests: string[]
}

type LiveReport = {
  version?: string
  lastModified?: string
  changedSinceInventory?: boolean | null
  error?: string
}

export type StatusReport = {
  config: string | null
  token: { present: boolean; message: string | null }
  snapshot: {
    path: string
    present: boolean
    bytes: number | null
    modifiedAt: string | null
  }
  inventory: {
    path: string
    syncedAt: string | null
    fileVersion: string | null
    lastModified: string | null
    nodes: number
    components: number
    sets: number
    error: string | null
  }
  registry: Counts & { path: string; error: string | null }
  rules: {
    path: string
    present: boolean
    consolidated: number
    imported: number
    recorded: number
    pending: number
    stale: number
    error: string | null
  }
  comments: {
    path: string
    present: boolean
    threads: number
    open: number
    mappedOpen: number
    error: string | null
  }
  pending: PendingRow[]
  surface: { stats: SurfaceStats | null; error: string | null }
  requests: { path: string | null; open: number; answered: number; files: string[] }
  live: LiveReport | null
  next: string
}

function relativeTo(base: string, file: string): string {
  const relative = path.relative(base, file)
  return relative.startsWith("..") ? file : relative.split(path.sep).join("/")
}

function bytesLabel(bytes: number): string {
  const megabytes = bytes / (1024 * 1024)
  return megabytes >= 1 ? `${megabytes.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function requestState(file: string): "open" | "answered" {
  const text = fs.readFileSync(file, "utf8")
  const status = text.match(/^\s*-?\s*\**Status\**:\s*([A-Za-z]+)/im)?.[1] ?? "open"
  return status.toLowerCase() === "open" ? "open" : "answered"
}

function designRequests(workspace: Workspace): StatusReport["requests"] {
  const root = workspace.root
  const workspaceRootPath = workspace.workspaceRoot
  const directory = [
    path.join(root, REQUESTS_PATH),
    path.join(workspaceRootPath, REQUESTS_PATH),
  ].find((candidate) => fs.existsSync(candidate))
  if (!directory) return { path: null, open: 0, answered: 0, files: [] }
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".md"))
    .sort()
  const states = files.map((file) => requestState(path.join(directory, file)))
  return {
    path: relativeTo(workspaceRootPath, directory),
    open: states.filter((state) => state === "open").length,
    answered: states.filter((state) => state === "answered").length,
    files,
  }
}

function nextCommand(report: Omit<StatusReport, "next">): string {
  if (!report.token.present) {
    return "export FIGMA_TOKEN in the shell that runs the session, then re-run figma:status -- --live"
  }
  if (report.inventory.error) {
    return "restore the inventory or run figma:triage: the session report cannot read it"
  }
  if (report.live && !report.live.error) {
    if (report.live.changedSinceInventory === false) {
      return "nothing to align: the file has not changed since the inventory sync"
    }
    if (report.live.changedSinceInventory === true) {
      return "pnpm nx run pagopa-ui-cli:figma:plan (the file changed since the inventory sync)"
    }
    return "pnpm nx run pagopa-ui-cli:figma:plan (the inventory records no file version yet)"
  }
  if (report.live?.error) {
    return `fix the live read first: ${report.live.error}`
  }
  return "pnpm nx run pagopa-ui-cli:figma:status -- --live (ask the file whether it changed)"
}

function statusLine(name: string, value: string): string {
  return `${name.padEnd(10)}${value}`
}

function formatStatusInventory(report: StatusReport): string[] {
  const lines: string[] = []
  if (report.snapshot.present) {
    lines.push(
      statusLine(
        "snapshot",
        `${report.snapshot.path} · ${bytesLabel(report.snapshot.bytes ?? 0)} · modified ${report.snapshot.modifiedAt}`,
      ),
    )
  } else lines.push(statusLine("snapshot", `${report.snapshot.path} (missing)`))
  const inventory = report.inventory
  if (inventory.error) lines.push(statusLine("inventory", inventory.error))
  else
    lines.push(
      statusLine(
        "inventory",
        `synced ${inventory.syncedAt} · version ${inventory.fileVersion ?? "(not recorded yet)"}${inventory.lastModified ? ` · file modified ${inventory.lastModified}` : ""} · ${inventory.nodes} nodes (${inventory.components} components, ${inventory.sets} sets)`,
      ),
    )
  if (report.registry.error) lines.push(statusLine("registry", report.registry.error))
  else
    lines.push(
      statusLine(
        "registry",
        `implemented ${report.registry.implemented} · mocked ${report.registry.mocked} · pending ${report.registry.pending} · excluded ${report.registry.excluded}`,
      ),
    )
  return lines
}

function formatStatusEvidence(report: StatusReport): string[] {
  const lines: string[] = []
  if (report.rules.error) lines.push(statusLine("rules", report.rules.error))
  else if (report.rules.present)
    lines.push(
      statusLine(
        "rules",
        `${report.rules.consolidated} consolidated · ${report.rules.imported} imported · ${report.rules.recorded} recorded · ${report.rules.pending} pending · ${report.rules.stale} stale`,
      ),
    )
  else lines.push(statusLine("rules", `${report.rules.path} (missing)`))
  if (report.comments.error) lines.push(statusLine("comments", report.comments.error))
  else if (report.comments.present)
    lines.push(
      statusLine(
        "comments",
        `${report.comments.open} open of ${report.comments.threads} threads · ${report.comments.mappedOpen} on mapped nodes`,
      ),
    )
  else lines.push(statusLine("comments", `${report.comments.path} (missing)`))
  if (report.surface.error) lines.push(statusLine("surface", report.surface.error))
  else if (report.surface.stats)
    lines.push(
      statusLine("surface", formatSurfaceLine(report.surface.stats).replace("surface: ", "")),
    )
  for (const row of report.pending) {
    const reason = row.designRequests.length
      ? row.designRequests.join(", ")
      : "no design request named in the note"
    lines.push(statusLine("pending", `${row.nodeId} ${row.name ?? "(removed)"} → ${reason}`))
  }
  lines.push(
    statusLine(
      "requests",
      `${report.requests.open} open · ${report.requests.answered} answered${report.requests.path ? ` in ${report.requests.path}` : ""}`,
    ),
  )
  return lines
}

function formatLiveStatus(report: StatusReport): string[] {
  if (!report.live) return []
  if (report.live.error) return [statusLine("live", `unavailable — ${report.live.error}`)]
  const verdict =
    report.live.changedSinceInventory === false
      ? "unchanged since the inventory sync"
      : report.live.changedSinceInventory === true
        ? "changed since the inventory sync"
        : "the inventory records no version to compare"
  return [
    statusLine(
      "live",
      `version ${report.live.version} · modified ${report.live.lastModified ?? "unknown"} · ${verdict}`,
    ),
  ]
}

export function formatStatusText(report: StatusReport): string[] {
  return [
    statusLine("config", report.config ?? "(missing figma-to-code.yaml)"),
    statusLine(
      "token",
      report.token.present
        ? "present"
        : "missing — export FIGMA_TOKEN (file_content:read, library_content:read)",
    ),
    ...formatStatusInventory(report),
    ...formatStatusEvidence(report),
    ...formatLiveStatus(report),
    statusLine("next", report.next),
  ]
}

export interface StatusOptions {
  live?: boolean
}

export interface StatusResult {
  report: StatusReport
  exitCode: number
}

function tokenStatus(env: NodeJS.ProcessEnv): StatusReport["token"] {
  try {
    figmaToken(env)
    return { present: true, message: null }
  } catch (error) {
    return { present: false, message: error instanceof Error ? error.message : String(error) }
  }
}

function inventoryStatus(workspace: Workspace): {
  report: StatusReport["inventory"]
  inventory: Inventory | null
} {
  let report: StatusReport["inventory"] = {
    path: INVENTORY_PATH,
    syncedAt: null,
    fileVersion: null,
    lastModified: null,
    nodes: 0,
    components: 0,
    sets: 0,
    error: null,
  }
  let inventory: Inventory | null = null
  try {
    inventory = readJson(workspace.path(INVENTORY_PATH), InventorySchema)
    report = {
      ...report,
      syncedAt: inventory.syncedAt,
      fileVersion: inventory.fileVersion ?? null,
      lastModified: inventory.lastModified ?? null,
      nodes: inventory.components.length,
      components: inventory.components.filter((node) => node.type === "COMPONENT").length,
      sets: inventory.components.filter((node) => node.type === "COMPONENT_SET").length,
    }
  } catch (error) {
    report.error = `${INVENTORY_PATH}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`
  }
  return { report, inventory }
}

function pendingStatusRow(nodeId: string, name: string | null, target?: string, note?: string) {
  const designRequest = /\bdocs\/design-requests\/[\w./-]+\.md\b/g
  return {
    nodeId,
    name,
    target: target ?? null,
    designRequests: [...new Set(note?.match(designRequest) ?? [])],
  }
}

function isCountedStatus(value: string): value is keyof Counts {
  return value in { implemented: 0, mocked: 0, pending: 0, excluded: 0, unaccounted: 0 }
}

function registryStatus(
  workspace: Workspace,
  inventory: Inventory | null,
): {
  report: StatusReport["registry"]
  pending: PendingRow[]
} {
  let report: StatusReport["registry"] = {
    path: REGISTRY_PATH,
    implemented: 0,
    mocked: 0,
    pending: 0,
    excluded: 0,
    unaccounted: 0,
    error: null,
  }
  const pending: PendingRow[] = []
  try {
    const registry = readJson(workspace.path(REGISTRY_PATH), RegistrySchema)
    const pageRules = new Map(registry.bulkRules.map((rule) => [rule.pageId, rule]))
    const counts: Counts = { implemented: 0, mocked: 0, pending: 0, excluded: 0, unaccounted: 0 }
    for (const node of inventory?.components ?? []) {
      const entry = registry.entries[node.nodeId]
      const status = entry?.status ?? pageRules.get(node.pageId)?.status ?? "unaccounted"
      if (isCountedStatus(status)) counts[status] += 1
      if (status === "pending")
        pending.push(pendingStatusRow(node.nodeId, node.name, entry?.target?.export, entry?.note))
    }
    for (const [nodeId, entry] of Object.entries(registry.entries)) {
      if (
        entry.status === "pending" &&
        !inventory?.components.some((node) => node.nodeId === nodeId)
      ) {
        pending.push(pendingStatusRow(nodeId, null, entry.target?.export, entry.note))
      }
    }
    pending.sort((left, right) =>
      left.nodeId.localeCompare(right.nodeId, undefined, { numeric: true }),
    )
    report = { ...report, ...counts }
  } catch (error) {
    report.error = `${REGISTRY_PATH}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`
  }
  return { report, pending }
}

function snapshotStatus(workspace: Workspace): StatusReport["snapshot"] {
  const file = workspace.path(SNAPSHOT_PATH)
  const stat = fs.existsSync(file) ? fs.statSync(file) : null
  return stat
    ? {
        path: SNAPSHOT_PATH,
        present: true,
        bytes: stat.size,
        modifiedAt: stat.mtime.toISOString().slice(0, 16).replace("T", " "),
      }
    : { path: SNAPSHOT_PATH, present: false, bytes: null, modifiedAt: null }
}

async function liveStatus(
  workspace: Workspace,
  enabled: boolean,
  token: StatusReport["token"],
  inventory: Inventory | null,
  inventoryReport: StatusReport["inventory"],
  env: NodeJS.ProcessEnv,
): Promise<LiveReport | null> {
  if (!enabled) return null
  if (!token.present) return { error: "FIGMA_TOKEN is missing" }
  try {
    const fileKey = fileKeyFromSource(workspace) ?? inventory?.fileKey
    if (!fileKey) throw new Error("no FIGMA_FILE_KEY and no inventory file key")
    const header = await fetchFileHeader(fileKey, figmaToken(env))
    return {
      version: header.version,
      lastModified: header.lastModified,
      changedSinceInventory: inventoryReport.fileVersion
        ? header.version !== inventoryReport.fileVersion
        : null,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

function rulesStatus(root: string): StatusReport["rules"] {
  const report: StatusReport["rules"] = {
    path: RULES_PATH,
    present: false,
    consolidated: 0,
    imported: 0,
    recorded: 0,
    pending: 0,
    stale: 0,
    error: null,
  }
  try {
    const ledger = readLedger(root, false)
    if (ledger) {
      report.present = true
      report.consolidated = Object.keys(ledger.cards).length
      for (const card of Object.values(ledger.cards)) {
        if (card.disposition === "imported") report.imported += 1
        if (card.disposition === "recorded") report.recorded += 1
        if (card.disposition === "pending") report.pending += 1
      }
      const snapshot = readRulesSnapshot(root, false)
      if (snapshot) report.stale = planRules(snapshot, ledger).stale.length
    }
  } catch (error) {
    report.error = error instanceof Error ? error.message.split("\n")[0] : String(error)
  }
  return report
}

function commentsStatus(
  workspace: Workspace,
  inventory: Inventory | null,
): StatusReport["comments"] {
  const report: StatusReport["comments"] = {
    path: COMMENTS_SNAPSHOT_PATH,
    present: false,
    threads: 0,
    open: 0,
    mappedOpen: 0,
    error: null,
  }
  try {
    const comments = readComments(workspace)
    if (comments) {
      const mapped = new Set<string>()
      for (const component of inventory?.components ?? []) {
        mapped.add(component.nodeId)
        for (const variant of component.variants ?? []) mapped.add(variant.nodeId)
      }
      report.present = true
      report.threads = comments.threads.length
      report.open = comments.threads.filter((thread) => !thread.resolvedAt).length
      report.mappedOpen = comments.threads.filter(
        (thread) => !thread.resolvedAt && thread.nodeId !== null && mapped.has(thread.nodeId),
      ).length
    }
  } catch (error) {
    report.error = error instanceof Error ? error.message.split("\n")[0] : String(error)
  }
  return report
}

function surfaceStatus(workspace: Workspace, inventory: Inventory | null): StatusReport["surface"] {
  try {
    return {
      stats: surfaceSummary(
        loadPageSurface(workspace.path("src/catalog/figma/page-surface.json")),
        inventory?.components ?? [],
      ),
      error: null,
    }
  } catch (error) {
    return {
      stats: null,
      error: error instanceof Error ? error.message.split("\n")[0] : String(error),
    }
  }
}

export async function buildStatusReport(
  workspace: Workspace,
  options: StatusOptions = {},
  env: NodeJS.ProcessEnv = {},
): Promise<StatusResult> {
  const token = tokenStatus(env)
  const { report: inventoryReport, inventory } = inventoryStatus(workspace)
  const { report: registryReport, pending } = registryStatus(workspace, inventory)
  const live = await liveStatus(
    workspace,
    Boolean(options.live),
    token,
    inventory,
    inventoryReport,
    env,
  )
  const configFile = workspace.path(CONFIG_PATH)
  const base: Omit<StatusReport, "next"> = {
    config: fs.existsSync(configFile) ? relativeTo(workspace.workspaceRoot, configFile) : null,
    token,
    snapshot: snapshotStatus(workspace),
    inventory: inventoryReport,
    registry: registryReport,
    rules: rulesStatus(workspace.root),
    comments: commentsStatus(workspace, inventory),
    pending,
    surface: surfaceStatus(workspace, inventory),
    requests: designRequests(workspace),
    live,
  }
  const report: StatusReport = { ...base, next: nextCommand(base) }
  return { report, exitCode: inventoryReport.error ? 1 : 0 }
}
