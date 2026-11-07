// CSS payload budget (documented in README.md): the published
// stylesheet may not grow past the recorded ceiling, so a surface that widens
// again fails here instead of reaching the consumer.
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import { z } from "zod"

import { readJson, writeJson } from "../lib/json.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { parseSchema } from "../lib/validate.ts"
import { CssBudgetSchema, type CssBudget } from "../schemas/checks.ts"
import { report, type CheckReport } from "./report.ts"

const BUDGET_LABEL = "data/css-budget.json"
const METRICS = ["raw", "gzip", "brotli"] as const

export type CssMetrics = Record<(typeof METRICS)[number], number>

const PackageManifestSchema = z.looseObject({
  exports: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.string())])).optional(),
})

function noise(ceiling: number): number {
  return Math.max(64, Math.round(ceiling * 0.005))
}

function slack(ceiling: number): number {
  return Math.max(256, Math.round(ceiling * 0.005))
}

const GROWTH_TOLERANCE: Record<(typeof METRICS)[number], (ceiling: number) => number> = {
  raw: () => 0,
  gzip: noise,
  brotli: noise,
}

export function measure(bytes: string | Buffer): CssMetrics {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  return {
    raw: buffer.length,
    gzip: zlib.gzipSync(buffer, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(buffer).length,
  }
}

export function evaluate(
  current: CssMetrics,
  budget: CssBudget,
): {
  errors: string[]
  notes: string[]
} {
  const errors: string[] = []
  const notes: string[] = []
  for (const metric of METRICS) {
    const ceiling = budget.metrics[metric]
    if (typeof ceiling !== "number") {
      errors.push(`${BUDGET_LABEL}: missing the "${metric}" ceiling`)
      continue
    }
    const value = current[metric]
    if (value > ceiling + GROWTH_TOLERANCE[metric](ceiling)) {
      errors.push(
        `${metric}: ${value} bytes, the ceiling is ${ceiling} (+${value - ceiling}) — ship fewer classes, or move the ceiling in a reviewed change`,
      )
    } else if (value < ceiling - slack(ceiling)) {
      notes.push(
        `${metric}: ${value} bytes, the ceiling is ${ceiling} (-${ceiling - value}) — record the size you accept with "ui-cli update css"`,
      )
    }
  }
  return { errors, notes }
}

// The budget file is the tooling's own data; `budgetFile` overrides it for a
// fixture.
export interface CssBudgetOptions {
  budgetFile?: string
}

const budgetPath = (workspace: Workspace, options: CssBudgetOptions): string =>
  options.budgetFile ?? path.join(workspace.toolingRoot, "data", "css-budget.json")

function stylesFile(workspace: Workspace): string {
  const manifest = parseSchema(
    PackageManifestSchema,
    readJson(workspace.path("package.json")),
    "package.json",
  )
  const entry = manifest.exports?.["./styles.css"]
  const value = typeof entry === "string" ? entry : entry?.default
  if (typeof value !== "string") {
    throw new UsageError('package.json: exports["./styles.css"] must point at the built stylesheet')
  }
  const file = workspace.path(value)
  if (!fs.existsSync(file)) throw new UsageError(`missing ${value} — run "pnpm build" first`)
  return file
}

function readBudget(file: string): CssBudget | null {
  if (!fs.existsSync(file)) return null
  return parseSchema(CssBudgetSchema, readJson(file), BUDGET_LABEL)
}

export function measureCss(workspace: Workspace): CssMetrics {
  return measure(fs.readFileSync(stylesFile(workspace)))
}

const sizes = (metrics: CssMetrics): string =>
  `raw ${metrics.raw} / gzip ${metrics.gzip} / brotli ${metrics.brotli}`

export function checkCssBudget(workspace: Workspace, options: CssBudgetOptions = {}): CheckReport {
  const current = measureCss(workspace)
  const budget = readBudget(budgetPath(workspace, options))
  if (!budget) {
    return report("css budget", sizes(current), [
      `${BUDGET_LABEL}: missing the budget — run "ui-cli update css"`,
    ])
  }
  const { errors, notes } = evaluate(current, budget)
  return report(
    "css budget",
    errors.length
      ? `measured ${sizes(current)} — copy the sizes you accept into ${BUDGET_LABEL}`
      : sizes(current),
    errors,
    { details: notes.map((note) => `note: ${note}`) },
  )
}

// Records the measured sizes, never raising a ceiling the stylesheet exceeds:
// growth is a reviewed edit of the budget file.
export function updateCssBudget(workspace: Workspace, options: CssBudgetOptions = {}): string {
  const file = budgetPath(workspace, options)
  const current = measureCss(workspace)
  const budget = readBudget(file)
  const metrics: CssMetrics = { ...current }
  const kept: string[] = []
  for (const metric of METRICS) {
    const ceiling = budget?.metrics[metric]
    if (typeof ceiling === "number" && current[metric] > ceiling) {
      metrics[metric] = ceiling
      kept.push(metric)
    }
  }
  const next: CssBudget = {
    schemaVersion: 1,
    ...(budget?.note ? { note: budget.note } : {}),
    metrics,
  }
  writeJson(file, next)
  const keptNote = kept.length ? ` (kept the higher ${kept.join(", ")} ceiling)` : ""
  return `css budget written: ${sizes(metrics)}${keptNote}`
}
