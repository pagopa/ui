#!/usr/bin/env node
// CSS payload budget (documented in README.md): the published
// stylesheet may not grow past the recorded ceiling, so a surface that widens
// again fails here instead of reaching the consumer.
//
//   node src/cli.ts check css            # enforce the budget
//   node src/cli.ts check css --measure  # print the current sizes
//   node src/cli.ts check css --write    # record the size you accept
import fs from "node:fs"
import zlib from "node:zlib"
import { z } from "zod"

import { readJson, writeJson } from "../lib/json.ts"
import { enterRoot, toolingPath } from "../lib/paths.ts"
import { parseSchema } from "../lib/validate.ts"
import { CssBudgetSchema, type CssBudget } from "../schemas/checks.ts"

const BUDGET_PATH = process.env.PAGOPA_UI_CSS_BUDGET ?? toolingPath("data", "css-budget.json")
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
        `${metric}: ${value} bytes, the ceiling is ${ceiling} (-${ceiling - value}) — record the size you accept with "node src/cli.ts check css --write"`,
      )
    }
  }
  return { errors, notes }
}

function stylesFile(): string {
  const manifest = parseSchema(PackageManifestSchema, readJson("package.json"), "package.json")
  const entry = manifest.exports?.["./styles.css"]
  const value = typeof entry === "string" ? entry : entry?.default
  if (typeof value !== "string") {
    throw new Error('package.json: exports["./styles.css"] must point at the built stylesheet')
  }
  return value
}

function readBudget(): CssBudget | null {
  if (!fs.existsSync(BUDGET_PATH)) return null
  return parseSchema(CssBudgetSchema, readJson(BUDGET_PATH), BUDGET_LABEL)
}

export function runCssBudget(argv: string[] = process.argv.slice(2)): number {
  enterRoot()
  const file = stylesFile()
  if (!fs.existsSync(file)) {
    console.error(`missing ${file} — run "pnpm build" first`)
    return 1
  }
  const current = measure(fs.readFileSync(file))
  const budget = readBudget()

  if (argv.includes("--measure")) {
    console.log(JSON.stringify(current, null, 2))
    return 0
  }

  if (argv.includes("--write")) {
    const next: CssBudget = {
      schemaVersion: 1,
      ...(budget?.note ? { note: budget.note } : {}),
      metrics: { raw: 0, gzip: 0, brotli: 0 },
    }
    const kept: string[] = []
    for (const metric of METRICS) {
      const ceiling = budget?.metrics[metric]
      if (typeof ceiling === "number" && current[metric] > ceiling) {
        next.metrics[metric] = ceiling
        kept.push(metric)
      } else {
        next.metrics[metric] = current[metric]
      }
    }
    writeJson(BUDGET_PATH, next)
    const keptNote = kept.length ? ` (kept the higher ${kept.join(", ")} ceiling)` : ""
    console.log(
      `css budget written: raw ${next.metrics.raw} / gzip ${next.metrics.gzip} / brotli ${next.metrics.brotli}${keptNote}`,
    )
    return 0
  }

  if (!budget) {
    console.error(`${BUDGET_LABEL}: missing the budget — run "node src/cli.ts check css --write"`)
    return 1
  }
  const { errors, notes } = evaluate(current, budget)
  if (errors.length) {
    console.error(`css budget (${errors.length} problem(s)):`)
    for (const error of errors) console.error(`  ${error}`)
    console.error(
      `measured: raw ${current.raw} / gzip ${current.gzip} / brotli ${current.brotli} — copy the sizes you accept into ${BUDGET_LABEL}`,
    )
    return 1
  }
  for (const note of notes) console.log(`note: ${note}`)
  console.log(
    `css budget OK (raw ${current.raw} / gzip ${current.gzip} / brotli ${current.brotli})`,
  )
  return 0
}
