import fs from "node:fs"
import type { z } from "zod"

import { readJson, writeJson } from "../../lib/json.ts"
import { parseSchema } from "../../lib/validate.ts"

export type PinnedManifest = { fileKey: string; version: string }

// A first export may not have a manifest yet; an existing one must parse and
// belong to the configured file.
export function readManifest<T>(file: string, schema: z.ZodType<T>): T | undefined {
  if (!fs.existsSync(file)) return undefined
  return parseSchema(schema, readJson(file), file)
}

export function assertPinnedManifest<T extends PinnedManifest>(
  manifest: T | undefined,
  fileKey: string,
  label: string,
): void {
  if (!manifest) return
  if (manifest.fileKey !== fileKey || typeof manifest.version !== "string" || !manifest.version) {
    throw new Error(`${label} requires the configured file and a pinned version`)
  }
}

export function writeManifest(file: string, manifest: unknown): void {
  writeJson(file, manifest)
}
