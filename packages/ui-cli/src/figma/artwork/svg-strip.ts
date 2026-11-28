// The mirror keeps the source scene graph one node per source node, so a frame
// that clips its content costs a definition and every level of nesting costs a
// group. At the JSX boundary those nodes are dead weight: an identity group
// paints nothing, and a clip or mask that covers the whole node hides nothing.
// Shipping them costs bytes and drags a document-wide id into a page that will
// render the same glyph twice.

type SvgElement = {
  tag: string
  attributes: string
  children: SvgElement[]
  selfClosing: boolean
}

const TAG = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[A-Za-z_][\w.:-]*="[^"]*")*)\s*(\/?)>/g
const ATTRIBUTE = /([A-Za-z_][\w.:-]*)="([^"]*)"/g
const REFERENCE = /^url\(#(.+)\)$/
const IDENTITY = /^matrix\(1 0 0 1 0 0\)$/
const DROPPABLE = new Set(["defs", "g"])
// Geometry is compared between a source document and its own coordinates, so
// the tolerance only has to absorb the float noise Figma exports.
const TOLERANCE = 1e-3

function attributes(raw: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const [, name, value] of raw.matchAll(ATTRIBUTE)) {
    if (name && value !== undefined) map.set(name, value)
  }
  return map
}

function serialize(map: Map<string, string>): string {
  return [...map].map(([name, value]) => `${name}="${value}"`).join(" ")
}

function parse(markup: string): SvgElement[] | undefined {
  const roots: SvgElement[] = []
  const stack: SvgElement[] = []
  let cursor = 0
  for (const match of markup.matchAll(TAG)) {
    // A stray byte between tags means the document is not the shape this pass
    // understands: the caller keeps the source rather than a repaired version.
    if (match.index !== cursor) return undefined
    cursor = match.index + match[0].length
    const [, closing, tag, raw, selfClosing] = match
    if (tag === undefined) return undefined
    if (closing) {
      const open = stack.pop()
      if (!open || open.tag !== tag) return undefined
      continue
    }
    const element: SvgElement = {
      tag,
      attributes: (raw ?? "").trim(),
      children: [],
      selfClosing: Boolean(selfClosing),
    }
    const parent = stack.at(-1)
    if (parent) parent.children.push(element)
    else roots.push(element)
    if (!selfClosing) stack.push(element)
  }
  if (cursor !== markup.length || stack.length) return undefined
  return roots
}

function toMarkup(element: SvgElement): string {
  const open = `<${element.tag}${element.attributes ? ` ${element.attributes}` : ""}`
  if (element.selfClosing) return `${open} />`
  return `${open}>${element.children.map(toMarkup).join("")}</${element.tag}>`
}

function isIdentityGroup(element: SvgElement): boolean {
  if (element.tag !== "g") return false
  const map = attributes(element.attributes)
  for (const name of map.keys()) if (name !== "transform" && name !== "opacity") return false
  const transform = map.get("transform")
  if (transform !== undefined && !IDENTITY.test(transform)) return false
  const opacity = map.get("opacity")
  return opacity === undefined || Number(opacity) === 1
}

function flatten(elements: SvgElement[]): SvgElement[] {
  return elements.flatMap((element) => {
    const children = flatten(element.children)
    return isIdentityGroup(element) ? children : [{ ...element, children }]
  })
}

function prune(elements: SvgElement[]): SvgElement[] {
  return elements.flatMap((element) => {
    const children = prune(element.children)
    if (!children.length && DROPPABLE.has(element.tag)) return []
    return [{ ...element, children }]
  })
}

// A rectangle is the only shape whose corners this pass can prove without a
// geometry engine, and it is the shape a clipping frame exports as.
function isFullBleed(path: string, width: number, height: number): boolean {
  if (/[CQAST]/i.test(path)) return false
  const tokens = path.match(/[MLHVZ]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/gi)
  if (!tokens) return false
  const corners: Array<[number, number]> = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ]
  const seen = new Set<number>()
  let command = ""
  let x = 0
  let y = 0
  let index = 0
  while (index < tokens.length) {
    const token = tokens[index++]
    if (token === undefined) return false
    if (/^[A-Za-z]$/.test(token)) {
      command = token.toLowerCase()
      continue
    }
    if (command === "m" || command === "l") {
      x = Number(token)
      const next = tokens[index++]
      if (next === undefined) return false
      y = Number(next)
    } else if (command === "h") x = Number(token)
    else if (command === "v") y = Number(token)
    else return false
    const corner = corners.findIndex(
      ([cx, cy]) => Math.abs(cx - x) < TOLERANCE && Math.abs(cy - y) < TOLERANCE,
    )
    if (corner < 0) return false
    seen.add(corner)
  }
  return seen.size === corners.length
}

