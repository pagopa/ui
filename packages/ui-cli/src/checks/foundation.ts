#!/usr/bin/env node
// Foundation contract for src/components (documented in README.md and
// .agents/skills/figma-to-code/references/tokens.md): the components consume
// the token scale instead of Tailwind defaults, raw Figma variables, palette
// colours, hex colours or off-scale spacing.
//
//   ui-cli check foundation            # enforce the baseline
//   ui-cli check foundation --measure  # print the current counts
import fs from "node:fs"
import { z } from "zod"

import { readJson } from "../lib/json.ts"
import { walkFiles } from "../lib/fs.ts"
import { enterRoot, tokensPath } from "../lib/paths.ts"
import { parseSchema } from "../lib/validate.ts"
import { parseSource } from "../lib/source-modules.ts"
import {
  FoundationBaselineSchema,
  FoundationExceptionsSchema,
  type FoundationException,
} from "../schemas/tokens.ts"

const FoundationManifestSchema = z.looseObject({
  foundations: z.record(z.string(), z.looseObject({ category: z.string(), value: z.unknown() })),
})

type FoundationManifest = z.infer<typeof FoundationManifestSchema>

const MANIFEST_PATH = tokensPath("src/manifest.json")
const BASELINE_PATH = tokensPath("src/foundation-baseline.json")
const EXCEPTIONS_PATH = tokensPath("src/foundation-exceptions.json")
const COMPONENTS = "src/components"

export const RULES = {
  "arbitrary-length": /\[[^[\]]*?\d+(?:\.\d+)?(?:px|rem)\b[^[\]]*?\]/g,
  "tailwind-text-size": /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/g,
  "font-weight": /\bfont-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g,
  "raw-figma-variable": /--figma-[a-z0-9-]+/g,
  "hex-color": /#[0-9a-fA-F]{3,8}\b/g,
  "palette-color":
    /\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via|divide|decoration|accent|caret)-(?:black|white|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b/g,
  "off-scale-spacing":
    /\b-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(?:\d+(?:\.\d+)?|px)\b/g,
} as const

export type RuleName = keyof typeof RULES

export type Occurrence = {
  rule: string
  file: string
  token: string
  line: number
}

function stringLiterals(file: string): {
  source: string
  literals: Array<{ value: string; start: number }>
} {
  const source = fs.readFileSync(file, "utf8")
  const parsed = parseSource(file)
  const literals: Array<{ value: string; start: number }> = []
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return
    if (Array.isArray(node)) {
      for (const child of node) visit(child)
      return
    }
    const parsedRecord = z.record(z.string(), z.unknown()).safeParse(node)
    if (!parsedRecord.success) return
    const record = parsedRecord.data
    if (typeof record.type === "string") {
      if (record.type === "Literal" && typeof record.value === "string") {
        literals.push({ value: record.value, start: Number(record.start) })
      } else if (record.type === "TemplateLiteral") {
        const quasis = Array.isArray(record.quasis) ? record.quasis : []
        for (const quasi of quasis) {
          if (!quasi || typeof quasi !== "object") continue
          const parsedQuasi = z.record(z.string(), z.unknown()).safeParse(quasi)
          if (!parsedQuasi.success) continue
          const quasiRecord = parsedQuasi.data
          const value = quasiRecord.value
          if (value && typeof value === "object") {
            const valueRecord = z.record(z.string(), z.unknown()).safeParse(value)
            if (!valueRecord.success) continue
            const cooked = valueRecord.data.cooked
            const raw = valueRecord.data.raw
            const text = typeof cooked === "string" ? cooked : raw
            if (typeof text === "string") {
              literals.push({ value: text, start: Number(quasiRecord.start) })
            }
          }
        }
      }
    }
    for (const key of Object.keys(record)) {
      if (key === "type" || key === "start" || key === "end") continue
      visit(record[key])
    }
  }
  visit(parsed.program)
  return { source, literals }
}

function lineOf(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length
}

function allowedSpacing(manifest: FoundationManifest): Set<number> {
  const values = new Set([0])
  for (const entry of Object.values(manifest.foundations)) {
    if (entry.category === "spacing" && typeof entry.value === "number") values.add(entry.value)
  }
  return values
}

function spacingValue(token: string): number | null {
  const match =
    /\b-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(\d+(?:\.\d+)?|px)\b/.exec(
      token,
    )
  if (!match) return null
  if (match[1] === "px") return 1
  return Math.round(Number(match[1]) * 4 * 100) / 100
}

export function measure(manifest: FoundationManifest): Occurrence[] {
  const spacing = allowedSpacing(manifest)
  const occurrences: Occurrence[] = []
  for (const file of walkFiles(COMPONENTS, (file) => /\.(ts|tsx)$/.test(file))) {
    const { source, literals } = stringLiterals(file)
    for (const literal of literals) {
      for (const [rule, pattern] of Object.entries(RULES)) {
        pattern.lastIndex = 0
        for (const match of literal.value.matchAll(pattern)) {
          const token = match[0]
          if (rule === "off-scale-spacing") {
            const value = spacingValue(token)
            if (value === null || spacing.has(value)) continue
          }
          occurrences.push({
            rule,
            file,
            token,
            line: lineOf(source, literal.start + (match.index ?? 0)),
          })
        }
      }
    }
  }
  return occurrences
}

