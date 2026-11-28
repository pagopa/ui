// Pinned source SVGs are geometry, not markup to be fetched: each one becomes
// the JSX body of an inline component, so the published icon paints with
// `currentColor` and ships no asset request at all.

import { stripRedundantArtwork } from "./svg-strip.ts"

const ELEMENT = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[A-Za-z_][\w.:-]*="[^"]*")*)\s*(\/?)>/g
const ATTRIBUTE = /([A-Za-z_][\w.:-]*)="([^"]*)"/g
const REFERENCE = /url\(#([^)]+)\)/g
const DECLARATION = /\bid="[^"]*"/
// Source paints outside `<defs>`: the definitions keep their alpha colours.
const PAINT = /fill="#[0-9a-fA-F]{3,8}"/g

function camelCase(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function styleObject(declarations: string): string {
  const entries: string[] = []
  for (const declaration of declarations.split(";")) {
    const separator = declaration.indexOf(":")
    if (separator === -1) continue
    const property = declaration.slice(0, separator).trim()
    const value = declaration.slice(separator + 1).trim()
    if (!property || !value) continue
    entries.push(`${camelCase(property)}: ${JSON.stringify(value)}`)
  }
  return entries.join(", ")
}

// A source id is local to one document; the published glyph shares a page with
// every other icon, so the reference is compiled against the namespace the
// caller derives per render instead of a constant of the source node.
function compile(name: string, value: string, namespace: string): string {
  if (name === "id") return `${namespace} + ${JSON.stringify(value)}`
  const parts: string[] = []
  let cursor = 0
  for (const match of value.matchAll(REFERENCE)) {
    const id = match[1] ?? ""
    const hash = match[0].indexOf("#") + 1
    const before = value.slice(cursor, match.index) + match[0].slice(0, hash)
    if (before) parts.push(JSON.stringify(before))
    // The closing parenthesis and anything after it belong to the same literal
    // as the id, so `url(#a) none` stays one concatenation.
    parts.push(namespace, JSON.stringify(id + match[0].slice(hash + id.length)))
    cursor = match.index + match[0].length
  }
  const rest = value.slice(cursor)
  if (rest) parts.push(JSON.stringify(rest))
  return parts.join(" + ")
}

function jsxAttributes(raw: string, namespace: string | undefined): string {
  const attributes: string[] = []
  for (const [, name, value] of raw.matchAll(ATTRIBUTE)) {
    if (!name || value === undefined) continue
    if (name === "style") {
      attributes.push(`style={{ ${styleObject(value)} }}`)
      continue
    }
    const named = name === "id" || value.includes("url(#")
    if (named && namespace) {
      attributes.push(`${camelCase(name)}={${compile(name, value, namespace)}}`)
      continue
    }
    attributes.push(`${camelCase(name)}="${value}"`)
  }
  return attributes.join(" ")
}

function jsxElements(markup: string, namespace: string | undefined): string {
  return markup.replace(ELEMENT, (whole, closing, tag, raw, selfClosing) => {
    if (closing) return whole
    const attributes = jsxAttributes(raw ?? "", namespace)
    return `<${tag}${attributes ? ` ${attributes}` : ""}${selfClosing ? " /" : ""}>`
  })
}

export type SvgJsxOptions = {
  /** Paint the symbol with `currentColor` instead of the source colours. */
  monochrome: boolean
  /**
   * JavaScript identifier holding a per-instance id namespace, e.g. the result
   * of `useId()`. Required by artwork that keeps an id.
   */
  namespace?: string
  /** Attributes appended after the root ones, spread included by the caller. */
  suffix?: string
}

export type SvgJsx = {
  markup: string
  /** True when the artwork keeps an id, so the caller must supply a namespace. */
  declaresIds: boolean
}

export function svgToJsx(source: string, options: SvgJsxOptions): SvgJsx {
  // The source scene graph carries nodes that paint nothing; dropping them here
  // keeps the published glyph, its id namespace and its byte cost honest.
  const text = stripRedundantArtwork(source)
  const open = /^<svg\b([^>]*)>/.exec(text)
  const close = text.lastIndexOf("</svg>")
  if (!open || close < 0) throw new Error("Expected one standalone <svg> document")
  const body = text.slice(open[0].length, close)
  // The root is compiled against the same namespace as the body, so an id it
  // carries asks for the namespace too.
  const rootAttributes = open[1] ?? ""
  const declaresIds =
    DECLARATION.test(rootAttributes) ||
    DECLARATION.test(body) ||
    rootAttributes.includes("url(#") ||
    body.includes("url(#")
  if (declaresIds && !options.namespace)
    throw new Error("Artwork keeps an id: pass the identifier of its namespace")
  // The root paint is decided here, not by the source document.
  const root = jsxAttributes(rootAttributes, options.namespace).replace(/(?:^|\s)fill="[^"]*"/, "")
  // The definitions keep their source paint; everything that paints the symbol
  // itself becomes the inherited text colour. With no `<defs>` the whole body
  // paints the symbol, so the boundary falls at its start.
  const closing = body.lastIndexOf("</defs>")
  const defs = closing < 0 ? 0 : closing + "</defs>".length
  const paint = options.monochrome
    ? body.slice(0, defs) + body.slice(defs).replace(PAINT, 'fill="currentColor"')
    : body
  const fill = options.monochrome ? ' fill="currentColor"' : ""
  const suffix = options.suffix ? ` ${options.suffix}` : ""
  return {
    declaresIds,
    markup: `<svg${root ? ` ${root}` : ""}${fill}${suffix}>${jsxElements(paint, options.namespace)}</svg>`,
  }
}
