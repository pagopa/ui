#!/usr/bin/env node
// The consumer map: which React component renders a Figma node.
//
// The repository answers that question for itself in the catalogue, and those
// files are priced for a session that reads them on purpose: the inventory
// alone is half a megabyte. A consuming agent receives a Figma layout and has to
// pick the component that draws each part, so the same decision travels with the
// package, small and behind a command. This module generates it.
//
// The generated artifact is `figma-map.json` at the package root, read offline
// by the `pagopa-ui-map` command line that ships beside it (the package's
// `cli/` folder). `--write` regenerates it; a plain run regenerates it in
// memory and fails when the committed artifact differs, so no hand edit
// survives a run.
//
// The map holds decisions, not prose: the registry says what each node became,
// the inventory names the node, the story titles give the Storybook address and
// the API report bounds the public surface. The exports no node renders stay in
// the map with an empty list: "this component has no Figma source" is an answer
// the consumer needs, and it is the half a mapping keyed by node would lose.
//
// Usage:
//   node src/cli.ts figma map [--write]
import fs from "node:fs"
import { z } from "zod"

import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { readJson, writeText } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import { storyId } from "../parity/cases.ts"
import {
  COMMITTED_FILES,
  committedFile,
  readInventory,
  readRegistry,
} from "../records/committed.ts"
import { report, type CheckReport } from "../checks/report.ts"
import {
  type BulkRule,
  type Inventory,
  type InventoryNode,
  type Registry,
  type RegistryEntry,
  type Target,
} from "../schemas/catalogue.ts"
import { FigmaMapSchema, type FigmaMap, type MapNode } from "../schemas/map.ts"
import { STORY_TITLES_PATH, StoryTitlesSchema, type StoryTitles } from "./stories.ts"

export const FIGMA_MAP_PATH = "figma-map.json"
export const API_REPORT_PATH = "etc/pagopa-ui.api.md"

// The public surface is the API report, not the registry: a component the
// package exports is what a consumer can render, whether or not Figma drew it.
// Only values count (a type is not something to render), and the report lists
// each one with its declaration keyword or, when the name is an alias, in an
// `export { Source as Public }` clause.
export function publicValues(workspace: Workspace): Set<string> {
  const file = workspace.path(API_REPORT_PATH)
  if (!fs.existsSync(file)) {
    throw new UsageError(`missing ${API_REPORT_PATH} — run "pnpm nx run pagopa-ui:api:update"`)
  }
  const text = fs.readFileSync(file, "utf8")
  const names = new Set<string>()
  for (const match of text.matchAll(
    /^export (?:declare )?(?:function|const|class) ([A-Za-z0-9_]+)/gm,
  ))
    names.add(match[1])
  for (const clause of text.matchAll(/^export \{([^}]+)\}/gm))
    for (const part of clause[1].split(",")) {
      const local = part.trim()
      if (!local || local.startsWith("type ")) continue
      names.add(local.split(/\s+as\s+/).at(-1) ?? local)
    }
  return names
}

function storyFor(target: Target | undefined, titles: StoryTitles): string | undefined {
  const title = target?.story ? titles[target.story] : undefined
  const first = target?.storyExports?.[0]
  return title && first ? storyId(title, first) : undefined
}

// Every export one registry entry answers for: the component itself, the parts
// the same module ships with it, and the extra modules the entry covers.
function targetExports(target: Target | undefined): string[] {
  if (!target) return []
  const names = [
    target.export,
    ...(target.additionalExports ?? []),
    ...(target.additionalTargets ?? []).map((extra) => extra.export),
  ]
  return [...new Set(names)].sort()
}

// The artwork pages decide every glyph at once through a registry rule, so the
// node names no export of its own: the rule's names manifest is read by a single
// renderer, and that export is what a consumer renders for the glyph.
const ARTWORK_RENDERER: Record<NonNullable<BulkRule["namesExport"]>, string> = {
  figmaIconNames: "PagoPAIcon",
  figmaPictogramNames: "PagoPAPictogram",
}

function ruleExports(rule: BulkRule): string[] {
  const renderer = rule.namesExport ? ARTWORK_RENDERER[rule.namesExport] : undefined
  return renderer ? [renderer] : []
}

