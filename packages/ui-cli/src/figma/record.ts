// Recording a node's decision — one node, one atomic write.
//
// A decision used to reach disk one document at a time: the registry, the page
// surface, the story titles, the consumer map. A run that
// stopped halfway left the tree in a state no single re-run repaired, because
// each document had already been regenerated from the one before it. This module
// keeps the sequence and takes the risk away: the bytes of every file it may
// touch are read first, and a step that throws puts them back, so a failed
// record leaves the tree exactly as it found it and the next run starts from the
// same place. The generators are deterministic, so a second successful run on an
// unchanged tree writes the same bytes.
import fs from "node:fs"
import path from "node:path"

import type { Workspace } from "../adapters/workspace.ts"
import { writeBytes } from "../lib/json.ts"
import { committedFile, forgetCommitted } from "../records/committed.ts"
import type { RegistryEntry } from "../schemas/catalogue.ts"
import { syncCatalogue, type CatalogueReport } from "./catalogue/index.ts"
import { checkMap, FIGMA_MAP_PATH, updateMap } from "./map.ts"
import { SURFACE_PATH, setRegistry } from "./registry-set.ts"
import { checkStories, STORY_TITLES_PATH, updateStories } from "./stories.ts"

export type RecordOptions = {
  nodeId: string
  status: string
  module?: string
  export?: string
  story?: string
  storyExports?: string
  note?: string
  reason?: string
  dryRun?: boolean
}

export type RecordResult = {
  nodeId: string
  before: RegistryEntry | null
  entry: RegistryEntry
  warnings: string[]
  /** The documents whose bytes the run changed, in the order it wrote them. */
  artifacts: string[]
  catalogue: CatalogueReport
  /** What the written documents still report; empty when the run closed the node. */
  residues: string[]
  dryRun: boolean
  exitCode: number
}

export type RecordDeps = {
  setRegistry?: typeof setRegistry
  updateStories?: typeof updateStories
  updateMap?: typeof updateMap
  syncCatalogue?: typeof syncCatalogue
  checkStories?: typeof checkStories
  checkMap?: typeof checkMap
  write?: typeof writeBytes
}

function recordPaths(workspace: Workspace): string[] {
  return [
    committedFile("registry", workspace.root),
    workspace.path(SURFACE_PATH),
    workspace.path(STORY_TITLES_PATH),
    workspace.path(FIGMA_MAP_PATH),
  ]
}

/** Each file's bytes as they are now, or `null` for a file that does not exist yet. */
function snapshot(files: string[]): Map<string, Buffer | null> {
  return new Map(
    files.map((file) => [file, fs.existsSync(file) ? fs.readFileSync(file) : null] as const),
  )
}

/** Puts the bytes back and drops the remembered reads, so nothing sees the write. */
function restore(before: Map<string, Buffer | null>, write: typeof writeBytes): void {
  for (const [file, bytes] of before) {
    if (bytes) write(file, bytes)
    else if (fs.existsSync(file)) fs.rmSync(file)
    forgetCommitted(file)
  }
}

// The documents whose bytes the run wrote, in write order: the generators
// rewrite every document they own, so "exists" is not "wrote" and the bytes are
// the only witness.
function wroteFiles(before: Map<string, Buffer | null>): string[] {
  return [...before.keys()].filter((file) => {
    const then = before.get(file) ?? null
    const now = fs.existsSync(file) ? fs.readFileSync(file) : null
    if (!then || !now) return !then !== !now
    return !then.equals(now)
  })
}

export async function record(
  workspace: Workspace,
  options: RecordOptions,
  deps: RecordDeps = {},
): Promise<RecordResult> {
  const set = deps.setRegistry ?? setRegistry
  const dryRun = Boolean(options.dryRun)
  // The entry is validated before anything is written, and through the same
  // `setRegistry` a real run uses: a dry run and a real run fail on the same
  // inputs, and no step of the sequence writes what the preflight rejected.
  const validated = await set(workspace, { ...options, dryRun: true })
  const empty: CatalogueReport = { exitCode: 0, out: [], err: [] }
  if (dryRun)
    return {
      nodeId: validated.nodeId,
      before: validated.before,
      entry: validated.entry,
      warnings: validated.warnings,
      artifacts: [],
      catalogue: empty,
      residues: [],
      dryRun,
      exitCode: 0,
    }
  const before = snapshot(recordPaths(workspace))
  const writeStories = deps.updateStories ?? updateStories
  const writeMap = deps.updateMap ?? updateMap
  let registry: Awaited<ReturnType<typeof setRegistry>>
  try {
    registry = await set(workspace, { ...options, dryRun: false })
    // The map reads the story titles, so the titles are written first: the order
    // is the sequence, not a preference.
    writeStories(workspace)
    writeMap(workspace)
  } catch (error) {
    restore(before, deps.write ?? writeBytes)
    throw error
  }
  const catalogue = await (deps.syncCatalogue ?? syncCatalogue)(workspace).catch(
    (error: unknown) => ({
      exitCode: 1,
      out: [],
      err: [`error: ${error instanceof Error ? error.message : String(error)}`],
    }),
  )
  const residues = [
    ...(deps.checkStories ?? checkStories)(workspace).problems,
    ...(deps.checkMap ?? checkMap)(workspace).problems,
  ]
  return {
    nodeId: registry.nodeId,
    before: registry.before,
    entry: registry.entry,
    warnings: registry.warnings,
    artifacts: wroteFiles(before).map((file) => path.relative(workspace.root, file)),
    catalogue,
    residues,
    dryRun,
    exitCode: catalogue.exitCode || (residues.length ? 1 : 0),
  }
}
