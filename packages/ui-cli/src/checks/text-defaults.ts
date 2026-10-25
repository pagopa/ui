#!/usr/bin/env node
// Literal text defaults contract: every user-facing default lives in the
// message dictionary of the UI provider, so a literal in a component
// destructuring is a regression. Run: `ui-cli check text-defaults`.
//
// The scan is syntax-aware: only a destructuring default counts, never a JSX
// attribute such as `className=`, which a line regex would also match.
import fs from "node:fs"
import { parseSync } from "oxc-parser"

import { walkFiles } from "../lib/fs.ts"
import { enterRoot } from "../lib/paths.ts"

const COMPONENTS = "src/components"

// Props whose default is a token, a variant or an identifier, never copy. A
// name joins this set only when it is never user-facing text anywhere.
export const NON_TEXT_PROPS = new Set([
  "accept",
  "align",
  "appearance",
  "arrowPosition",
  "as",
  "autoComplete",
  "background",
  "className",
  "color",
  "dataSlot",
  "density",
  "device",
  "direction",
  "display",
  "emphasis",
  "footerPlacement",
  "format",
  "homeHref",
  "href",
  "hierarchy",
  "icon",
  "id",
  "imageFit",
  "indicatorPlacement",
  "inputMode",
  "intent",
  "kind",
  "layout",
  "leadingAlignment",
  "level",
  "locale",
  "mode",
  "name",
  "navLayout",
  "orientation",
  "placement",
  "position",
  "ratio",
  "role",
  "shape",
  "side",
  "size",
  "state",
  "status",
  "surface",
  "targetId",
  "theme",
  "tone",
  "type",
  "variant",
])

export type TextDefault = {
  file: string
  line: number
  name: string
  value: string
}

type Node = { type: string; start: number; end: number; [key: string]: unknown }

function isNode(value: unknown): value is Node {
  if (typeof value !== "object" || value === null) return false
  return (
    typeof Reflect.get(value, "type") === "string" &&
    typeof Reflect.get(value, "start") === "number" &&
    typeof Reflect.get(value, "end") === "number"
  )
}

function child(node: Node, key: string): Node | undefined {
  const value = node[key]
  return isNode(value) ? value : undefined
}

function children(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

// The prop of a destructured property: an identifier, or a quoted key such as
// `"aria-label"`, whose dictionary name is its camelCase form.
function propertyName(key: Node): string | undefined {
  if (key.type === "Identifier" && typeof key.name === "string") return key.name
  if (key.type === "Literal" && typeof key.value === "string") {
    const [first, ...rest] = key.value.split(/[-\s]+/).filter(Boolean)
    return first + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("")
  }
  return undefined
}

function letters(value: string): number {
  return (value.match(/[A-Za-z]/g) ?? []).length
}

// The literal source text of a default, or undefined when the default is not
// text-shaped: an identifier, a boolean, a call or an object. A conditional
// counts through its branches: a literal hidden behind a ternary (valid /
// not-valid label forks) is a literal default just the same.
function textValue(node: Node, source: string): string | undefined {
  if (node.type === "Literal" && typeof node.value === "string") {
    return source.slice(node.start, node.end)
  }
  if (node.type === "TemplateLiteral") return source.slice(node.start, node.end)
  if (node.type === "ConditionalExpression") {
    for (const key of ["consequent", "alternate"]) {
      const branch = child(node, key)
      if (branch) {
        const text = textValue(branch, source)
        if (text !== undefined) return text
      }
    }
    return undefined
  }
  if (node.type === "ArrowFunctionExpression") {
    const body = child(node, "body")
    return body ? textValue(body, source) : undefined
  }
  return undefined
}

function lineOf(source: string, position: number): number {
  return source.slice(0, position).split("\n").length
}

const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
])

// The destructuring patterns of a node: the parameters of a function and the
// `const { … } = props` form some components use.
function patterns(node: Node): Node[] {
  const objectPatterns: Node[] = []
  if (node.type === "VariableDeclarator") {
    const id = child(node, "id")
    if (id?.type === "ObjectPattern") objectPatterns.push(id)
  }
  if (FUNCTION_TYPES.has(node.type)) {
    for (const param of children(node.params)) {
      if (isNode(param) && param.type === "ObjectPattern") objectPatterns.push(param)
    }
  }
  return objectPatterns
}

function scan(root: unknown, file: string, source: string): TextDefault[] {
  const hits: TextDefault[] = []
  const seen = new Set<string>()

  function visit(node: Node): void {
    for (const pattern of patterns(node)) {
      for (const item of children(pattern.properties)) {
        if (!isNode(item) || item.type !== "Property" || item.computed === true) continue
        const key = child(item, "key")
        if (!key) continue
        const name = propertyName(key)
        if (!name) continue
        const value = child(item, "value")
        if (!value || value.type !== "AssignmentPattern") continue
        const right = child(value, "right")
        if (!right) continue
        if (NON_TEXT_PROPS.has(name)) continue
        const text = textValue(right, source)
        if (text === undefined || letters(text) < 2) continue
        const line = lineOf(source, item.start)
        const identity = `${line}:${name}`
        if (seen.has(identity)) continue
        seen.add(identity)
        hits.push({ file, line, name, value: text })
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) if (isNode(item)) visit(item)
      } else if (isNode(value)) {
        visit(value)
      }
    }
  }

  if (isNode(root)) visit(root)
  return hits
}

export function textDefaults(): TextDefault[] {
  const files = walkFiles(
    COMPONENTS,
    (file) =>
      file.endsWith(".tsx") && !file.includes("/templates/") && !/\.(unit\.)?test\.tsx$/.test(file),
  )
  const hits: TextDefault[] = []
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8")
    const parsed = parseSync(file, source)
    if (parsed.errors.length) {
      throw new Error(`${file}: ${parsed.errors.map((error) => error.message).join("; ")}`)
    }
    hits.push(...scan(parsed.program, file, source))
  }
  return hits.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line)
}

export function runTextDefaults(argv: string[]): number {
  enterRoot()
  const maxIndex = argv.indexOf("--max")
  const max = maxIndex >= 0 ? Number(argv[maxIndex + 1]) : undefined
  if (maxIndex >= 0 && (max === undefined || !Number.isInteger(max) || max < 0)) {
    console.error("text-defaults: --max needs a non-negative integer")
    return 2
  }
  const hits = textDefaults()
  for (const hit of hits) console.log(`${hit.file}:${hit.line} ${hit.name}`)
  if (max === undefined) {
    const files = new Set(hits.map((hit) => hit.file)).size
    console.log(`text defaults: ${hits.length} literal default(s) in ${files} file(s)`)
    return 0
  }
  if (hits.length > max) {
    console.error(`text-defaults: ${hits.length} literal default(s), the ceiling is ${max}`)
    return 1
  }
  console.log(`text-defaults: ${hits.length} literal default(s), the ceiling is ${max} — OK`)
  return 0
}
