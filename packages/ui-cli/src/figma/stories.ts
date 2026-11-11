import fs from "node:fs"
import { z } from "zod"

import type { Workspace } from "../adapters/workspace.ts"
import { createSourceModules } from "../lib/source-modules.ts"
import { readJson, writeJson } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import { report, type CheckReport } from "../checks/report.ts"
import type { Registry } from "../schemas/catalogue.ts"
import { readRegistry } from "../records/committed.ts"

export const STORY_TITLES_PATH = "src/catalog/figma/story-titles.json"

export const StoryTitlesSchema = z.record(z.string(), z.string())

export type StoryTitles = z.infer<typeof StoryTitlesSchema>

export function storyTitles(workspace: Workspace, registry: Registry): StoryTitles {
  const sources = createSourceModules(workspace)
  const files = new Set(
    Object.values(registry.entries ?? {})
      .map((entry) => entry.target?.story)
      .filter((file): file is string => Boolean(file)),
  )
  const titles: StoryTitles = {}
  for (const file of [...files].sort()) {
    if (!fs.existsSync(workspace.path(file))) continue
    const title = sources.storyTitle(file)
    if (title) titles[file] = title
  }
  return titles
}

export function staleStoryTitles(workspace: Workspace, registry: Registry): string[] {
  const file = workspace.path(STORY_TITLES_PATH)
  if (!fs.existsSync(file)) return []
  const committed = parseSchema(StoryTitlesSchema, readJson(file), STORY_TITLES_PATH)
  const expected = storyTitles(workspace, registry)
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

export function checkStories(workspace: Workspace): CheckReport {
  const registry = readRegistry(workspace.root)
  const file = workspace.path(STORY_TITLES_PATH)
  if (!fs.existsSync(file)) {
    return report("stories", `${STORY_TITLES_PATH} is missing`, [
      `missing ${STORY_TITLES_PATH} (run update stories)`,
    ])
  }
  const problems = staleStoryTitles(workspace, registry)
  return report(
    "stories",
    problems.length
      ? `${problems.length} stale title(s)`
      : `${Object.keys(storyTitles(workspace, registry)).length} titles up to date`,
    problems,
  )
}

export function updateStories(workspace: Workspace): string {
  const registry = readRegistry(workspace.root)
  const titles = storyTitles(workspace, registry)
  writeJson(workspace.path(STORY_TITLES_PATH), titles)
  return `${STORY_TITLES_PATH}: ${Object.keys(titles).length} stories written`
}
