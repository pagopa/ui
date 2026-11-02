import { Visitor, type Node } from "oxc-parser"

import type { Occurrence } from "./foundation.ts"

export const STYLE_RULES = ["visual-constant", "unknown-foundation"] as const

type Declaration = { property: string; value: string; start: number; context: string }

const COLOUR_KEYWORDS = new Set([
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
  "none",
  "transparent",
  "currentcolor",
  "accentcolor",
  "accentcolortext",
  "activetext",
  "buttonborder",
  "buttonface",
  "buttontext",
  "canvas",
  "canvastext",
  "field",
  "fieldtext",
  "graytext",
  "highlight",
  "highlighttext",
  "linktext",
  "mark",
  "marktext",
  "selecteditem",
  "selecteditemtext",
  "visitedtext",
])

// Exact pre-existing local extensions, not a licence for new values. Retire
// source geometry when its published token exists; retire colour/effect locals
// when the design owner resolves ADR-0001 §9 and the foundation design request.
const LOCAL_VALUES: Record<string, string> = {
  "--destructive-hover": "#aa2828",
  "--primary-active": "#072582",
  "--navy": "#061b49",
  "--navy-deep": "#17213c",
  "--brand-cyan": "#00a7e1",
  "--avatar-frame": "rgb(14 15 19 / 6%)",
  "--avatar-icon-surface": "rgb(255 255 255 / 20%)",
  "--artboard-height": "650px",
  "--artboard-height-tall": "800px",
  "--dialog-width": "600px",
  "--dialog-width-compact": "272px",
  "--login-width": "520px",
  "--state-width": "368px",
  "--drawer-width": "416px",
  "--drawer-width-wide": "417px",
  "--id-module-width": "410px",
  "--camera-size": "376px",
  "--menu-width": "274px",
  "--menu-skeleton-width": "106px",
  "--overlay-width": "512px",
  "--header-height": "102px",
  "--preheader-height": "55px",
  // These are root-font-relative layout values; the spacing foundations are
  // px, so aliasing them would change zoom/host-font scaling.
  "--page-gutter": "2rem",
  "--page-gutter-lg": "3rem",
  "--grid-aside": "20rem",
  "--grid-fields": "10rem",
  "--grid-actions": "3rem",
  // Container query conditions cannot resolve var(); keep the recorded 900px
  // device step until Tailwind can lower a foundation reference to a literal.
  "--container-tablet-md": "56.25rem",
  // Decimal alpha here is not byte-identical to the published hex alpha.
  "--shadow-switch-knob":
    "0 1px 3px rgba(0, 43, 85, 0.1), 0 1px 1px rgba(0, 43, 85, 0.05), 0 2px 1px -1px rgba(0, 43, 85, 0.1)",
  // SVG filters need the existing effect representation, not box-shadow.
  "--drop-shadow-elevation-6":
    "0 1px 18px #002b551a, 0 6px 10px #002b550d, 0 3px 5px -1px #002b551a",
  "--font-sans": '"Titillio", Arial, sans-serif',
}

const normalize = (value: string): string =>
  value.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim()

// Comments/strings and function arguments can contain CSS delimiters. Keep
// their offsets while splitting only declarations, including nested rules.
export function cssDeclarations(source: string): Declaration[] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
  const declarations: Declaration[] = []
  const contexts: string[] = []
  let start = 0
  let depth = 0
  let quote = ""
  const declaration = (end: number): void => {
    const segment = text.slice(start, end)
    const match = /^\s*(--[\w-]+|[a-z][a-z-]*)\s*:\s*([\s\S]+?)\s*$/i.exec(segment)
    if (match) {
      declarations.push({
        property: match[1],
        value: match[2],
        start: start + segment.indexOf(match[1]),
        context: contexts.join(" "),
      })
    }
  }
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quote) {
      if (char === "\\") index += 1
      else if (char === quote) quote = ""
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === "(" || char === "[") depth += 1
    else if (char === ")" || char === "]") depth -= 1
    else if (!depth && char === "{") {
      contexts.push(normalize(text.slice(start, index)))
      start = index + 1
    } else if (!depth && (char === ";" || char === "}")) {
      declaration(index)
      if (char === "}") contexts.pop()
      start = index + 1
    }
  }
  return declarations
}

