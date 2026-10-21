#!/usr/bin/env node
// Storybook titles of the stories the registry points at.
//
// The Figma inventory story links every mapped node to its Storybook page, and
// the first half of a Storybook id is the story title
// (`Components/Inputs/TextField` -> `components-inputs-textfield--playground`).
// The title lives in the story file, not in the registry, so it is committed
// once in `src/catalog/figma/story-titles.json`: the browser bundle reads the
// map and never parses the story sources.
//
// The file is generated. `check figma` fails while it is stale, so a renamed
// story cannot leave a dead link behind.
//
// Usage:
//   node src/cli.ts figma stories [--write]
import fs from "node:fs"
import { z } from "zod"

import { absolutePath, enterRoot, rootPath } from "../lib/paths.ts"
import { readJson, writeJson } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import { storyTitle } from "../lib/source-modules.ts"
import { RegistrySchema, type Registry } from "../schemas/catalogue.ts"

export const STORY_TITLES_PATH = "src/catalog/figma/story-titles.json"

const StoryTitlesSchema = z.record(z.string(), z.string())

export type StoryTitles = z.infer<typeof StoryTitlesSchema>

// One title per story file the registry links, sorted so the committed diff
// reads as a list instead of a reshuffle. A story without a parseable title is
// left out: the card simply carries no Storybook link.
export function storyTitles(registry: Registry): StoryTitles {
  const files = new Set(
    Object.values(registry.entries ?? {})
      .map((entry) => entry.target?.story)
      .filter((file): file is string => Boolean(file)),
  )
  const titles: StoryTitles = {}
  for (const file of [...files].sort()) {
    if (!fs.existsSync(absolutePath(file))) continue
    const title = storyTitle(file)
    if (title) titles[file] = title
  }
  return titles
}

// The committed map against the stories the registry points at. A fixture tree
// carries no map: the story import is what proves the file exists in the real
// package, so the check reads it only when it is there.
export function staleStoryTitles(registry: Registry): string[] {
  const file = rootPath(STORY_TITLES_PATH)
  if (!fs.existsSync(file)) return []
  const committed = parseSchema(StoryTitlesSchema, readJson(file), STORY_TITLES_PATH)
  const expected = storyTitles(registry)
  const problems: string[] = []
  for (const [story, title] of Object.entries(expected)) {
    if (!(story in committed)) problems.push(`${STORY_TITLES_PATH}: missing ${story}`)
    else if (committed[story] !== title) {
      problems.push(`${STORY_TITLES_PATH}: stale title for ${story}`)
    }
  }
  for (const story of Object.keys(committed)) {
    if (!(story in expected))
      problems.push(`${STORY_TITLES_PATH}: ${story} is not a registry story`)
  }
  return problems
}

export function runStories(argv: string[] = process.argv.slice(2)): number {
  enterRoot()
  const registry = parseSchema(
    RegistrySchema,
    readJson(rootPath("src/catalog/figma/registry.json")),
    "src/catalog/figma/registry.json",
  )
  if (argv.includes("--write")) {
    const titles = storyTitles(registry)
    writeJson(rootPath(STORY_TITLES_PATH), titles)
    console.log(`${STORY_TITLES_PATH}: ${Object.keys(titles).length} stories written`)
    return 0
  }
  if (!fs.existsSync(rootPath(STORY_TITLES_PATH))) {
    console.error(`error: missing ${STORY_TITLES_PATH} (run \`figma stories --write\`)`)
    return 1
  }
  const problems = staleStoryTitles(registry)
  for (const problem of problems) console.error(`error: ${problem}`)
  if (problems.length) return 1
  console.log(
    `${STORY_TITLES_PATH}: up to date (${Object.keys(storyTitles(registry)).length} stories)`,
  )
  return 0
}
