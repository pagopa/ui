import fs from "node:fs"

import yaml from "js-yaml"

import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"

/**
 * `figma-to-code.yaml` is the one place the skill's paths are declared, and the
 * modules that read a path read it here. Three readers used to parse it on their
 * own — a regex per key, each tolerant of a shape the others were not — so a
 * key could resolve one way for `request open` and another for `figma status`.
 */
export const CONFIG_PATH = "figma-to-code.yaml"

/** The design-request folder a checkout without the config keeps using. */
export const DEFAULT_REQUESTS_DIR = "docs/design-requests"

type Yaml = Record<string, unknown>

function isMapping(value: unknown): value is Yaml {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * The file with its dotted keys flattened, so a caller asks for
 * `catalog.inventory` instead of walking a chain of possibly-missing objects.
 * A scalar where a block belongs (or the reverse) is an error, not a `null` the
 * caller reads as absent.
 */
function flatten(
  value: Yaml,
  prefix: string,
  values: Record<string, string>,
  lists: Record<string, string[]>,
): void {
  for (const [key, entry] of Object.entries(value)) {
    const dotted = prefix ? `${prefix}.${key}` : key
    if (Array.isArray(entry)) {
      lists[dotted] = entry.map((item) => {
        if (typeof item !== "string")
          throw new UsageError(`${CONFIG_PATH}: "${dotted}" holds a non-scalar item`)
        return item
      })
      continue
    }
    if (typeof entry === "string") {
      values[dotted] = entry
      continue
    }
    if (typeof entry === "number" || typeof entry === "boolean") {
      values[dotted] = String(entry)
      continue
    }
    if (isMapping(entry)) {
      flatten(entry, dotted, values, lists)
      continue
    }
    if (entry === null || entry === undefined) continue
    throw new UsageError(`${CONFIG_PATH}: "${dotted}" holds a value the readers cannot read`)
  }
}

export type FigmaToolConfig = {
  /** Every scalar by its dotted key, e.g. `catalog.inventory`. */
  values: Record<string, string>
  /** Every list by its dotted key, e.g. `design.owners`. */
  lists: Record<string, string[]>
}

export function parseFigmaConfig(source: string): FigmaToolConfig {
  let parsed: unknown
  try {
    parsed = yaml.load(source)
  } catch (error) {
    throw new UsageError(
      `${CONFIG_PATH}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
    )
  }
  if (parsed === null || parsed === undefined) return { values: {}, lists: {} }
  if (!isMapping(parsed)) throw new UsageError(`${CONFIG_PATH}: the file is not a mapping`)
  const values: Record<string, string> = {}
  const lists: Record<string, string[]> = {}
  flatten(parsed, "", values, lists)
  return { values, lists }
}

export function readFigmaConfig(workspace: Workspace): FigmaToolConfig {
  const file = workspace.path(CONFIG_PATH)
  if (!fs.existsSync(file)) return { values: {}, lists: {} }
  return parseFigmaConfig(fs.readFileSync(file, "utf8"))
}

/**
 * A path the config declares, with the default a checkout without the file keeps
 * using. The fallbacks are the values the modules used before the config was
 * read, so a workspace that carries the file and one that does not resolve the
 * same path.
 */
export function configPath(config: FigmaToolConfig, key: string, fallback: string): string {
  return config.values[key] || fallback
}

export function configList(config: FigmaToolConfig, key: string): string[] {
  return config.lists[key] ?? []
}

/** A literal string, ready to sit inside a `RegExp` source. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * The pattern that finds a design-request pointer inside a registry note. Three
 * readers scanned notes for the same shape, each with its own copy of the
 * folder, so a config that moved the requests left two of them scanning a path
 * that no longer exists.
 *
 * The folder is required for that reason: it belongs to `designPaths(...)` and a
 * default would put a reader back on a path the config had moved away from.
 */
export function requestPointer(folder: string): RegExp {
  const escaped = escapeRegExp(folder.replace(/\/$/, ""))
  return new RegExp(`\\b${escaped}/[\\w./-]+\\.md\\b`, "g")
}

/**
 * The design-request folder this workspace resolves. Six readers each spelled
 * `designPaths(readFigmaConfig(workspace)).requests`, which is one decision
 * written six times; a reader that needs the folder asks for it here.
 */
export function requestsFolder(workspace: Workspace): string {
  return designPaths(readFigmaConfig(workspace)).requests
}

export type DesignConfig = {
  requests: string
  owners: string[]
  preview: string
  previewBranch: string
}

export function designPaths(config: FigmaToolConfig): DesignConfig {
  return {
    requests: configPath(config, "design.requests", DEFAULT_REQUESTS_DIR),
    owners: configList(config, "design.owners"),
    preview: configPath(config, "design.preview.url", "none"),
    previewBranch: configPath(config, "design.preview.branch", ""),
  }
}