function isOpaqueCover(element: SvgElement, width: number, height: number): boolean {
  if (element.tag !== "path" || element.children.length) return false
  const map = attributes(element.attributes)
  return (
    map.get("fill") === "#ffffff" &&
    Number(map.get("fill-opacity") ?? "1") === 1 &&
    isFullBleed(map.get("d") ?? "", width, height)
  )
}

function coversWholeNode(element: SvgElement, width: number, height: number): boolean {
  const map = attributes(element.attributes)
  const cover = element.children[0]
  return (
    map.get("maskUnits") === "userSpaceOnUse" &&
    Number(map.get("x")) === 0 &&
    Number(map.get("y")) === 0 &&
    Math.abs(Number(map.get("width")) - width) < TOLERANCE &&
    Math.abs(Number(map.get("height")) - height) < TOLERANCE &&
    element.children.length === 1 &&
    cover !== undefined &&
    isOpaqueCover(cover, width, height)
  )
}

// No `clipPathUnits` means `userSpaceOnUse`, the same coordinates the node
// already paints in; a full-bleed rectangle there is the viewport it lives in.
function clipsNothing(element: SvgElement, width: number, height: number): boolean {
  const map = attributes(element.attributes)
  if ((map.get("clipPathUnits") ?? "userSpaceOnUse") !== "userSpaceOnUse") return false
  const shape = element.children[0]
  if (element.children.length !== 1 || !shape || shape.tag !== "path") return false
  return isFullBleed(attributes(shape.attributes).get("d") ?? "", width, height)
}

function redundantDefinitions(elements: SvgElement[], width: number, height: number): Set<string> {
  const ids = new Set<string>()
  const visit = (element: SvgElement): void => {
    const id = attributes(element.attributes).get("id")
    if (id) {
      const redundant =
        (element.tag === "mask" && coversWholeNode(element, width, height)) ||
        (element.tag === "clipPath" && clipsNothing(element, width, height))
      if (redundant) ids.add(id)
    }
    element.children.forEach(visit)
  }
  elements.forEach(visit)
  return ids
}

function dropDefinitions(elements: SvgElement[], ids: Set<string>): SvgElement[] {
  return elements.flatMap((element) => {
    const map = attributes(element.attributes)
    const id = map.get("id")
    if (id !== undefined && (element.tag === "mask" || element.tag === "clipPath") && ids.has(id))
      return []
    // The definition is redundant because nothing it hides is visible, so every
    // reference to it can go with it.
    for (const [name, value] of map) {
      const reference = REFERENCE.exec(value)?.[1]
      if (reference !== undefined && ids.has(reference)) map.delete(name)
    }
    return [
      { ...element, attributes: serialize(map), children: dropDefinitions(element.children, ids) },
    ]
  })
}

function viewBox(root: SvgElement): { width: number; height: number } | undefined {
  const map = attributes(root.attributes)
  const box = (map.get("viewBox") ?? "").trim().split(/\s+/).map(Number)
  if (box.length === 4) {
    const width = box[2]
    const height = box[3]
    if (width !== undefined && height !== undefined && width > 0 && height > 0)
      return { width, height }
  }
  const width = Number(map.get("width"))
  const height = Number(map.get("height"))
  if (width > 0 && height > 0) return { width, height }
  return undefined
}

function compact(elements: SvgElement[], width: number, height: number): SvgElement[] {
  const flat = flatten(elements)
  const ids = redundantDefinitions(flat, width, height)
  const repaired = ids.size ? dropDefinitions(flat, ids) : flat
  // Dropping a definition leaves an identity group behind once its reference is
  // gone, so the flatten runs again before the empty containers are pruned.
  return prune(flatten(repaired))
}

/**
 * Drops the nodes whose removal cannot change a single pixel: identity groups
 * and the masks and clips that cover the whole node. A document this pass
 * cannot prove is returned untouched, so the caller never ships a half-repaired
 * glyph.
 */
export function stripRedundantArtwork(markup: string): string {
  const roots = parse(markup.trim())
  const root = roots?.length === 1 ? roots[0] : undefined
  const box = root ? viewBox(root) : undefined
  if (!root || !box) return markup
  const children = compact(root.children, box.width, box.height)
  return toMarkup({ ...root, children })
}