function exceptionKey(exception: Pick<FoundationException, "rule" | "file" | "match">): string {
  return `${exception.rule}|${exception.file}|${exception.match}`
}

function semanticErrors(
  baseline: z.infer<typeof FoundationBaselineSchema>,
  exceptions: z.infer<typeof FoundationExceptionsSchema>,
): string[] {
  const errors: string[] = []
  const used = new Set<string>()
  for (const exception of exceptions.exceptions) {
    if (!Object.hasOwn(RULES, exception.rule)) {
      errors.push(`${EXCEPTIONS_PATH}: unknown rule "${exception.rule}"`)
      continue
    }
    const key = exceptionKey(exception)
    if (used.has(key)) errors.push(`${EXCEPTIONS_PATH}: duplicate exception ${key}`)
    used.add(key)
  }
  for (const rule of Object.keys(baseline.counts)) {
    if (!Object.hasOwn(RULES, rule)) {
      errors.push(`${BASELINE_PATH}: unknown rule "${rule}"`)
    }
  }
  for (const rule of Object.keys(RULES)) {
    if (!Object.hasOwn(baseline.counts, rule)) {
      errors.push(`${BASELINE_PATH}: missing the "${rule}" ceiling`)
    }
  }
  return errors
}

export function evaluateFoundation(
  occurrences: Occurrence[],
  baseline: z.infer<typeof FoundationBaselineSchema>,
  exceptions: z.infer<typeof FoundationExceptionsSchema>,
): { errors: string[]; counts: Record<string, number>; exceptions: number } {
  const errors = semanticErrors(baseline, exceptions)
  const used = new Set(exceptions.exceptions.map(exceptionKey))
  const counts: Record<string, number> = Object.fromEntries(
    Object.keys(RULES).map((rule) => [rule, 0]),
  )
  const recorded = new Set<string>()
  const examples: Record<string, string[]> = {}

  for (const occurrence of occurrences) {
    const key = `${occurrence.rule}|${occurrence.file}|${occurrence.token}`
    if (used.has(key)) {
      recorded.add(key)
      continue
    }
    counts[occurrence.rule] += 1
    ;(examples[occurrence.rule] ??= []).push(
      `${occurrence.file}:${occurrence.line}: ${occurrence.token}`,
    )
  }
  for (const key of used) {
    if (!recorded.has(key)) errors.push(`${EXCEPTIONS_PATH}: stale exception ${key}`)
  }
  for (const [rule, ceiling] of Object.entries(baseline.counts)) {
    if (!Object.hasOwn(RULES, rule)) continue
    const current = counts[rule] ?? 0
    if (current > ceiling) {
      errors.push(
        `${rule}: ${current} occurrences, the ceiling is ${ceiling} — use a foundation token or register an exception`,
      )
      for (const example of (examples[rule] ?? []).slice(0, 5)) errors.push(`  ${example}`)
    } else if (current < ceiling) {
      errors.push(
        `${rule}: ${current} occurrences, the ceiling is ${ceiling} — lower the ceiling to ${current}`,
      )
    }
  }
  return { errors, counts, exceptions: exceptions.exceptions.length }
}

export function runFoundation(argv: string[] = process.argv.slice(2)): number {
  enterRoot()
  const manifest = parseSchema(FoundationManifestSchema, readJson(MANIFEST_PATH), MANIFEST_PATH)
  const occurrences = measure(manifest)
  if (argv.includes("--measure")) {
    const exceptions = fs.existsSync(EXCEPTIONS_PATH)
      ? parseSchema(FoundationExceptionsSchema, readJson(EXCEPTIONS_PATH), EXCEPTIONS_PATH)
      : { schemaVersion: 1 as const, exceptions: [] }
    const used = new Set(exceptions.exceptions.map(exceptionKey))
    const counts: Record<string, number> = {}
    const raw: Record<string, number> = {}
    for (const rule of Object.keys(RULES)) {
      counts[rule] = 0
      raw[rule] = 0
    }
    for (const occurrence of occurrences) {
      raw[occurrence.rule] = (raw[occurrence.rule] ?? 0) + 1
      if (used.has(`${occurrence.rule}|${occurrence.file}|${occurrence.token}`)) continue
      counts[occurrence.rule] = (counts[occurrence.rule] ?? 0) + 1
    }
    console.log(JSON.stringify({ counts, raw }, null, 2))
    return 0
  }

  const baseline = parseSchema(FoundationBaselineSchema, readJson(BASELINE_PATH), BASELINE_PATH)
  const exceptions = parseSchema(
    FoundationExceptionsSchema,
    readJson(EXCEPTIONS_PATH),
    EXCEPTIONS_PATH,
  )
  const {
    errors,
    counts,
    exceptions: registered,
  } = evaluateFoundation(occurrences, baseline, exceptions)
  if (errors.length) {
    console.error(`foundation violations (${errors.length}):`)
    for (const error of errors) console.error(`  ${error}`)
    return 1
  }
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  console.log(`foundation OK (${total} occurrences, ${registered} registered exceptions)`)
  return 0
}
