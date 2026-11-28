import fs from "node:fs"

import { z } from "zod"

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
  NOTE_LENGTH_LIMIT,
  type InventoryNode,
  type RegistryEntry,
} from "../schemas/catalogue.ts"
import { NonEmptyStringSchema } from "../schemas/common.ts"
import { PROPS_MAP_VERSION, PropsMapEntrySchema } from "../schemas/map.ts"
import { propsMapProblems } from "./map.ts"
import { requiresReason, surfaceDecision } from "./surface-decision.ts"
import { syncCatalogue } from "./catalogue/index.ts"

/** The censused pages the identity decision is written to. */
export const SURFACE_PATH = "src/catalog/figma/page-surface.json"
export type RegistryOptions = {
  nodeId: string
  status: string
  module?: string
  export?: string
  story?: string
  storyExports?: string
  note?: string
  reason?: string
  /** The Figma property → React prop mapping, as JSON keyed by property name. */
  props?: string
  dryRun: boolean
}

// A props map is keyed by the Figma property, so the shape is the catalogue's
// own: an object whose keys are variant properties and whose values name the
// prop and, when the option names are not the prop values, the option mapping.
const DeclaredPropsSchema = z.record(NonEmptyStringSchema, PropsMapEntrySchema)

function parsedProps(nodeId: string, raw: string, node: InventoryNode | undefined) {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new UsageError(`--props is not JSON: ${raw}`)
  }
  const parsed = DeclaredPropsSchema.safeParse(json)
  if (!parsed.success) throw new UsageError(`invalid --props: ${parsed.error.message}`)
  // The inventory is the authority on which properties and options exist, so a
  // mapping the source does not declare fails before a byte is written.
  const problems = propsMapProblems(
    nodeId,
    { version: PROPS_MAP_VERSION, props: parsed.data },
    node,
  )
  if (problems.length) throw new UsageError(problems.join("\n"))
  return parsed.data
}

function buildEntry(
  old: RegistryEntry | undefined,
  options: RegistryOptions,
  node: InventoryNode | undefined,
): RegistryEntry {
  const target = {
    ...old?.target,
    ...(options.module !== undefined && { module: options.module }),
    ...(options.export !== undefined && { export: options.export }),
    ...(options.story !== undefined && { story: options.story }),
    ...(options.storyExports !== undefined && {
      storyExports: options.storyExports.split(",").map((s) => s.trim()),
    }),
    // The map is the whole mapping, not a patch: a run that passes it says what
    // the node's properties become, so a property it leaves out is one the node
    // no longer declares.
    ...(options.props !== undefined && {
      props: parsedProps(options.nodeId, options.props, node),
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
  const inventory = readInventory(workspace.root)
  const node = inventory.components.find((item) => item.nodeId === options.nodeId)
  if (!node) throw new UsageError(`${options.nodeId} is not in the inventory`)
  if (options.note && options.note.length > NOTE_LENGTH_LIMIT)
    throw new CheckFailure(`note exceeds ${NOTE_LENGTH_LIMIT} characters`)
  const registryFile = committedFile("registry", workspace.root)
  // A copy: the remembered read stays the file on disk until the write forgets it.
  const registry = structuredClone(readRegistry(workspace.root))
  const old = registry.entries[node.nodeId]
  const entry = buildEntry(old, options, node)
  registry.entries[node.nodeId] = entry
  const warnings: string[] = []
  const surfaceFile = workspace.path(SURFACE_PATH)
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
  if (!options.dryRun) {
    writeJson(registryFile, registry)
    forgetCommitted(registryFile)
    if (identity && surface) writeJson(surfaceFile, surface)
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
    warnings,
    dryRun: options.dryRun,
    check,
    exitCode: check?.exitCode ?? 0,
  }
}
