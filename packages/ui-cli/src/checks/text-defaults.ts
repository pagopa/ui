#!/usr/bin/env node
// Literal text defaults contract: every user-facing default lives in the
// message dictionary of the UI provider, so a literal in a component
// destructuring is a regression. Run: `ui-cli check text-defaults`.
//
// The scan is syntax-aware and covers three positions a default hides in: the
// destructuring default, the object literal a prop default carries
// (`emptyState = { title: "…" }`), and the JSX attribute that paints or
// announces copy (`aria-label={…}`, `placeholder={…}`). A literal anywhere
// inside one of those expressions is copy, never a `className`.
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
  "pointer",
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

// Positions whose value is copy: a JSX attribute the user reads or hears, and
// an object-literal key a default carries. A prop named here is copy wherever
// it appears, which is why the names are the rendered ones (`aria-label`,
// `removeLabel`) and not the internal props (`className`, `variant`).
export const TEXT_POSITIONS = new Set([
  "alt",
  "aria-description",
  "aria-label",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "caption",
  "description",
  "heading",
  "label",
  "message",
  "placeholder",
  "removeLabel",
  "summary",
  "title",
])

// Operators a literal never counts as copy behind: `typeof children ===
// "string"` guards a type, it does not write a sentence.
const COMPARISONS = new Set(["==", "===", "!=", "!==", "<", ">", "<=", ">="])

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

// The static text a template renders, its substitutions removed: a `${count}
// elementi` writes "elementi", a `${percentage}%` writes punctuation only.
function staticText(node: Node): string {
  const parts: string[] = []
  for (const quasi of children(node.quasis)) {
    if (!isNode(quasi)) continue
    const value = Reflect.get(quasi, "value")
    if (typeof value !== "object" || value === null) continue
    const raw = Reflect.get(value, "cooked") ?? Reflect.get(value, "raw")
    parts.push(typeof raw === "string" ? raw : "")
  }
  return parts.join("")
}

// Any copy a text expression renders, wherever it hides: a bare literal, a
// template literal, the `??` fallback, a ternary branch. The walk stops at a
// comparison, whose strings are types rather than sentences.
function textLiteral(node: Node, source: string): string | undefined {
  if (node.type === "Literal" && typeof node.value === "string") {
    return letters(node.value) >= 2 ? source.slice(node.start, node.end) : undefined
  }
  if (node.type === "TemplateLiteral") {
    return letters(staticText(node)) >= 2 ? source.slice(node.start, node.end) : undefined
  }
  if (node.type === "BinaryExpression" && COMPARISONS.has(String(node.operator))) return undefined
  for (const [key, value] of Object.entries(node)) {
    // A key is a name, not a sentence: `props["aria-label"]` reads a prop and
    // `{ "aria-label": … }` names one.
    if (key === "property" && node.type === "MemberExpression" && node.computed === true) continue
    if (key === "key" && node.type === "ObjectExpression") continue
    for (const item of Array.isArray(value) ? value : [value]) {
      if (!isNode(item)) continue
      const text = textLiteral(item, source)
      if (text !== undefined) return text
    }
  }
  return undefined
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

  function record(line: number, name: string, value: string): void {
    const identity = `${line}:${name}`
    if (seen.has(identity)) return
    seen.add(identity)
    hits.push({ file, line, name, value })
  }

  // A JSX attribute that paints or announces copy: `aria-label={…}`,
  // `placeholder={…}`, `title=[…]`. The literal can sit anywhere inside the
  // expression the braces hold.
  function attribute(node: Node): void {
    const name = child(node, "name")
    if (!name || name.type !== "JSXIdentifier" || typeof name.name !== "string") return
    if (!TEXT_POSITIONS.has(name.name)) return
    const value = child(node, "value")
    if (!value) return
    const expression = value.type === "JSXExpressionContainer" ? child(value, "expression") : value
    if (!expression) return
    const text = textLiteral(expression, source)
    if (text === undefined) return
    record(lineOf(source, node.start), name.name, text)
  }

  // The object literal a prop default carries: `emptyState = { title: "…" }`
  // reads as copy through the keys of TEXT_POSITIONS, which is why the hit
  // names both halves (`emptyState.title`).
  function objectDefault(node: Node, prop: string): boolean {
    for (const property of children(node.properties)) {
      if (!isNode(property) || property.type !== "Property" || property.computed === true) continue
      const key = child(property, "key")
      const keyName = key ? propertyName(key) : undefined
      if (!keyName || !TEXT_POSITIONS.has(keyName)) continue
      const value = child(property, "value")
      if (!value) continue
      const text = textLiteral(value, source)
      if (text === undefined) continue
      record(lineOf(source, node.start), `${prop}.${keyName}`, text)
      return true
    }
    return false
  }

  function visit(node: Node): void {
    if (node.type === "JSXAttribute") attribute(node)
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
        if (right.type === "ObjectExpression") {
          objectDefault(right, name)
          continue
        }
        if (NON_TEXT_PROPS.has(name)) continue
        const text = textValue(right, source)
        if (text === undefined || letters(text) < 2) continue
        record(lineOf(source, item.start), name, text)
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
