import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import type { Workspace } from "../../adapters/workspace.ts"
import type { RegistryEntry } from "../../schemas/catalogue.ts"
import { walkFiles } from "../../lib/fs.ts"
import { createSourceModules } from "../../lib/source-modules.ts"
import { parseSchema } from "../../lib/validate.ts"

export type SourceModules = ReturnType<typeof createSourceModules>

export function exportNames(sourceModules: SourceModules, file: string): Set<string> {
  return new Set(sourceModules.runtimeExports(file).keys())
}

export function moduleExports(
  workspace: Workspace,
  sourceModules: SourceModules,
  file: string,
): Map<string, string> {
  return fs.existsSync(workspace.path(file)) ? sourceModules.runtimeExports(file) : new Map()
}

export function collectPublicExports(sourceModules: SourceModules): Map<string, string> {
  return sourceModules.runtimeExports("src/pagopa-ui.ts")
}

export function storyImports(
  workspace: Workspace,
  sourceModules: SourceModules,
): Map<string, Set<string>> {
  const imports = new Map<string, Set<string>>()
  for (const file of walkFiles(workspace.storiesRoot, (name) => name.endsWith(".stories.tsx"))) {
    const identity = workspace.identity(file)
    imports.set(
      identity,
      new Set(
        [...sourceModules.renderedStoryExports(identity).values()].flatMap((names) => [...names]),
      ),
    )
  }
  return imports
}

export function targetIdentities(
  target: NonNullable<RegistryEntry["target"]>,
): Array<{ module: string; export: string }> {
  return [
    { module: target.module, export: target.export },
    ...(target.additionalExports ?? []).map((name) => ({ module: target.module, export: name })),
    ...(target.additionalTargets ?? []),
  ]
}

export function matchesModulePattern(file: string, pattern: string): boolean {
  return pattern.endsWith("*") ? file.startsWith(pattern.slice(0, -1)) : file === pattern
}

export function iconListConstant(workspace: Workspace, name: string): string[] {
  const source = fs.readFileSync(
    path.join(workspace.artworkRoot, "src/components/icons/figma-inventory.ts"),
    "utf8",
  )
  const block = source.match(new RegExp(`${name} = \\[([\\s\\S]*?)\\] as const`))?.[1] ?? ""
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1])
}

export function compareNames(
  actual: string[],
  expected: string[],
  label: string,
  file: string,
  known: string[] = expected,
): string[] {
  const errors: string[] = []
  const missing = expected.filter((name) => !actual.includes(name))
  const stale = actual.filter((name) => !known.includes(name))
  if (missing.length) errors.push(`${label}: missing from ${file}: ${missing.join(", ")}`)
  if (stale.length) errors.push(`${label}: stale (no mapped identity): ${stale.join(", ")}`)
  return errors
}

export function parseExceptions<T>(
  workspace: Workspace,
  file: string,
  schema: z.ZodType<T>,
  errors: string[],
): T | null {
  const absolute = workspace.path(file)
  if (!fs.existsSync(absolute)) return null
  try {
    return parseSchema(schema, JSON.parse(fs.readFileSync(absolute, "utf8")), file)
  } catch (error) {
    errors.push(`${file}: invalid JSON (${error instanceof Error ? error.message : String(error)})`)
    return null
  }
}
