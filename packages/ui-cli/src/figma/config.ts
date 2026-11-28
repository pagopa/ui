import fs from "node:fs"

import yaml from "js-yaml"
import { z } from "zod"

import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { parseSchema } from "../lib/validate.ts"

/**
 * `figma-to-code.yaml` is the one place the skill's paths are declared, and the
 * modules that read a path read it here. Three readers used to parse it on their
 * own — a regex per key, each tolerant of a shape the others were not — so a
 * key could resolve one way for `request open` and another for `figma status`.
 */
export const CONFIG_PATH = "figma-to-code.yaml"

// Only the keys a module reads. The file declares more, and a key every reader
// defaults over is not a key anything resolves: reading it here would make the
// config a second source of truth that no code consults. `design.requests` used
// to name the folder the mirrors lived in; the issue tracker is the only home
// now, so the key is gone and a note points at an issue URL.
const FigmaConfigSchema = z.looseObject({
  design: z
    .looseObject({
      owners: z.array(z.string()).optional(),
      preview: z
        .looseObject({ url: z.string().optional(), branch: z.string().optional() })
        .optional(),
    })
    .optional(),
})

export type FigmaConfig = z.infer<typeof FigmaConfigSchema>

export function parseFigmaConfig(source: string): FigmaConfig {
  let loaded: unknown
  try {
    loaded = yaml.load(source)
  } catch (error) {
    throw new UsageError(
      `${CONFIG_PATH}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
    )
  }
  try {
    return parseSchema(FigmaConfigSchema, loaded ?? {}, CONFIG_PATH)
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error))
  }
}

export function readFigmaConfig(workspace: Workspace): FigmaConfig {
  const file = workspace.path(CONFIG_PATH)
  if (!fs.existsSync(file)) return {}
  return parseFigmaConfig(fs.readFileSync(file, "utf8"))
}

export type DesignConfig = {
  owners: string[]
  preview: string
  previewBranch: string
}

/**
 * The design values every reader resolves. The fallbacks are the values the
 * modules used before the config was read, so a workspace that carries the file
 * and one that does not resolve the same values.
 */
export function designPaths(config: FigmaConfig): DesignConfig {
  const design = config.design ?? {}
  return {
    owners: design.owners ?? [],
    preview: design.preview?.url || "none",
    previewBranch: design.preview?.branch ?? "",
  }
}

/** A literal string, ready to sit inside a `RegExp` source. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * The design-request pointer a registry note carries: the issue URL, because
 * the tracker is the only home. The record used to be a Markdown file and five
 * readers each matched the folder on their own, so a note pointing at a record
 * the config had moved away from counted as no pointer at all. One pattern
 * answers for every reader now, and it does not depend on a configured path.
 */
const ISSUE_URL = /https:\/\/[^\s/?]+\/[^\s/]+\/[^\s/]+\/issues\/\d+/g

/** The issue URLs a note names, in the order it names them. */
export function issuePointers(text: string | null | undefined): string[] {
  return [...new Set(text?.match(ISSUE_URL) ?? [])]
}
