// Utility-prefix contract: the published stylesheet declares each Tailwind
// utility once, under `pui:`, so every class the library or its stories name in
// a class position is spelled with the prefix. A bare spelling renders nothing —
// the artifact has no rule for it — and collides with the host's own utilities.
//
// The oracle is the stylesheet itself: a token is a utility only when compiling
// the library's entry gives it a rule, so a marker (`compact`), a group name
// (`group/alert`) and a hand-written class the entry ships are not flagged.
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"
import { parseSync } from "oxc-parser"

import type { Workspace } from "../adapters/workspace.ts"
import { walkFiles } from "../lib/fs.ts"
import { report, type CheckReport } from "./report.ts"

export const PREFIX = "pui:"

/** Package-relative, then workspace-relative: the library and the stories. */
const SOURCES = ["src", "apps/storybook/src", "apps/storybook/.storybook"]
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/
const CLASS_ATTRIBUTES = new Set(["className", "class"])
const CLASS_CALLS = new Set(["cn", "clsx", "twMerge", "cva"])

interface AstNode {
  readonly type: string
  readonly start: number
  readonly [key: string]: unknown
}

export interface ClassToken {
  readonly text: string
  readonly line: number
}

function isNode(value: unknown): value is AstNode {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  return "type" in value && typeof value.type === "string"
}

function asNode(value: unknown): AstNode | undefined {
  return isNode(value) ? value : undefined
}

function asNodes(value: unknown): AstNode[] {
  const list = Array.isArray(value) ? value : [value]
  return list.flatMap((item) => asNode(item) ?? [])
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

/** A 1-based line for a byte offset in the source. */
function lineOf(source: string) {
  const starts = [0]
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") starts.push(index + 1)
  }
  return (offset: number) => {
    let low = 0
    let high = starts.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (starts[middle] <= offset) low = middle
      else high = middle - 1
    }
    return low + 1
  }
}

