#!/usr/bin/env node
// Client-boundary contract: the package ships one module per source file, so a
// Server Component may import any module that stays server-safe, and every
// module that runs in the browser must declare its own "use client".
//
// A module is a client module only on a direct trigger of its own source: a
// React hook call, a context, an event handler prop written in JSX, a browser
// global or an interactive runtime. Rendering a client component is not a
// trigger, and a file made only of imports and re-exports is never client.
//
// Run: `ui-cli check client-directives` (`--report` prints both lists and
// exits 0).
import fs from "node:fs"
import { parseSync } from "oxc-parser"

import { walkFiles } from "../lib/fs.ts"
import { enterRoot } from "../lib/paths.ts"

const SOURCE = "src"

export type Trigger =
  | "hook"
  | "createContext"
  | "event handler"
  | "browser global"
  | "client dependency"

const TRIGGERS: ReadonlyArray<readonly [Trigger, RegExp]> = [
  ["hook", /use[A-Z]\w*\(/],
  ["createContext", /createContext/],
  ["event handler", /on[A-Z]\w*=/],
  ["browser global", /window\.|document\./],
  ["client dependency", /from\s+["'](?:@base-ui\/react|react-day-picker)(?:\/[^"']*)?["']/],
]

const DIRECTIVE = /^\s*["']use client["']\s*;?\s*$/

export type Classification = {
  file: string
  triggers: Trigger[]
  directive: boolean
  client: boolean
}

// Source text without comments, so a trigger quoted in a comment or in a JSDoc
// example does not classify the module.
function codeOnly(source: string, comments: ReadonlyArray<{ start: number; end: number }>): string {
  const characters = [...source]
  for (const comment of comments) {
    for (let index = comment.start; index < comment.end; index += 1) {
      if (characters[index] !== "\n") characters[index] = " "
    }
  }
  return characters.join("")
}

// A statement that neither imports nor re-exports.
function isDeclaration(statement: {
  type: string
  declaration?: unknown
  source?: unknown
}): boolean {
  if (statement.type === "ImportDeclaration") return false
  if (statement.type === "ExportAllDeclaration") return false
  if (statement.type === "ExportNamedDeclaration") {
    return Boolean(statement.declaration) || !statement.source
  }
  if (statement.type === "EmptyStatement") return false
  return true
}

export function classify(file: string): Classification {
  const source = fs.readFileSync(file, "utf8")
  const parsed = parseSync(file, source)
  if (parsed.errors.length) {
    throw new Error(`${file}: ${parsed.errors.map((error) => error.message).join("; ")}`)
  }
  const code = codeOnly(source, parsed.comments)
  const triggers = TRIGGERS.filter(([, pattern]) => pattern.test(code)).map(([name]) => name)
  const barrel = parsed.program.body.every((statement) => !isDeclaration(statement))
  return {
    file,
    triggers,
    directive: DIRECTIVE.test(source.split("\n")[0] ?? ""),
    client: triggers.length > 0 && !barrel,
  }
}

export function sourceFiles(): string[] {
  return walkFiles(
    SOURCE,
    (file) =>
      /\.(ts|tsx)$/.test(file) &&
      !/\.(unit\.)?test\.tsx?$/.test(file) &&
      !/\.stories\.tsx?$/.test(file),
  )
}

export function classifications(): Classification[] {
  return sourceFiles().map(classify)
}

// The source modules the packed artifact must publish with the directive.
export function clientModules(): Classification[] {
  return classifications().filter((entry) => entry.client)
}

export function runClientDirectives(argv: string[]): number {
  enterRoot()
  const report = argv.includes("--report")
  const all = classifications()
  const missing = all.filter((entry) => entry.client && !entry.directive)
  const unneeded = all.filter((entry) => !entry.client && entry.directive)

  for (const entry of missing) console.log(`missing: ${entry.file} (${entry.triggers.join(", ")})`)
  for (const entry of unneeded) console.log(`unneeded: ${entry.file}`)
  const summary = `${all.filter((entry) => entry.client).length} client module(s), ${missing.length} missing, ${unneeded.length} unneeded`
  if (report) {
    console.log(`client-directives: ${summary}`)
    return 0
  }
  if (unneeded.length)
    console.error(`client-directives: warning: ${unneeded.length} unneeded directive(s)`)
  if (missing.length) {
    console.error(`client-directives: ${missing.length} client module(s) without "use client"`)
    return 1
  }
  console.log(`client-directives: ${summary} — OK`)
  return 0
}
