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

import type { Workspace } from "../adapters/workspace.ts"
import { COMMITTED_FILES, readInventory, readRegistry } from "../records/committed.ts"
import type { Inventory } from "../schemas/catalogue.ts"
import { fetchFileHeader } from "./rest.ts"
import { fileKeyFromSource } from "./snapshot.ts"
import { figmaToken, resolveFigmaToken, type FigmaTokenSource } from "../adapters/figma-token.ts"
import { RULES_PATH, plan as planRules, readLedger, readRulesSnapshot } from "./rules.ts"
import { COMMENTS_SNAPSHOT_PATH, readComments } from "./comments.ts"
import { CONFIG_PATH, requestsFolder, requestPointer } from "./config.ts"
import { readDesignRequestRecord } from "./design-request-record.ts"
import {
  PAGE_SURFACE_PATH,
  formatSurfaceLine,
  loadPageSurface,
  surfaceSummary,
  surfaceUncensused,
  type SurfaceStats,
  type SurfaceUncensused,
} from "./surface.ts"

const SNAPSHOT_PATH = ".figma/live-rest.json"

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
  token: { present: boolean; message: string | null; source: FigmaTokenSource | null }
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
  surface: {
    stats: SurfaceStats | null
    /** Pages the inventory publishes on and the census never read. */
    uncensused: SurfaceUncensused[]
    error: string | null
  }
  requests: {
    path: string | null
    open: number
    answered: number
    /** Records whose `- Status:` line is missing or says neither open nor answered. */
    unreadable: string[]
    files: string[]
    /** The folder `figma-to-code.yaml` declares, whether or not it exists. */
    declared: string
  }
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

function designRequests(workspace: Workspace): StatusReport["requests"] {
  const root = workspace.root
  const workspaceRootPath = workspace.workspaceRoot
  // The record folder is the one path the config calls workspace-relative, so it
  // is the one path read from it rather than from a literal here.
  const requests = requestsFolder(workspace)
  const directory = [path.join(root, requests), path.join(workspaceRootPath, requests)].find(
    (candidate) => fs.existsSync(candidate),
  )
  if (!directory)
    return { path: null, open: 0, answered: 0, unreadable: [], files: [], declared: requests }
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".md"))
    .sort()
  const records = files.map((file) =>
    readDesignRequestRecord(fs.readFileSync(path.join(directory, file), "utf8")),
  )
  return {
    path: relativeTo(workspaceRootPath, directory),
    open: records.filter((record) => record.state === "open").length,
    answered: records.filter((record) => record.state === "answered").length,
    unreadable: files.filter((_, index) => records[index].state === "unreadable"),
    files,
    declared: requests,
  }
}

/**
 * The rungs a session climbs, in the order it must climb them: a rung is
 * reachable only when every earlier one is satisfied, because each one is the
 * precondition of the next read. The ladder used to stop at the token, the
 * inventory and the file version, and then answer "nothing to align" while the
 * rules were stale, the census owed decisions, a design request sat open and
 * the registry carried a pending node: the report's own counters said work was
 * waiting and `next` said there was none.
 *
 * A rung names the command that moves its counter. Two counters are easy to
 * mistake for `figma:triage`: the census coverage is read from the pages the
 * inventory publishes on and `surface sync` writes, and a pending census
 * identity is moved by the registry status (`registry set`), never by triage,
 * which preserves the decision it reopens.
 */
