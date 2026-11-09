// Foundation contract for library CSS and component/template sources: utility
// strings consume the token scale; declarations and inline defaults consume
// semantic/foundation references instead of duplicating visual constants.
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { readJson } from "../lib/json.ts"
import { walkFiles } from "../lib/fs.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { parseSchema } from "../lib/validate.ts"
import { createSourceModules, type SourceModules } from "../lib/source-modules.ts"
import {
  FoundationBaselineSchema,
  FoundationExceptionsSchema,
  type FoundationException,
} from "../schemas/tokens.ts"
import { cssStyleOccurrences, inlineStyleOccurrences, STYLE_RULES } from "./foundation-styles.ts"
import { report, type CheckReport } from "./report.ts"

const FoundationManifestSchema = z.looseObject({
  foundations: z.record(z.string(), z.looseObject({ category: z.string(), value: z.unknown() })),
  variables: z
    .record(
      z.string(),
      z.looseObject({
        cssName: z.string(),
        alias: z.string().optional(),
        type: z.string(),
      }),
    )
    .optional(),
})

type FoundationManifest = z.infer<typeof FoundationManifestSchema>

// Inside the tokens package; the labels name them from the workspace root.
const MANIFEST = "src/manifest.json"
const BASELINE = "src/foundation-baseline.json"
const EXCEPTIONS = "src/foundation-exceptions.json"
const MANIFEST_PATH = `packages/tokens/${MANIFEST}`
const BASELINE_PATH = `packages/tokens/${BASELINE}`
const EXCEPTIONS_PATH = `packages/tokens/${EXCEPTIONS}`
const COMPONENTS = "src/components"
// The Figma page templates live in the Storybook application, outside the
// package, and follow the same token-first rules.
const TEMPLATES = "apps/storybook/src/templates"
const ROOTS = [COMPONENTS, TEMPLATES]

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
  // Elevation comes only from the Figma shadow tokens, never from Tailwind.
  "shadow-scale": /\bshadow-(?:2xs|xs|sm|md|lg|xl|2xl)\b/g,
  // A centred scrollable list loses its start beyond the scroll origin. Both
  // alternatives stay inside one class string; `justify-center(?!-)` spares the
  // safe form.
  "center-overflow":
    /justify-center(?!-)[^"\n]*overflow-(?:x-|y-)?(?:auto|scroll)|overflow-(?:x-|y-)?(?:auto|scroll)[^"\n]*justify-center(?!-)/g,
  // Viewport variants come only from the Figma breakpoints (`tablet:`,
  // `tablet-md:`, `desktop:`, `desktop-xl:`, `desktop-xxl:`). The lookbehind
  // spares `@md/alert:` container queries and any hyphenated token such as
  // `text-sm:` or `max-w-screen-sm:`.
  "default-breakpoint": /(?<![@\w-])(?:max-)?(?:sm|md|lg|xl|2xl):/g,
  // Device typography pairs; frozen until a responsive type decision exists.
  "mobile-text-class": /\btext-[a-z0-9-]+-mobile\b/g,
  // Container sizes not backed by a Figma container token; frozen.
  "default-container-query": /@(?:3xs|2xs|xs|sm|md|lg|xl|[2-7]xl)(?:\/[a-z-]+)?:/g,
} as const

export type RuleName = keyof typeof RULES
const ALL_RULES = [...Object.keys(RULES), ...STYLE_RULES]

export type Occurrence = {
  rule: string
  file: string
  token: string
  line: number
}