// A class list, not a sentence: the walk below decides where a class position
// is, and this drops what a template hole or a stray quote leaves behind.
function isClassToken(token: string): boolean {
  return /[\w[\]*:/.!-]/.test(token) && !/[{}"'`$\\]/.test(token)
}

/**
 * The `const` initializers a class position may name, keyed by name. Only a
 * name declared once in the file resolves: a shadowed one would be a guess.
 */
function declarationsOf(root: unknown): Map<string, unknown> {
  const found = new Map<string, unknown>()
  const ambiguous = new Set<string>()
  const walk = (current: AstNode) => {
    if (current.type === "VariableDeclarator") {
      const name = asNode(current.id)?.name
      if (typeof name === "string") {
        if (found.has(name) || ambiguous.has(name)) {
          found.delete(name)
          ambiguous.add(name)
        } else {
          found.set(name, current.init)
        }
      }
    }
    for (const [key, value] of Object.entries(current)) {
      if (key === "parent") continue
      for (const child of asNodes(value)) walk(child)
    }
  }
  const program = asNode(root)
  if (program) walk(program)
  return found
}

/**
 * The class tokens a source file names in a class position: a `className`
 * attribute, the arguments of a class-name call, and the `const` those reach.
 */
export function classTokens(file: string, source: string): ClassToken[] {
  const parsed = parseSync(file, source)
  if (parsed.errors.length) {
    throw new Error(parsed.errors.map((error) => error.message).join("; "))
  }
  const declarations = declarationsOf(parsed.program)
  const line = lineOf(source)
  const found: ClassToken[] = []

  const emit = (value: string, offset: number) => {
    for (const token of value.split(/\s+/)) {
      if (isClassToken(token)) found.push({ text: token, line: line(offset) })
    }
  }

  // Everything a class position can hold: a literal, a template, a conditional
  // or logical list, an array, a class-name call, and the `const` it names.
  const classList = (value: unknown, reached: Set<string>): void => {
    const current = asNode(value)
    if (!current) {
      for (const child of asNodes(value)) classList(child, reached)
      return
    }
    switch (current.type) {
      case "Literal":
        if (typeof current.value === "string") emit(current.value, current.start)
        return
      case "TemplateLiteral":
        for (const quasi of asNodes(current.quasis)) {
          const cooked = asNode(quasi.value)
          const raw = text(cooked?.raw) ?? text(cooked?.cooked)
          if (raw) emit(raw, quasi.start)
        }
        return
      case "ConditionalExpression":
        classList(current.consequent, reached)
        classList(current.alternate, reached)
        return
      case "LogicalExpression":
      case "BinaryExpression":
        classList(current.left, reached)
        classList(current.right, reached)
        return
      case "ArrayExpression":
        classList(current.elements, reached)
        return
      case "CallExpression":
        classList(current.arguments, reached)
        return
      case "JSXExpressionContainer":
      case "ParenthesizedExpression":
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "TSNonNullExpression":
        classList(current.expression, reached)
        return
      case "Identifier": {
        const name = text(current.name)
        const initializer = name ? declarations.get(name) : undefined
        if (!name || initializer === undefined || reached.has(name)) return
        reached.add(name)
        classList(initializer, reached)
        reached.delete(name)
        return
      }
      default:
        return
    }
  }

  const walk = (current: AstNode) => {
    if (current.type === "JSXAttribute") {
      const attribute = text(asNode(current.name)?.name)
      if (attribute && CLASS_ATTRIBUTES.has(attribute)) classList(current.value, new Set())
    }
    if (current.type === "CallExpression") {
      const call = text(asNode(current.callee)?.name)
      if (call && CLASS_CALLS.has(call)) {
        for (const argument of asNodes(current.arguments)) classList(argument, new Set())
      }
    }
    for (const [key, value] of Object.entries(current)) {
      if (key === "parent") continue
      for (const child of asNodes(value)) walk(child)
    }
  }
  const program = asNode(parsed.program)
  if (program) walk(program)
  return found
}

type CompiledSheet = { build(candidates: string[]): string }
type Compile = (
  css: string,
  options: { base: string; onDependency: (file: string) => void },
) => Promise<CompiledSheet>

function asUrl(base: string, entry: string): string {
  const url = path.relative(base, entry).split(path.sep).join("/")
  return url.startsWith(".") ? url : `./${url}`
}

type Sheet = CompiledSheet

async function compileEntry(entry: string): Promise<Sheet> {
  const require = createRequire(path.join(path.dirname(entry), "entry.css"))
  const resolved = require.resolve("@tailwindcss/node")
  const loaded: { compile?: Compile; default?: { compile?: Compile } } = await import(
    pathToFileURL(resolved).href
  )
  const compile = loaded.compile ?? loaded.default?.compile
  if (!compile) throw new Error(`${resolved}: no compile export`)
  const base = path.dirname(entry)
  return compile(`@import "${asUrl(base, entry)}";`, { base, onDependency: () => undefined })
}

/**
 * Whether naming the candidate gives the sheet a rule it lacked. The classes
 * the entry ships by hand are already there, so an empty build is the floor,
 * and a candidate Tailwind does not know leaves the sheet untouched.
 */
function adds(sheet: Sheet, candidate: string): boolean {
  const before = new Set(sheet.build([]).split("\n"))
  return sheet
    .build([candidate])
    .split("\n")
    .some((line) => !before.has(line) && line.trim() !== "")
}

/**
 * The candidates that are utilities of the library's own stylesheet. The
 * compiler is resolved from the package the entry belongs to, so the gate reads
 * the theme the library ships rather than a default one.
 */
async function utilitiesOf(entry: string, candidates: readonly string[]): Promise<Set<string>> {
  const sheet = await compileEntry(entry)
  const utilities = new Set<string>()
  const inert: string[] = []
  for (const candidate of candidates) {
    if (adds(sheet, candidate)) utilities.add(candidate)
    else inert.push(candidate)
  }
  // A build is incremental: a rule an earlier candidate warmed could make this
  // one look inert, so each candidate the sheet did not answer for is asked
  // again of a sheet that has built nothing else.
  for (const candidate of inert) {
    if (adds(await compileEntry(entry), candidate)) utilities.add(candidate)
  }
  return utilities
}

export interface UtilityPrefixOptions {
  /** The stylesheet the utilities come from: the package's published entry. */
  readonly entry?: string
  /** The trees scanned, as identities: package-relative, then workspace-relative. */
  readonly sources?: readonly string[]
}

export async function checkUtilityPrefix(
  workspace: Workspace,
  options: UtilityPrefixOptions = {},
): Promise<CheckReport> {
  const entry = options.entry ?? path.join(workspace.root, "src/library.css")
  const files = (options.sources ?? SOURCES)
    .map((source) => workspace.path(source))
    .flatMap((directory) => walkFiles(directory, (file) => SOURCE_FILE.test(file)))

  const positions = new Map<string, string[]>()
  for (const file of files) {
    const identity = workspace.identity(file)
    let found: ClassToken[]
    try {
      found = classTokens(file, fs.readFileSync(file, "utf8"))
    } catch (error) {
      return report("utility prefix", `${files.length} file(s)`, [
        `${identity}: ${error instanceof Error ? error.message : String(error)}`,
      ])
    }
    for (const token of found) {
      if (token.text.startsWith(PREFIX)) continue
      const where = `${identity}:${token.line}`
      const lines = positions.get(token.text) ?? []
      if (!lines.includes(where)) lines.push(where)
      positions.set(token.text, lines)
    }
  }

  const bare = [...positions.keys()].sort()
  const summary = `${files.length} file(s), ${bare.length} class token(s) without the prefix`
  if (!bare.length) return report("utility prefix", summary)
  if (!fs.existsSync(entry)) {
    return report("utility prefix", summary, [
      `${entry}: the stylesheet the utilities are compiled from is missing`,
    ])
  }

  const utilities = await utilitiesOf(entry, bare)
  const problems = bare
    .filter((token) => utilities.has(token))
    .flatMap((token) =>
      [...(positions.get(token) ?? [])]
        .sort()
        .map((where) => `${where}: unprefixed utility "${token}" (write "${PREFIX}${token}")`),
    )
  return report("utility prefix", summary, problems.sort())
}
