#!/usr/bin/env node
// The package is also an Agent Plugin: a consuming agent installs `@pagopa/ui`
// and finds a manifest, a skill that says how to read the map, and the map
// itself. Each of those drifts silently from the others — the skill frontmatter
// from the folder it lives in, the `files` list from what the plugin needs at
// runtime. This check is the only place that reads them all.
//
//   node src/cli.ts check plugin
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { readJson } from "../lib/json.ts"
import { enterRoot, rootPath } from "../lib/paths.ts"
import { parseSchema } from "../lib/validate.ts"

const PLUGIN_PATH = "plugin.json"
// The package manifest, as far as the plugin needs it: the `files` list that
// decides what is published.
const ManifestSchema = z.object({
  files: z.array(z.string()).optional(),
})
const MANIFEST_PATH = "package.json"
const SKILLS_DIR = "skills"

// The Agent Plugins 1.0.0 manifest. The schema is fetched rather than vendored,
// so these are its constraints, not a copy of the file.
export const PluginSchema = z.strictObject({
  $schema: z.literal("https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"),
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/, "not a plugin name"),
  version: z.string().optional(),
  description: z.string().optional(),
  author: z
    .strictObject({
      name: z.string().optional(),
      email: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  homepage: z.string().optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  extensions: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
})

export type Plugin = z.infer<typeof PluginSchema>

// What the plugin needs on disk once installed. The map is the data, the skill
// is the procedure, the command line is the reader.
const SHIPPED = ["plugin.json", "skills", "figma-map.json", "cli"]

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SKILL_KEYS = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
])
const DESCRIPTION_LIMIT = 1024
const COMPATIBILITY_LIMIT = 500

type Frontmatter = Map<string, string>

// The frontmatter the skills in this package carry is flat `key: value`, so a
// line parser is the whole reader; a block value (`metadata:`) is left out of
// the checks that need a value rather than parsed wrongly.
export function frontmatter(text: string): Frontmatter | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text)
  if (!match) return null
  const fields: Frontmatter = new Map()
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([a-z][a-z-]*):\s*(.*)$/.exec(line)
    if (field) fields.set(field[1], field[2].replace(/^["']|["']$/g, "").trim())
  }
  return fields
}

function skillProblems(dir: string): string[] {
  const name = path.basename(dir)
  const file = path.join(dir, "SKILL.md")
  if (!fs.existsSync(file)) return [`${name}: missing SKILL.md`]
  const fields = frontmatter(fs.readFileSync(file, "utf8"))
  if (!fields) return [`${name}: SKILL.md has no frontmatter`]
  const problems: string[] = []
  const declared = fields.get("name")
  if (!declared) problems.push(`${name}: SKILL.md has no name`)
  else if (declared !== name)
    problems.push(`${name}: SKILL.md declares name "${declared}", which must equal its folder`)
  else if (!SKILL_NAME.test(declared) || declared.length > 64)
    problems.push(`${name}: "${declared}" is not a skill name`)
  const description = fields.get("description")
  if (!description) problems.push(`${name}: SKILL.md has no description`)
  else if (description.length > DESCRIPTION_LIMIT)
    problems.push(
      `${name}: the description is ${description.length} characters, the limit is ${DESCRIPTION_LIMIT}`,
    )
  const compatibility = fields.get("compatibility")
  if (compatibility && compatibility.length > COMPATIBILITY_LIMIT)
    problems.push(
      `${name}: compatibility is ${compatibility.length} characters, the limit is ${COMPATIBILITY_LIMIT}`,
    )
  for (const key of fields.keys())
    if (!SKILL_KEYS.has(key)) problems.push(`${name}: SKILL.md has an unknown field "${key}"`)
  return problems
}

export function pluginProblems(root: string): string[] {
  const problems: string[] = []
  const pluginFile = path.join(root, PLUGIN_PATH)
  if (!fs.existsSync(pluginFile)) return [`${PLUGIN_PATH} is missing`]
  let plugin: Plugin
  try {
    plugin = parseSchema(PluginSchema, readJson(pluginFile), PLUGIN_PATH)
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)]
  }

  const manifest = parseSchema(
    ManifestSchema,
    readJson(path.join(root, MANIFEST_PATH)),
    MANIFEST_PATH,
  )
  // The plugin ships inside the package, so its version is the package
  // version: the manifest leaves it out rather than restating a release that
  // `nx release` bumps without touching this file.
  if (plugin.version !== undefined)
    problems.push(`${PLUGIN_PATH}: drop "version" — the package version is the plugin version`)

  // `files` is what npm keeps: a plugin file outside it is built and published
  // nowhere, which no local run notices.
  const files = manifest.files ?? []
  for (const entry of SHIPPED)
    if (!files.some((file) => file === entry || file.startsWith(`${entry}/`)))
      problems.push(`${MANIFEST_PATH}: "files" does not ship ${entry}`)

  const skillsDir = path.join(root, SKILLS_DIR)
  if (!fs.existsSync(skillsDir)) return [...problems, `${SKILLS_DIR}/ is missing`]
  const dirs = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsDir, entry.name))
  if (!dirs.length) problems.push(`${SKILLS_DIR}/ holds no skill`)
  for (const dir of dirs) problems.push(...skillProblems(dir))
  return problems
}

export function runPlugin(): number {
  enterRoot()
  const problems = pluginProblems(rootPath())
  if (!problems.length) {
    console.log(`plugin:check: plugin.json, ${SKILLS_DIR}/ and the shipped files agree`)
    return 0
  }
  console.error(`plugin:check: ${problems.length} problem(s)`)
  for (const problem of problems) console.error(`  ${problem}`)
  return 1
}
