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

import { UsageError } from "../lib/command.ts"
import { readJson, writeJson } from "../lib/json.ts"
import { enterRoot, rootPath } from "../lib/paths.ts"
import { parseSchema } from "../lib/validate.ts"
import { storyId } from "../parity/cases.ts"
import {
  InventorySchema,
  RegistrySchema,
  type Inventory,
  type Registry,
  type Target,
} from "../schemas/catalogue.ts"
import { FigmaMapSchema, type FigmaMap, type MapNode } from "../schemas/map.ts"
import { STORY_TITLES_PATH, StoryTitlesSchema, type StoryTitles } from "./stories.ts"

export const FIGMA_MAP_PATH = "figma-map.json"
export const API_REPORT_PATH = "etc/pagopa-ui.api.md"
const INVENTORY_PATH = "src/catalog/figma/inventory.json"
const REGISTRY_PATH = "src/catalog/figma/registry.json"

// The public surface is the API report, not the registry: a component the
// package exports is what a consumer can render, whether or not Figma drew it.
// Only values count (a type is not something to render), and the report lists
// each one with its declaration keyword.
export function publicValues(): Set<string> {
  const file = rootPath(API_REPORT_PATH)
  if (!fs.existsSync(file)) {
    throw new UsageError(`missing ${API_REPORT_PATH} — run "pnpm nx run pagopa-ui:api:update"`)
  }
  const text = fs.readFileSync(file, "utf8")
  const names = new Set<string>()
  for (const match of text.matchAll(
    /^export (?:declare )?(?:function|const|class) ([A-Za-z0-9_]+)/gm,
  ))
    names.add(match[1])
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

export type MapSources = {
  registry: Registry
  inventory: Inventory
  titles: StoryTitles
  values: Set<string>
}

export function figmaMap({ registry, inventory, titles, values }: MapSources): FigmaMap {
  const listed = new Map(inventory.components.map((node) => [node.nodeId, node]))
  const nodes: Record<string, MapNode> = {}
  const nodeIds = Object.keys(registry.entries).sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true }),
  )
  for (const nodeId of nodeIds) {
    const entry = registry.entries[nodeId]
    const node = listed.get(nodeId)
    const story = storyFor(entry.target, titles)
    nodes[nodeId] = {
      ...(node ? { figma: node.name, page: node.pageName, type: node.type } : {}),
      status: entry.status,
      exports: targetExports(entry.target),
      ...(story ? { story } : {}),
      ...(entry.reason ? { reason: entry.reason } : {}),
    }
  }
  // The reverse index covers the public surface and every export a node names,
  // so a search for an internal the package re-exports (`Checkbox`) still lands
  // on its node. The public values seed it: an export with no node keeps an
  // empty list rather than disappearing.
  const names = new Set(values)
  for (const node of Object.values(nodes)) for (const name of node.exports) names.add(name)
  const exports: Record<string, string[]> = {}
  for (const name of [...names].sort()) exports[name] = []
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

function readRoot<T>(schema: z.ZodType<T>, file: string): T {
  return parseSchema(schema, readJson(rootPath(file)), file)
}

// The map a run of the tooling would write now. Regenerating it is the whole
// check: the artifact holds no state of its own, so a difference is a stale
// export and never a decision to reconcile by hand.
export function currentMap(): FigmaMap {
  return figmaMap({
    registry: readRoot(RegistrySchema, REGISTRY_PATH),
    inventory: readRoot(InventorySchema, INVENTORY_PATH),
    titles: readRoot(StoryTitlesSchema, STORY_TITLES_PATH),
    values: publicValues(),
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
      problems.push(`${nodeId} is implemented but missing from ${INVENTORY_PATH}`)
    for (const name of node.exports) {
      const row = map.exports[name]
      if (row && !row.includes(nodeId)) problems.push(`${nodeId} renders ${name}, which omits it`)
    }
  }
  for (const [name, row] of Object.entries(map.exports))
    for (const nodeId of row)
      if (!(nodeId in map.nodes)) problems.push(`${name} lists ${nodeId}, which has no row`)
  return problems
}

export function runMap(argv: string[]): number {
  enterRoot()
  const map = currentMap()
  if (argv.includes("--write")) {
    writeJson(rootPath(FIGMA_MAP_PATH), map)
    console.log(`${FIGMA_MAP_PATH}: ${summary(map)}`)
    return 0
  }

  const file = rootPath(FIGMA_MAP_PATH)
  if (!fs.existsSync(file)) {
    console.error(
      `figma:map:check: missing ${FIGMA_MAP_PATH} — run "pnpm nx run pagopa-ui:figma:map"`,
    )
    return 1
  }
  // A committed map that does not even parse is reported as such: the byte
  // comparison below would call a hand edit "stale", and the schema says which
  // row is wrong.
  try {
    parseSchema(FigmaMapSchema, readJson(file), FIGMA_MAP_PATH)
  } catch (error) {
    console.error(`figma:map:check: ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }
  const problems = mapProblems(map, readRoot(InventorySchema, INVENTORY_PATH), publicValues())
  if (fs.readFileSync(file, "utf8") !== serialized(map))
    problems.unshift(
      `${FIGMA_MAP_PATH} is stale — run "pnpm nx run pagopa-ui:figma:map" (the build regenerates it)`,
    )
  if (!problems.length) {
    console.log(`figma:map:check: ${FIGMA_MAP_PATH} matches the catalogue (${summary(map)})`)
    return 0
  }
  console.error(`figma:map:check: ${problems.length} problem(s)`)
  for (const problem of problems.slice(0, 20)) console.error(`  ${problem}`)
  return 1
}
