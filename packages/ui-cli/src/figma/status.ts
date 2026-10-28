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
import { enterRoot } from "../lib/paths.ts"
import { InventorySchema, RegistrySchema, type Inventory } from "../schemas/catalogue.ts"
import { fetchFileHeader } from "./rest.ts"
import { fileKeyFromSource } from "./snapshot.ts"
import { figmaToken } from "./token.ts"
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

type StatusReport = {
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

function workspaceRoot(from: string): string {
  for (let current = from; ;) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return current
    const parent = path.dirname(current)
    if (parent === current) return from
    current = parent
  }
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

function designRequests(): StatusReport["requests"] {
  const root = process.cwd()
  const workspace = workspaceRoot(root)
  const directory = [path.join(root, REQUESTS_PATH), path.join(workspace, REQUESTS_PATH)].find(
    (candidate) => fs.existsSync(candidate),
  )
  if (!directory) return { path: null, open: 0, answered: 0, files: [] }
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".md"))
    .sort()
  const states = files.map((file) => requestState(path.join(directory, file)))
  return {
    path: relativeTo(workspace, directory),
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

function printText(report: StatusReport): void {
  const label = (name: string): string => name.padEnd(10)
  console.log(`${label("config")}${report.config ?? "(missing figma-to-code.yaml)"}`)
  console.log(
    `${label("token")}${report.token.present ? "present" : "missing — export FIGMA_TOKEN (file_content:read, library_content:read)"}`,
  )
  if (report.snapshot.present) {
    const snapshot = report.snapshot
    console.log(
      `${label("snapshot")}${snapshot.path} · ${bytesLabel(snapshot.bytes ?? 0)} · modified ${snapshot.modifiedAt}`,
    )
  } else {
    console.log(`${label("snapshot")}${report.snapshot.path} (missing)`)
  }
  const inventory = report.inventory
  if (inventory.error) {
    console.log(`${label("inventory")}${inventory.error}`)
  } else {
    console.log(
      `${label("inventory")}synced ${inventory.syncedAt} · version ${inventory.fileVersion ?? "(not recorded yet)"}` +
        `${inventory.lastModified ? ` · file modified ${inventory.lastModified}` : ""} · ` +
        `${inventory.nodes} nodes (${inventory.components} components, ${inventory.sets} sets)`,
    )
  }
  if (report.registry.error) {
    console.log(`${label("registry")}${report.registry.error}`)
  } else {
    const counts = report.registry
    console.log(
      `${label("registry")}implemented ${counts.implemented} · mocked ${counts.mocked} · ` +
        `pending ${counts.pending} · excluded ${counts.excluded}`,
    )
  }
  if (report.rules.error) {
    console.log(`${label("rules")}${report.rules.error}`)
  } else if (report.rules.present) {
    console.log(
      `${label("rules")}${report.rules.consolidated} consolidated · ${report.rules.imported} imported · ` +
        `${report.rules.recorded} recorded · ${report.rules.pending} pending · ${report.rules.stale} stale`,
    )
  } else {
    console.log(`${label("rules")}${report.rules.path} (missing)`)
  }
  if (report.comments.error) {
    console.log(`${label("comments")}${report.comments.error}`)
  } else if (report.comments.present) {
    console.log(
      `${label("comments")}${report.comments.open} open of ${report.comments.threads} threads · ` +
        `${report.comments.mappedOpen} on mapped nodes`,
    )
  } else {
    console.log(`${label("comments")}${report.comments.path} (missing)`)
  }
  if (report.surface.error) {
    console.log(`${label("surface")}${report.surface.error}`)
  } else if (report.surface.stats) {
    console.log(
      `${label("surface")}${formatSurfaceLine(report.surface.stats).replace("surface: ", "")}`,
    )
  }
  for (const row of report.pending) {
    const reason = row.designRequests.length
      ? row.designRequests.join(", ")
      : "no design request named in the note"
    console.log(`${label("pending")}${row.nodeId} ${row.name ?? "(removed)"} → ${reason}`)
  }
  console.log(
    `${label("requests")}${report.requests.open} open · ${report.requests.answered} answered` +
      `${report.requests.path ? ` in ${report.requests.path}` : ""}`,
  )
  if (report.live) {
    if (report.live.error) {
      console.log(`${label("live")}unavailable — ${report.live.error}`)
    } else {
      const verdict =
        report.live.changedSinceInventory === false
          ? "unchanged since the inventory sync"
          : report.live.changedSinceInventory === true
            ? "changed since the inventory sync"
            : "the inventory records no version to compare"
      console.log(
        `${label("live")}version ${report.live.version} · modified ${report.live.lastModified ?? "unknown"} · ${verdict}`,
      )
    }
  }
  console.log(`${label("next")}${report.next}`)
}

export async function runStatus(argv: string[] = process.argv.slice(2)): Promise<number> {
  const root = enterRoot()
  const flag = (name: string): boolean => argv.includes(`--${name}`)

  let token: { present: boolean; message: string | null } = { present: true, message: null }
  try {
    figmaToken()
  } catch (error) {
    token = {
      present: false,
      message: error instanceof Error ? error.message : String(error),
    }
  }

  let inventoryReport: StatusReport["inventory"] = {
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
    inventory = readJson(path.join(root, INVENTORY_PATH), InventorySchema)
    inventoryReport = {
      ...inventoryReport,
      syncedAt: inventory.syncedAt,
      fileVersion: inventory.fileVersion ?? null,
      lastModified: inventory.lastModified ?? null,
      nodes: inventory.components.length,
      components: inventory.components.filter((node) => node.type === "COMPONENT").length,
      sets: inventory.components.filter((node) => node.type === "COMPONENT_SET").length,
    }
  } catch (error) {
    inventoryReport.error = `${INVENTORY_PATH}: ${
      error instanceof Error ? error.message.split("\n")[0] : String(error)
    }`
  }

  let registryReport: StatusReport["registry"] = {
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
    const registry = readJson(path.join(root, REGISTRY_PATH), RegistrySchema)
    const pageRules = new Map(registry.bulkRules.map((rule) => [rule.pageId, rule]))
    const counts: Counts = { implemented: 0, mocked: 0, pending: 0, excluded: 0, unaccounted: 0 }
    const isCounted = (value: string): value is keyof Counts => value in counts
    const designRequest = /\bdocs\/design-requests\/[\w./-]+\.md\b/g
    for (const node of inventory?.components ?? []) {
      const entry = registry.entries[node.nodeId]
      const status = entry?.status ?? pageRules.get(node.pageId)?.status ?? "unaccounted"
      if (isCounted(status)) counts[status] += 1
      if (status !== "pending") continue
      pending.push({
        nodeId: node.nodeId,
        name: node.name,
        target: entry?.target?.export ?? null,
        designRequests: [...new Set(entry?.note?.match(designRequest) ?? [])],
      })
    }
    for (const [nodeId, entry] of Object.entries(registry.entries)) {
      if (entry.status !== "pending") continue
      if (!inventory?.components.some((node) => node.nodeId === nodeId)) {
        pending.push({
          nodeId,
          name: null,
          target: entry.target?.export ?? null,
          designRequests: [...new Set(entry.note?.match(designRequest) ?? [])],
        })
      }
    }
    pending.sort((left, right) =>
      left.nodeId.localeCompare(right.nodeId, undefined, { numeric: true }),
    )
    registryReport = { ...registryReport, ...counts }
  } catch (error) {
    registryReport.error = `${REGISTRY_PATH}: ${
      error instanceof Error ? error.message.split("\n")[0] : String(error)
    }`
  }

  const snapshotFile = path.join(root, SNAPSHOT_PATH)
  const snapshotStat = fs.existsSync(snapshotFile) ? fs.statSync(snapshotFile) : null
  const snapshot: StatusReport["snapshot"] = snapshotStat
    ? {
        path: SNAPSHOT_PATH,
        present: true,
        bytes: snapshotStat.size,
        modifiedAt: snapshotStat.mtime.toISOString().slice(0, 16).replace("T", " "),
      }
    : { path: SNAPSHOT_PATH, present: false, bytes: null, modifiedAt: null }

  let live: LiveReport | null = null
  if (flag("live")) {
    if (!token.present) {
      live = { error: "FIGMA_TOKEN is missing" }
    } else {
      try {
        const fileKey = fileKeyFromSource() ?? inventory?.fileKey
        if (!fileKey) throw new Error("no FIGMA_FILE_KEY and no inventory file key")
        const header = await fetchFileHeader(fileKey)
        live = {
          version: header.version,
          lastModified: header.lastModified,
          changedSinceInventory: inventoryReport.fileVersion
            ? header.version !== inventoryReport.fileVersion
            : null,
        }
      } catch (error) {
        live = { error: error instanceof Error ? error.message : String(error) }
      }
    }
  }

  const rulesReport: StatusReport["rules"] = {
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
      rulesReport.present = true
      rulesReport.consolidated = Object.keys(ledger.cards).length
      for (const card of Object.values(ledger.cards)) {
        if (card.disposition === "imported") rulesReport.imported += 1
        if (card.disposition === "recorded") rulesReport.recorded += 1
        if (card.disposition === "pending") rulesReport.pending += 1
      }
      const rulesSnapshot = readRulesSnapshot(root, false)
      if (rulesSnapshot) {
        rulesReport.stale = planRules(rulesSnapshot, ledger).stale.length
      }
    }
  } catch (error) {
    rulesReport.error = error instanceof Error ? error.message.split("\n")[0] : String(error)
  }

  const commentsReport: StatusReport["comments"] = {
    path: COMMENTS_SNAPSHOT_PATH,
    present: false,
    threads: 0,
    open: 0,
    mappedOpen: 0,
    error: null,
  }
  try {
    const comments = readComments(root)
    if (comments) {
      const mapped = new Set<string>()
      for (const component of inventory?.components ?? []) {
        mapped.add(component.nodeId)
        for (const variant of component.variants ?? []) mapped.add(variant.nodeId)
      }
      commentsReport.present = true
      commentsReport.threads = comments.threads.length
      commentsReport.open = comments.threads.filter((thread) => !thread.resolvedAt).length
      commentsReport.mappedOpen = comments.threads.filter(
        (thread) => !thread.resolvedAt && thread.nodeId !== null && mapped.has(thread.nodeId),
      ).length
    }
  } catch (error) {
    commentsReport.error = error instanceof Error ? error.message.split("\n")[0] : String(error)
  }

  // The surface is what the census says the pages draw, and it is the only line
  // here the inventory cannot produce: the export holds published nodes, a page
  // holds drawings and compositions.
  const surfaceReport: StatusReport["surface"] = { stats: null, error: null }
  try {
    surfaceReport.stats = surfaceSummary(loadPageSurface())
  } catch (error) {
    surfaceReport.error = error instanceof Error ? error.message.split("\n")[0] : String(error)
  }

  const configFile = path.join(root, CONFIG_PATH)
  const base: Omit<StatusReport, "next"> = {
    config: fs.existsSync(configFile) ? relativeTo(workspaceRoot(root), configFile) : null,
    token,
    snapshot,
    inventory: inventoryReport,
    registry: registryReport,
    rules: rulesReport,
    comments: commentsReport,
    pending,
    surface: surfaceReport,
    requests: designRequests(),
    live,
  }
  const report: StatusReport = { ...base, next: nextCommand(base) }

  if (flag("json")) console.log(JSON.stringify(report, null, 2))
  else printText(report)
  return inventoryReport.error ? 1 : 0
}