export function nextCommand(report: Omit<StatusReport, "next">): string {
  const run = (target: string): string => `pnpm nx run pagopa-ui-cli:${target}`
  const registrySet = "pnpm ui-cli figma registry set <nodeId> --status implemented|mocked|excluded"
  if (!report.token.present)
    return "export FIGMA_TOKEN in the shell that runs the session, then re-run figma:status -- --live"
  if (report.inventory.error)
    return "restore the inventory or run figma:triage: the session report cannot read it"
  if (report.registry.error)
    return `restore the registry or run figma:triage: the session report cannot read it (${report.registry.error})`
  if (report.live?.error) return `fix the live read first: ${report.live.error}`
  if (!report.live)
    return `${run("figma:status")} -- --live (ask the file whether it changed since the inventory sync)`
  if (report.live.changedSinceInventory !== false)
    return report.live.changedSinceInventory === true
      ? `${run("figma:plan")} (the file changed since the inventory sync)`
      : `${run("figma:plan")} (the inventory records no file version yet)`

  // The file matches the inventory: what is left is inside the workspace, and
  // every remaining rung is a counter this same report prints.
  if (report.rules.error) return `restore the design-rules ledger: ${report.rules.error}`
  if (report.rules.stale)
    return `${run("figma:rules")} (${report.rules.stale} reviewed rule(s) trail the library export)`
  if (report.rules.pending)
    return `${run("figma:rules")} (${report.rules.pending} rule(s) still carry a pending disposition)`
  if (report.surface.error) return `restore the page census: ${report.surface.error}`
  const uncensused = report.surface.uncensused
  if (uncensused.length) {
    const named = uncensused
      .slice(0, 3)
      .map((page) => `${page.pageName || page.pageId} (${page.nodes})`)
      .join(", ")
    return (
      `pnpm ui-cli figma surface sync --page <pageId> --rest ` +
      `(${uncensused.length} published page(s) are not censused: ${named}${uncensused.length > 3 ? ", …" : ""})`
    )
  }
  if (report.requests.unreadable.length)
    return `set "- Status: open|answered" in ${report.requests.unreadable.join(", ")} — ${report.requests.path ?? report.requests.declared} records without a readable status are not counted`
  if (report.requests.open)
    return `answer the ${report.requests.open} open design request(s) in ${report.requests.path ?? report.requests.declared} before aligning their nodes`
  if (report.comments.open)
    return `${run("figma:comments")} (${report.comments.open} open Figma comment(s), ${report.comments.mappedOpen} on a mapped node)`
  const census = report.surface.stats
  if (census?.pending) {
    const review = report.registry.pending
      ? `${run("figma:brief")} --queue`
      : `${run("figma:brief")} --node <nodeId>`
    return `${review}, then ${registrySet} (${census.pending} censused identity(ies) still carry a pending decision; figma:triage preserves it)`
  }
  if (report.registry.pending)
    return `${run("figma:brief")} --queue (${report.registry.pending} pending node(s) need a brief)`
  if (report.registry.unaccounted)
    return `pnpm nx run pagopa-ui:check:catalogue (${report.registry.unaccounted} unaccounted node(s) need a registry entry: ${registrySet})`
  return "nothing to align: the file matches the inventory, the census is decided, the ledger is current and no node is pending or unaccounted"
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
      `${report.requests.open} open · ${report.requests.answered} answered${report.requests.unreadable.length ? ` · ${report.requests.unreadable.length} unreadable` : ""}${report.requests.path ? ` in ${report.requests.path}` : ""}`,
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
        ? `present (${report.token.source})`
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
    const { source } = resolveFigmaToken(env)
    return { present: true, message: null, source }
  } catch (error) {
    return {
      present: false,
      message: error instanceof Error ? error.message : String(error),
      source: null,
    }
  }
}

function inventoryStatus(workspace: Workspace): {
  report: StatusReport["inventory"]
  inventory: Inventory | null
} {
  let report: StatusReport["inventory"] = {
    path: COMMITTED_FILES.inventory,
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
    inventory = readInventory(workspace.root)
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
    report.error = error instanceof Error ? error.message.split("\n")[0] : String(error)
  }
  return { report, inventory }
}

function pendingStatusRow(
  nodeId: string,
  name: string | null,
  requests: string,
  target?: string,
  note?: string,
) {
  const designRequest = requestPointer(requests)
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
    path: COMMITTED_FILES.registry,
    implemented: 0,
    mocked: 0,
    pending: 0,
    excluded: 0,
    unaccounted: 0,
    error: null,
  }
  const pending: PendingRow[] = []
  const requests = requestsFolder(workspace)
  try {
    const registry = readRegistry(workspace.root)
    const pageRules = new Map(registry.bulkRules.map((rule) => [rule.pageId, rule]))
    const counts: Counts = { implemented: 0, mocked: 0, pending: 0, excluded: 0, unaccounted: 0 }
    for (const node of inventory?.components ?? []) {
      const entry = registry.entries[node.nodeId]
      const status = entry?.status ?? pageRules.get(node.pageId)?.status ?? "unaccounted"
      if (isCountedStatus(status)) counts[status] += 1
      if (status === "pending")
        pending.push(
          pendingStatusRow(node.nodeId, node.name, requests, entry?.target?.export, entry?.note),
        )
    }
    for (const [nodeId, entry] of Object.entries(registry.entries)) {
      if (
        entry.status === "pending" &&
        !inventory?.components.some((node) => node.nodeId === nodeId)
      ) {
        pending.push(pendingStatusRow(nodeId, null, requests, entry.target?.export, entry.note))
      }
    }
    pending.sort((left, right) =>
      left.nodeId.localeCompare(right.nodeId, undefined, { numeric: true }),
    )
    report = { ...report, ...counts }
  } catch (error) {
    report.error = error instanceof Error ? error.message.split("\n")[0] : String(error)
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
    const surface = loadPageSurface(workspace.path(PAGE_SURFACE_PATH))
    const nodes = inventory?.components ?? []
    return {
      stats: surfaceSummary(surface, nodes),
      uncensused: surfaceUncensused(surface, nodes),
      error: null,
    }
  } catch (error) {
    return {
      stats: null,
      uncensused: [],
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