function visualConstant(property: string, value: string | number): boolean {
  if (typeof value === "number") {
    if (value === 0) return false
    if (property === "opacity") return value !== 1
    return /^(?:width|height|minWidth|maxWidth|minHeight|maxHeight|top|left|right|bottom|padding.*|margin.*|gap|rowGap|columnGap|border.*Width|borderRadius|fontSize|fontWeight|lineHeight|letterSpacing|zIndex)$/.test(
      property,
    )
  }
  if (property === "content") return false
  // References do not hide literal fallbacks, calc() lengths or gradient
  // colours. Percentages and viewport geometry remain caller/data-friendly.
  const remainder = value.replace(/var\(\s*--[\w-]+\s*\)/g, "")
  if (property === "opacity" && /^-?[\d.]+$/.test(remainder)) {
    return ![0, 1].includes(Number(remainder))
  }
  if (/duration|delay/i.test(property)) return /[1-9][\d.]*m?s\b/i.test(remainder)
  if (/(?:^|[^\w-])-?(?:\d*\.)?\d+(?:px|rem|em|pt)\b/i.test(remainder)) {
    return /(?:^|[^\w-])-?(?!0(?:\.0+)?(?:px|rem|em|pt)\b)(?:\d*\.)?\d+(?:px|rem|em|pt)\b/i.test(
      remainder,
    )
  }
  if (/#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/i.test(remainder)) {
    return true
  }
  if (/font-?family/i.test(property)) return Boolean(remainder.trim())
  if (/^(?:font-?weight|font-?size|line-?height|letter-?spacing|z-?index)$/.test(property)) {
    return /[1-9]/.test(remainder)
  }
  if (
    /(?:^|-)color$|Color$|^--color-|^(?:fill|stroke|background)$|^--(?:primary|secondary|accent|brand)/i.test(
      property,
    )
  ) {
    if (/^[a-z-]+$/i.test(remainder.trim())) {
      return !COLOUR_KEYWORDS.has(remainder.trim().toLowerCase())
    }
    for (const fallback of remainder.matchAll(/var\(\s*--[\w-]+\s*,\s*([a-z][\w-]*)\s*\)/gi)) {
      if (!COLOUR_KEYWORDS.has(fallback[1].toLowerCase())) return true
    }
    return /\b(?:black|white|red|blue|green|yellow|orange|purple|pink|gray|grey|navy|teal|transparent)\b/i.test(
      remainder.replace(/\btransparent\b/gi, ""),
    )
  }
  return false
}

function occurrence(
  rule: string,
  file: string,
  source: string,
  start: number,
  token: string,
): Occurrence {
  return { rule, file, token, line: source.slice(0, start).split("\n").length }
}