function stringLiterals(
  parseSource: SourceModules["parseSource"],
  file: string,
): {
  source: string
  literals: Array<{ value: string; start: number }>
  program: ReturnType<SourceModules["parseSource"]>["program"]
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
  return { source, literals, program: parsed.program }
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

export function measure(workspace: Workspace, manifest: FoundationManifest): Occurrence[] {
  const { parseSource } = createSourceModules(workspace)
  const spacing = allowedSpacing(manifest)
  const knownTokens = new Set<string>()
  for (const entry of [
    ...Object.values(manifest.foundations),
    ...Object.values(manifest.variables ?? {}),
  ]) {
    if (typeof entry.cssName === "string") knownTokens.add(`--${entry.cssName}`)
    if (typeof entry.alias === "string") {
      for (const suffix of ["", "--line-height", "--font-weight", "--letter-spacing"]) {
        knownTokens.add(`--text-${entry.alias}${suffix}`)
      }
    }
  }
  const occurrences: Occurrence[] = []
  for (const file of walkFiles(workspace.path("src"), (file) => /\.css$/.test(file))) {
    const identity = path.posix.join(
      "src",
      path.relative(workspace.path("src"), file).split(path.sep).join("/"),
    )
    occurrences.push(...cssStyleOccurrences(fs.readFileSync(file, "utf8"), identity, knownTokens))
  }
  for (const root of ROOTS) {
    const absolute = workspace.path(root)
    for (const file of walkFiles(absolute, (file) => /\.(ts|tsx)$/.test(file))) {
      const identity = path.posix.join(
        root,
        path.relative(absolute, file).split(path.sep).join("/"),
      )
      const { source, literals, program } = stringLiterals(parseSource, file)
      occurrences.push(...inlineStyleOccurrences(program, source, identity, knownTokens))
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
              file: identity,
              token,
              line: lineOf(source, literal.start + (match.index ?? 0)),
            })
          }
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
    if (!ALL_RULES.includes(exception.rule)) {
      errors.push(`${EXCEPTIONS_PATH}: unknown rule "${exception.rule}"`)
      continue
    }
    const key = exceptionKey(exception)
    if (used.has(key)) errors.push(`${EXCEPTIONS_PATH}: duplicate exception ${key}`)
    used.add(key)
  }
  for (const rule of Object.keys(baseline.counts)) {
    if (!ALL_RULES.includes(rule)) {
      errors.push(`${BASELINE_PATH}: unknown rule "${rule}"`)
    }
  }
  for (const rule of Object.keys(RULES)) {
    if (!Object.hasOwn(baseline.counts, rule)) {
      errors.push(`${BASELINE_PATH}: missing the "${rule}" ceiling`)
    }
  }
  for (const rule of STYLE_RULES) {
    if ((baseline.counts[rule] ?? 0) !== 0) {
      errors.push(`${BASELINE_PATH}: the "${rule}" ceiling must be zero`)
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
  const counts: Record<string, number> = Object.fromEntries(ALL_RULES.map((rule) => [rule, 0]))
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
  // New declaration checks start at zero without rewriting the historical
  // utility baseline. Only a scoped, reasoned exception can waive a value.
  for (const [rule, ceiling] of Object.entries({
    ...baseline.counts,
    ...Object.fromEntries(STYLE_RULES.map((rule) => [rule, 0])),
  })) {
    if (!ALL_RULES.includes(rule)) continue
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

function readManifest(workspace: Workspace): FoundationManifest {
  return parseSchema(
    FoundationManifestSchema,
    readJson(path.join(workspace.tokensRoot, MANIFEST)),
    MANIFEST_PATH,
  )
}

function readExceptions(workspace: Workspace): z.infer<typeof FoundationExceptionsSchema> {
  const file = path.join(workspace.tokensRoot, EXCEPTIONS)
  if (!fs.existsSync(file)) return { schemaVersion: 1, exceptions: [] }
  return parseSchema(FoundationExceptionsSchema, readJson(file), EXCEPTIONS_PATH)
}

// The current counts per rule: `counts` net of the registered exceptions,
// `raw` before them.
export function measureFoundation(workspace: Workspace): {
  counts: Record<string, number>
  raw: Record<string, number>
} {
  const occurrences = measure(workspace, readManifest(workspace))
  const used = new Set(readExceptions(workspace).exceptions.map(exceptionKey))
  const counts: Record<string, number> = Object.fromEntries(ALL_RULES.map((rule) => [rule, 0]))
  const raw: Record<string, number> = Object.fromEntries(ALL_RULES.map((rule) => [rule, 0]))
  for (const occurrence of occurrences) {
    raw[occurrence.rule] = (raw[occurrence.rule] ?? 0) + 1
    if (used.has(`${occurrence.rule}|${occurrence.file}|${occurrence.token}`)) continue
    counts[occurrence.rule] = (counts[occurrence.rule] ?? 0) + 1
  }
  return { counts, raw }
}

export function checkFoundation(workspace: Workspace): CheckReport {
  const occurrences = measure(workspace, readManifest(workspace))
  const baseline = parseSchema(
    FoundationBaselineSchema,
    readJson(path.join(workspace.tokensRoot, BASELINE)),
    BASELINE_PATH,
  )
  const { errors, counts, exceptions } = evaluateFoundation(
    occurrences,
    baseline,
    readExceptions(workspace),
  )
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  return report("foundation", `${total} occurrences, ${exceptions} registered exceptions`, errors)
}
