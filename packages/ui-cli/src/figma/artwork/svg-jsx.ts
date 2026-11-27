// Pinned source SVGs are geometry, not markup to be fetched: each one becomes
// the JSX body of an inline component, so the published icon paints with
// `currentColor` and ships no asset request at all.

const ELEMENT = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[A-Za-z_][\w.:-]*="[^"]*")*)\s*(\/?)>/g
// Source ids are local to one document; inlined artwork shares a page with every
// other icon, so each one carries the prefix of the identity it belongs to.
const REFERENCE = /url\(#([^)]+)\)/g
const ATTRIBUTE = /([A-Za-z_][\w.:-]*)="([^"]*)"/g
// Source paints outside `<defs>`: the mask paths keep their alpha colours.
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

function jsxAttributes(raw: string, prefix: string): string {
  const attributes: string[] = []
  for (const [, name, value] of raw.matchAll(ATTRIBUTE)) {
    if (!name || value === undefined) continue
    if (name === "style") {
      attributes.push(`style={{ ${styleObject(value)} }}`)
      continue
    }
    if (name === "id") {
      attributes.push(`id="${prefix}${value}"`)
      continue
    }
    attributes.push(`${camelCase(name)}="${value.replace(REFERENCE, `url(#${prefix}$1)`)}"`)
  }
  return attributes.join(" ")
}

function jsxElements(markup: string, prefix: string): string {
  return markup.replace(ELEMENT, (whole, closing, tag, raw, selfClosing) => {
    if (closing) return whole
    const attributes = jsxAttributes(raw ?? "", prefix)
    return `<${tag}${attributes ? ` ${attributes}` : ""}${selfClosing ? " /" : ""}>`
  })
}

export type SvgJsxOptions = {
  /** Paint the symbol with `currentColor` instead of the source colours. */
  monochrome: boolean
  /** Namespace for the ids the artwork declares and references. */
  idPrefix: string
  /** Attributes appended after the root ones, spread included by the caller. */
  suffix?: string
}

export function svgToJsx(source: string, options: SvgJsxOptions): string {
  const text = source.trim()
  const open = /^<svg\b([^>]*)>/.exec(text)
  const close = text.lastIndexOf("</svg>")
  if (!open || close < 0) throw new Error("Expected one standalone <svg> document")
  // The root paint is decided here, not by the source document.
  const root = jsxAttributes(open[1] ?? "", options.idPrefix).replace(/(?:^|\s)fill="[^"]*"/, "")
  const body = text.slice(open[0].length, close)
  // The mask definitions keep their source paint; everything that paints the
  // symbol itself becomes the inherited text colour.
  // No `<defs>` means the whole body paints the symbol: the boundary falls at
  // its start, so every paint in it is repainted. `lastIndexOf` misses at `-1`,
  // never at `-1 + 7`.
  const closing = body.lastIndexOf("</defs>")
  const defs = closing < 0 ? 0 : closing + "</defs>".length
  const paint = options.monochrome
    ? body.slice(0, defs) + body.slice(defs).replace(PAINT, 'fill="currentColor"')
    : body
  const fill = options.monochrome ? ' fill="currentColor"' : ""
  const suffix = options.suffix ? ` ${options.suffix}` : ""
  return `<svg${root ? ` ${root}` : ""}${fill}${suffix}>${jsxElements(paint, options.idPrefix)}</svg>`
}