function checkValue(
  declaration: Declaration,
  file: string,
  source: string,
  knownTokens: Set<string>,
  css: boolean,
): Occurrence[] {
  const { property, value, start, context } = declaration
  const occurrences: Occurrence[] = []
  for (const match of value.matchAll(/var\(\s*(--(?:figma|text)-[\w-]+)/g)) {
    if (!knownTokens.has(match[1])) {
      occurrences.push(occurrence("unknown-foundation", file, source, start, match[1]))
    }
  }
  if (css && /@font-face\b/.test(context)) return occurrences
  const clean = normalize(value.replace(/\s*!important\s*$/, ""))
  // Inline hex literals already belong to the utility scanner's hex rule and
  // its registered exceptions. Do not charge the same literal twice.
  if (!css && /^#[\da-f]{3,8}$/i.test(clean)) return occurrences
  if (css && file === "src/index.css") {
    const themeContext = /^(?:--shadow-|--drop-shadow-|--font-|--container-)/.test(property)
    const rootContext = [":root", ".pagopa-ui-root"].includes(context)
    if (
      (themeContext ? context === "@theme inline" : rootContext) &&
      LOCAL_VALUES[property] === clean
    )
      return occurrences
    // Existing host minimum/root typography and accessibility motion policy:
    // replacing the root line-height with Body's 22/16 would change behavior.
    if (rootContext && property === "line-height" && clean === "1.5") return occurrences
    if (context === "body" && property === "min-width" && clean === "320px") return occurrences
    if (
      /prefers-reduced-motion: reduce/.test(context) &&
      property === "animation-duration" &&
      ["0.01ms", "1s"].includes(clean)
    )
      return occurrences
  }
  if (visualConstant(property, clean)) {
    occurrences.push(occurrence("visual-constant", file, source, start, `${property}: ${clean}`))
  }
  return occurrences
}

export function cssStyleOccurrences(
  source: string,
  file: string,
  knownTokens: Set<string>,
): Occurrence[] {
  return cssDeclarations(source).flatMap((entry) =>
    checkValue(entry, file, source, knownTokens, true),
  )
}

type FunctionNode = {
  start: number
  end: number
  params: Node[]
}

type StyleBindings = {
  bindings: Map<string, Array<{ node: Node; scope: string | null }>>
  params: Map<string, Set<string>>
}

function scopeKey(node: { start: number; end: number }): string {
  return `${node.start}:${node.end}`
}

function patternNames(node: Node): string[] {
  if (node.type === "Identifier") return [node.name]
  if (node.type === "AssignmentPattern") return patternNames(node.left)
  if (node.type === "RestElement") return patternNames(node.argument)
  if (node.type === "ArrayPattern") {
    return node.elements.flatMap((element) => (element ? patternNames(element) : []))
  }
  if (node.type === "ObjectPattern") {
    return node.properties.flatMap((property) =>
      property.type === "Property"
        ? patternNames(property.value)
        : property.type === "RestElement"
          ? patternNames(property.argument)
          : [],
    )
  }
  return []
}

// A file can declare the same name in several components. Collect each binding
// with the function (or module) it belongs to, so a caller prop is never
// resolved to an unrelated module constant.
function collectStyleBindings(program: Extract<Node, { type: "Program" }>): StyleBindings {
  const bindings: StyleBindings["bindings"] = new Map()
  const params: StyleBindings["params"] = new Map()
  const scopes: string[] = []
  const current = (): string | null => scopes.at(-1) ?? null
  const enter = (node: FunctionNode): void => {
    const key = scopeKey(node)
    scopes.push(key)
    params.set(key, new Set(node.params.flatMap((parameter) => patternNames(parameter))))
  }
  const leave = (): void => {
    scopes.pop()
  }
  new Visitor({
    FunctionDeclaration: enter,
    FunctionExpression: enter,
    ArrowFunctionExpression: enter,
    "FunctionDeclaration:exit": leave,
    "FunctionExpression:exit": leave,
    "ArrowFunctionExpression:exit": leave,
    VariableDeclarator(node) {
      if (node.id.type === "Identifier" && node.init) {
        const entries = bindings.get(node.id.name) ?? []
        entries.push({ node: node.init, scope: current() })
        bindings.set(node.id.name, entries)
      }
    },
  }).visit(program)
  return { bindings, params }
}

export function inlineStyleOccurrences(
  program: Extract<Node, { type: "Program" }>,
  source: string,
  file: string,
  knownTokens: Set<string>,
): Occurrence[] {
  const occurrences: Occurrence[] = []
  const { bindings, params } = collectStyleBindings(program)
  const scopes: string[] = []
  const currentScope = (): string | null => scopes.at(-1) ?? null
  const resolve = (name: string): Node | undefined => {
    const scope = currentScope()
    // A parameter shadows every outer binding with the same name.
    if (scope && params.get(scope)?.has(name)) return undefined
    const entries = bindings.get(name) ?? []
    const local = entries.filter((entry) => entry.scope === scope)
    if (local.length > 1) return undefined
    if (local.length === 1) return local[0].node
    // Module-level constants remain visible inside every component. Locals of
    // another function are not followed: resolving them would guess a value
    // that is not the one this JSX receives.
    const moduleLevel = entries.filter((entry) => entry.scope === null)
    return moduleLevel.length === 1 ? moduleLevel[0].node : undefined
  }
  const visitValue = (property: string, node: Node, seen = new Set<string>()): void => {
    if (node.type === "Identifier") {
      const value = resolve(node.name)
      if (value && !seen.has(node.name)) {
        visitValue(property, value, new Set([...seen, node.name]))
      }
    } else if (
      node.type === "Literal" &&
      (typeof node.value === "string" || typeof node.value === "number")
    ) {
      // Preserve the existing caller-overridable table fallback until its
      // source-backed width is decided. Changing it or copying it elsewhere
      // fails; consumer column.maxWidth is never treated as a library token.
      if (
        file === "src/components/data-display/table.tsx" &&
        property === "maxWidth" &&
        node.value === "16rem" &&
        seen.has("defaultTruncatedWidth")
      )
        return
      if (typeof node.value === "number") {
        if (visualConstant(property, node.value)) {
          occurrences.push(
            occurrence("visual-constant", file, source, node.start, `${property}: ${node.value}`),
          )
        }
      } else {
        occurrences.push(
          ...checkValue(
            { property, value: node.value, start: node.start, context: "" },
            file,
            source,
            knownTokens,
            false,
          ),
        )
      }
    } else if (node.type === "ObjectExpression") {
      for (const entry of node.properties) {
        if (entry.type === "Property" && !entry.computed) {
          const key =
            entry.key.type === "Identifier"
              ? entry.key.name
              : entry.key.type === "Literal"
                ? entry.key.value
                : null
          if (typeof key === "string") visitValue(key, entry.value, seen)
        } else if (entry.type === "SpreadElement") visitValue(property, entry.argument, seen)
      }
    } else if (node.type === "ConditionalExpression") {
      visitValue(property, node.consequent, seen)
      visitValue(property, node.alternate, seen)
    } else if (node.type === "LogicalExpression") {
      visitValue(property, node.left, seen)
      visitValue(property, node.right, seen)
    } else if (node.type === "TemplateLiteral") {
      for (const quasi of node.quasis) {
        occurrences.push(
          ...checkValue(
            {
              property,
              value: quasi.value.cooked ?? quasi.value.raw,
              start: quasi.start,
              context: "",
            },
            file,
            source,
            knownTokens,
            false,
          ),
        )
      }
    } else if (
      node.type === "UnaryExpression" &&
      node.operator === "-" &&
      node.argument.type === "Literal" &&
      typeof node.argument.value === "number"
    ) {
      if (visualConstant(property, -node.argument.value)) {
        occurrences.push(
          occurrence(
            "visual-constant",
            file,
            source,
            node.start,
            `${property}: ${-node.argument.value}`,
          ),
        )
      }
    } else if (
      node.type === "TSAsExpression" ||
      node.type === "TSSatisfiesExpression" ||
      node.type === "TSNonNullExpression"
    ) {
      visitValue(property, node.expression, seen)
    }
  }
  const enter = (node: FunctionNode): void => {
    scopes.push(scopeKey(node))
  }
  const leave = (): void => {
    scopes.pop()
  }
  new Visitor({
    FunctionDeclaration: enter,
    FunctionExpression: enter,
    ArrowFunctionExpression: enter,
    "FunctionDeclaration:exit": leave,
    "FunctionExpression:exit": leave,
    "ArrowFunctionExpression:exit": leave,
    JSXAttribute(node) {
      if (
        node.name.type === "JSXIdentifier" &&
        node.name.name === "style" &&
        node.value?.type === "JSXExpressionContainer" &&
        node.value.expression.type !== "JSXEmptyExpression"
      ) {
        visitValue("", node.value.expression)
      }
    },
  }).visit(program)
  return occurrences
}
