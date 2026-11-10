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

/** The design-request folder a checkout without the config keeps using. */
export const DEFAULT_REQUESTS_DIR = "docs/design-requests"

// Only the keys a module reads. The file declares more, and a key every reader
// defaults over is not a key anything resolves: reading it here would make the
// config a second source of truth that no code consults.
const FigmaConfigSchema = z.looseObject({
  design: z
    .looseObject({
      requests: z.string().optional(),
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
  requests: string
  owners: string[]
  preview: string
  previewBranch: string
}

/**
 * The design paths every reader resolves. The fallbacks are the values the
 * modules used before the config was read, so a workspace that carries the file
 * and one that does not resolve the same path.
 */
export function designPaths(config: FigmaConfig): DesignConfig {
  const design = config.design ?? {}
  return {
    requests: design.requests || DEFAULT_REQUESTS_DIR,
    owners: design.owners ?? [],
    preview: design.preview?.url || "none",
    previewBranch: design.preview?.branch ?? "",
  }
}

/**
 * The design-request folder this workspace resolves. Five readers each spelled
 * the folder out, so a config that moved the requests left them scanning a path
 * that no longer exists; a reader that needs the folder asks for it here.
 */
export function requestsFolder(workspace: Workspace): string {
  return designPaths(readFigmaConfig(workspace)).requests
}

/** A literal string, ready to sit inside a `RegExp` source. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * The pattern that finds a design-request pointer inside a registry note.
 *
 * The folder is required: it belongs to `designPaths(...)` and a default would
 * put a reader back on a path the config had moved away from.
 */
export function requestPointer(folder: string): RegExp {
  const escaped = escapeRegExp(folder.replace(/\/$/, ""))
  return new RegExp(`\\b${escaped}/[\\w./-]+\\.md\\b`, "g")
}
