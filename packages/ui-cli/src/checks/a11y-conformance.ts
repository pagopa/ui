#!/usr/bin/env node
// Accessibility conformance map: every PascalCase runtime export of the public
// API is assigned to a row of the accessibility guide's "Criteria by component
// type" table, so a new export cannot ship without a declared conformance.
// The guide stays the human view; the map is the machine one, and the two are
// tied by the type name.
//
// Run: `ui-cli check a11y-conformance`
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { resolveRoot, resolveStoriesRoot } from "../lib/paths.ts"
import { parseSchema } from "../lib/validate.ts"

const API_REPORT = "packages/pagopa-ui/etc/pagopa-ui.api.md"
const STORIES = "apps/storybook"
// The guide is named in pieces: the docs check reads a `…src/…/name.md` token as
// a document path and would resolve it against the design-system package.
const GUIDE_NAME = "accessibility.md"
const GUIDE = `${STORIES}/src/guides/${GUIDE_NAME}`
const MAP = `${STORIES}/src/a11y/conformance.json`
const TABLE_HEADING = "## Criteria by component type"
// The runtime exports of the report: types and interfaces have no rendering to
// assign, and the runtime functions that start lowercase are hooks.
const RUNTIME_EXPORT = /^export\s+(?:declare\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*)/gm

const ConformanceSchema = z.object({
  types: z.array(z.string()),
  components: z.record(
    z.string(),
    z.object({
      type: z.string().nullable(),
      reason: z.string().optional(),
    }),
  ),
})

export type Conformance = z.infer<typeof ConformanceSchema>

export function runtimeExports(report: string): string[] {
  return [...report.matchAll(RUNTIME_EXPORT)].map((match) => match[1])
}

// The first-column values of the guide's table, in the order they are written.
export function guideTypes(markdown: string): string[] {
  const lines = markdown.split("\n")
  const start = lines.findIndex((line) => line.trim() === TABLE_HEADING)
  if (start < 0) return []
  const types: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break
    if (!line.startsWith("|")) continue
    const cell = (line.split("|")[1] ?? "").trim()
    // The header row and the dashed alignment row carry no type.
    if (!cell || cell === "Component type" || /^[-:\s]+$/.test(cell)) continue
    types.push(cell)
  }
  return types
}

export function evaluateConformance(
  exports: string[],
  types: string[],
  map: Conformance,
): string[] {
  const errors: string[] = []
  const known = new Set(types)
  for (const type of map.types) {
    if (!known.has(type)) {
      errors.push(`${MAP}: "${type}" is not a component type of ${GUIDE}`)
    }
  }
  const declared = new Set(map.types)
  for (const [name, entry] of Object.entries(map.components)) {
    if (!exports.includes(name)) {
      errors.push(`${MAP}: "${name}" is not a runtime export of ${API_REPORT}`)
    }
    if (entry.type === null) {
      if (!entry.reason?.trim()) {
        errors.push(`${MAP}: "${name}" has no type and no reason`)
      }
    } else if (!declared.has(entry.type)) {
      errors.push(`${MAP}: "${name}" names the type "${entry.type}", which is not in "types"`)
    }
  }
  for (const name of exports) {
    if (!Object.hasOwn(map.components, name)) {
      errors.push(`${MAP}: "${name}" has no conformance entry`)
    }
  }
  return errors
}

export function runA11yConformance(): number {
  const stories = resolveStoriesRoot()
  const files = {
    [API_REPORT]: path.join(resolveRoot(), "etc", "pagopa-ui.api.md"),
    [GUIDE]: path.join(stories, "src", "guides", GUIDE_NAME),
    [MAP]: path.join(stories, "src", "a11y", "conformance.json"),
  }
  for (const [label, file] of Object.entries(files)) {
    if (!fs.existsSync(file)) {
      console.error(`a11y-conformance: missing ${label}`)
      return 1
    }
  }
  const map = parseSchema(ConformanceSchema, JSON.parse(fs.readFileSync(files[MAP], "utf8")), MAP)
  const exports = runtimeExports(fs.readFileSync(files[API_REPORT], "utf8"))
  const types = guideTypes(fs.readFileSync(files[GUIDE], "utf8"))
  const errors = evaluateConformance(exports, types, map)
  if (errors.length) {
    console.error(`a11y-conformance: ${errors.length} problem(s)`)
    for (const error of errors) console.error(`  ${error}`)
    return 1
  }
  console.log(`a11y-conformance OK (${exports.length} components, ${types.length} types)`)
  return 0
}