// The story of the export that renders a rule's glyphs, so a pictogram row
// points at the catalogue page instead of nowhere. A renderer the file never
// drew (the pictogram component) has no entry and therefore no story.
function rendererTarget(registry: Registry, name: string | undefined): Target | undefined {
  if (!name) return undefined
  for (const entry of Object.values(registry.entries))
    if (entry.target?.export === name) return entry.target
  return undefined
}

type Decision = {
  status: RegistryEntry["status"]
  names: string[]
  story?: string
  reason?: string
}

function ruleFor(registry: Registry, node: InventoryNode | undefined): BulkRule | undefined {
  return node ? registry.bulkRules.find((item) => item.pageId === node.pageId) : undefined
}

// A node's decision is its own entry or, when it has none, the rule that owns
// its page — the same precedence the catalogue check applies, so a node the
// registry decided in bulk still gets a row.
function nodeDecision(
  registry: Registry,
  titles: StoryTitles,
  nodeId: string,
  node: InventoryNode | undefined,
): Decision {
  const entry = registry.entries[nodeId]
  if (entry) {
    const story = storyFor(entry.target, titles)
    return {
      status: entry.status,
      names: targetExports(entry.target),
      ...(story ? { story } : {}),
      ...(entry.reason ? { reason: entry.reason } : {}),
    }
  }
  const rule = ruleFor(registry, node)
  if (!rule?.status)
    throw new UsageError(
      `${nodeId} has no registry decision — run "pnpm nx run pagopa-ui-cli:catalogue:check"`,
    )
  const names = ruleExports(rule)
  const story = storyFor(rendererTarget(registry, names.at(0)), titles)
  return {
    status: rule.status,
    names,
    ...(story ? { story } : {}),
    ...(rule.reason ? { reason: rule.reason } : {}),
  }
}

export type MapSources = {
  registry: Registry
  inventory: Inventory
  titles: StoryTitles
  values: Set<string>
}

export function figmaMap({ registry, inventory, titles, values }: MapSources): FigmaMap {
  const listed = new Map(inventory.components.map((node) => [node.nodeId, node]))
  const nodeIds = [...new Set([...listed.keys(), ...Object.keys(registry.entries)])].sort(
    (left, right) => left.localeCompare(right, undefined, { numeric: true }),
  )
  const nodes: Record<string, MapNode> = {}
  for (const nodeId of nodeIds) {
    const node = listed.get(nodeId)
    const decision = nodeDecision(registry, titles, nodeId, node)
    // The two directions of the map are the public surface: a name the package
    // does not export is readable in the row but never advertised as an import
    // a consumer could write.
    const exports = decision.names.filter((name) => values.has(name))
    const unexported = decision.names.filter((name) => !values.has(name))
    nodes[nodeId] = {
      ...(node ? { figma: node.name, page: node.pageName, type: node.type } : {}),
      status: decision.status,
      exports,
      ...(unexported.length ? { unexported } : {}),
      ...(decision.story ? { story: decision.story } : {}),
      ...(decision.reason ? { reason: decision.reason } : {}),
    }
  }
  // The reverse index is the public API and nothing else: the values the report
  // exports, each with the nodes that render it. An export with no node keeps an
  // empty list rather than disappearing, and a name no consumer can import
  // (`Checkbox`, a Storybook-only template) gets no row at all.
  const exports: Record<string, string[]> = {}
  for (const name of [...values].sort()) exports[name] = []
  for (const [nodeId, node] of Object.entries(nodes))
    for (const name of node.exports) {
      const row = exports[name]
      if (row) row.push(nodeId)
    }
  return {
    schemaVersion: 1,
    fileKey: inventory.fileKey,
    syncedAt: inventory.syncedAt,
    nodes,
    exports,
  }
}

function readRoot<T>(workspace: Workspace, schema: z.ZodType<T>, file: string): T {
  return parseSchema(schema, readJson(workspace.path(file)), file)
}

