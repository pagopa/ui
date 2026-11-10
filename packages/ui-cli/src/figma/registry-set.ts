import fs from "node:fs"
import type { Workspace } from "../adapters/workspace.ts"
import { CheckFailure, UsageError } from "../lib/command.ts"
import { readJson, writeJson } from "../lib/json.ts"
import {
  committedFile,
  forgetCommitted,
  readInventory,
  readRegistry,
} from "../records/committed.ts"
import {
  RegistryEntrySchema,
  PageSurfaceSchema,
  NoteLengthBaselineSchema,
  NOTE_LENGTH_BASELINE_PATH,
  NOTE_LENGTH_LIMIT,
  loweredNoteLengthBaseline,
  type RegistryEntry,
} from "../schemas/catalogue.ts"
import { requiresReason, surfaceDecision } from "./surface-decision.ts"
import { syncCatalogue } from "./sync.ts"

const surfacePath = "src/catalog/figma/page-surface.json"
export type RegistryOptions = {
  nodeId: string
  status: string
  module?: string
  export?: string
  story?: string
  storyExports?: string
  note?: string
  reason?: string
  dryRun: boolean
}

function buildEntry(old: RegistryEntry | undefined, options: RegistryOptions): RegistryEntry {
  const target = {
    ...old?.target,
    ...(options.module !== undefined && { module: options.module }),
    ...(options.export !== undefined && { export: options.export }),
    ...(options.story !== undefined && { story: options.story }),
    ...(options.storyExports !== undefined && {
      storyExports: options.storyExports.split(",").map((s) => s.trim()),
    }),
  }
  const candidate = {
    ...old,
    status: options.status,
    ...(options.note !== undefined && { note: options.note }),
    ...(options.reason !== undefined && { reason: options.reason }),
    ...(Object.keys(target).length && { target }),
  }
  const parsed = RegistryEntrySchema.safeParse(candidate)
  if (!parsed.success) throw new UsageError(`invalid registry entry: ${parsed.error.message}`)
  const entry = parsed.data
  if (
    entry.status === "implemented" &&
    (!entry.target?.story || !entry.target.storyExports?.length)
  )
    throw new UsageError("implemented requires module, export, story and explicit storyExports")
  if (entry.status === "mocked" && !entry.note?.trim())
    throw new UsageError("mocked requires a note")
  if (entry.status === "excluded" && !entry.reason?.trim())
    throw new UsageError("excluded requires a reason")
  return entry
}

export async function setRegistry(workspace: Workspace, options: RegistryOptions) {
  const inventory = readInventory(committedFile("inventory", workspace.root))
  const node = inventory.components.find((item) => item.nodeId === options.nodeId)
  if (!node) throw new UsageError(`${options.nodeId} is not in the inventory`)
  if (options.note && options.note.length > NOTE_LENGTH_LIMIT)
    throw new CheckFailure(`note exceeds ${NOTE_LENGTH_LIMIT} characters`)
  const registryFile = committedFile("registry", workspace.root)
  // A copy: the remembered read stays the file on disk until the write forgets it.
  const registry = structuredClone(readRegistry(registryFile))
  const old = registry.entries[node.nodeId]
  const entry = buildEntry(old, options)
  registry.entries[node.nodeId] = entry
  const warnings: string[] = []
  const surfaceFile = workspace.path(surfacePath)
  const surface = fs.existsSync(surfaceFile) ? readJson(surfaceFile, PageSurfaceSchema) : null
  const page = surface?.pages.find((item) => item.pageId === node.pageId)
  const identity = page?.identities.find((item) => item.nodeId === node.nodeId)
  if (!page) warnings.push(`page ${node.pageId} is not censused; page surface unchanged`)
  else if (!identity)
    warnings.push(`node ${node.nodeId} is missing from its censused page; page surface unchanged`)
  if (identity) {
    const decision = surfaceDecision(true, entry.status)
    const reason =
      options.reason ?? (entry.status === "excluded" ? entry.reason : entry.note) ?? identity.reason
    if (requiresReason(decision) && !reason?.trim())
      throw new UsageError(`${decision} surface decision requires a reason or note`)
    identity.decision = decision
    if (decision === "shipped") delete identity.reason
    else identity.reason = reason
  }
  const baselineFile = workspace.path(NOTE_LENGTH_BASELINE_PATH)
  const baseline = fs.existsSync(baselineFile)
    ? loweredNoteLengthBaseline(registry, readJson(baselineFile, NoteLengthBaselineSchema))
    : null
  if (!options.dryRun) {
    writeJson(registryFile, registry)
    forgetCommitted(registryFile)
    if (identity && surface) writeJson(surfaceFile, surface)
    if (baseline) writeJson(baselineFile, baseline)
  }
  const check = options.dryRun
    ? null
    : await syncCatalogue(workspace).catch((error: unknown) => ({
        exitCode: 1,
        out: [],
        err: [`error: ${error instanceof Error ? error.message : String(error)}`],
      }))
  return {
    nodeId: node.nodeId,
    before: old ?? null,
    entry,
    surface: identity ?? null,
    baseline,
    warnings,
    dryRun: options.dryRun,
    check,
    exitCode: check?.exitCode ?? 0,
  }
}