// The map a run of the tooling would write now. Regenerating it is the whole
// check: the artifact holds no state of its own, so a difference is a stale
// export and never a decision to reconcile by hand.
export function currentMap(workspace: Workspace): FigmaMap {
  return figmaMap({
    registry: readRegistry(committedFile("registry", workspace.root)),
    inventory: readInventory(committedFile("inventory", workspace.root)),
    titles: readRoot(workspace, StoryTitlesSchema, STORY_TITLES_PATH),
    values: publicValues(workspace),
  })
}

function serialized(map: FigmaMap): string {
  return `${JSON.stringify(map, null, 2)}\n`
}

function summary(map: FigmaMap): string {
  const names = Object.keys(map.exports)
  const mapped = names.filter((name) => map.exports[name].length > 0).length
  return `${Object.keys(map.nodes).length} nodes, ${mapped}/${names.length} exports mapped`
}

// The invariants the map must hold whatever the inputs say. They are the
// promises the consumer reads: a row for every export, the two directions
// agreeing, and an implemented node that the Figma file the map names still
// contains.
export function mapProblems(map: FigmaMap, inventory: Inventory, values: Set<string>): string[] {
  const problems: string[] = []
  const listed = new Set(inventory.components.map((node) => node.nodeId))
  for (const name of values) if (!(name in map.exports)) problems.push(`${name} is not indexed`)
  for (const [nodeId, node] of Object.entries(map.nodes)) {
    if (node.status === "implemented" && !listed.has(nodeId))
      problems.push(`${nodeId} is implemented but missing from ${COMMITTED_FILES.inventory}`)
    for (const name of node.exports) {
      if (!values.has(name))
        problems.push(`${nodeId} advertises ${name}, which @pagopa/ui does not export`)
      const row = map.exports[name]
      if (row && !row.includes(nodeId)) problems.push(`${nodeId} renders ${name}, which omits it`)
    }
    for (const name of node.unexported ?? [])
      if (values.has(name))
        problems.push(`${nodeId} marks ${name} unexported, but @pagopa/ui exports it`)
  }
  for (const [name, row] of Object.entries(map.exports)) {
    if (!values.has(name)) problems.push(`${name} is indexed but not exported by @pagopa/ui`)
    for (const nodeId of row)
      if (!(nodeId in map.nodes)) problems.push(`${name} lists ${nodeId}, which has no row`)
  }
  return problems
}

export function updateMap(workspace: Workspace): string {
  const map = currentMap(workspace)
  // The shipped artifact is written with the exact bytes the check compares
  // against: a formatter between them would make every regeneration look stale.
  writeText(workspace.path(FIGMA_MAP_PATH), serialized(map))
  return `${FIGMA_MAP_PATH}: ${summary(map)}`
}

// The check and the write share one generator: a plain run regenerates the map
// in memory and fails when the committed artifact differs, so no hand edit
// survives a run.
export function checkMap(workspace: Workspace): CheckReport {
  const map = currentMap(workspace)
  const problems = mapProblems(
    map,
    readInventory(committedFile("inventory", workspace.root)),
    publicValues(workspace),
  )
  const file = workspace.path(FIGMA_MAP_PATH)
  if (!fs.existsSync(file)) {
    return report("figma map", `${FIGMA_MAP_PATH} is missing`, [
      `missing ${FIGMA_MAP_PATH} — run "pnpm nx run pagopa-ui:figma:map"`,
    ])
  }
  // A committed map that does not even parse is reported as such: the byte
  // comparison below would call a hand edit "stale", and the schema says which
  // row is wrong.
  try {
    parseSchema(FigmaMapSchema, readJson(file), FIGMA_MAP_PATH)
  } catch (error) {
    return report("figma map", `${FIGMA_MAP_PATH} does not parse`, [
      error instanceof Error ? error.message : String(error),
    ])
  }
  if (fs.readFileSync(file, "utf8") !== serialized(map))
    problems.unshift(
      `${FIGMA_MAP_PATH} is stale — run "pnpm nx run pagopa-ui:figma:map" (the build regenerates it)`,
    )
  return report(
    "figma map",
    problems.length
      ? `${problems.length} problem(s) in ${FIGMA_MAP_PATH}`
      : `${FIGMA_MAP_PATH} matches the catalogue (${summary(map)})`,
    problems,
  )
}
