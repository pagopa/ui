// Figma parity — source reader.
//
// Turns the pinned export (`.figma/live-rest.json`, local and gitignored) into
// the compact spec the parity diff compares against a rendered story. The
// export shape and the catalogue identity come from the shared snapshot
// module; this module only reads the document tree (geometry, layout, paint and
// type) — it never re-implements snapshot loading, node normalization or node
// lookup for the catalogue.
//
// Usage:
//   node src/cli.ts parity source <nodeId> [--depth N] [--json]
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { fetchFigmaImagesPng } from "../figma/rest.ts"
import { normalizeLive } from "../figma/snapshot.ts"
import { loadInventoryNodes } from "../figma/devices.ts"
import { evidencePaths } from "./evidence.ts"
import { enterRoot, rootPath } from "../lib/paths.ts"
import { readJson } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import type { InventoryNode } from "../schemas/catalogue.ts"

export const SNAPSHOT_PATH = ".figma/live-rest.json"
export const SCHEMA_VERSION = 1
export type SourceOrigin = "input" | "snapshot" | "evidence"

type Paint = {
  type?: string
  visible?: boolean
  color?: { r: number; g: number; b: number }
}

type TextStyle = {
  fontSize?: number
  lineHeightPx?: number
  lineHeightPercentFontSize?: number
  fontWeight?: number
  fontPostScriptName?: string
  fontStyle?: string
}

export type RawNode = {
  id: string
  name: string
  type: string
  children?: RawNode[]
  visible?: boolean
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number }
  layoutMode?: string
  itemSpacing?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  primaryAxisAlignItems?: string
  counterAxisAlignItems?: string
  strokes?: Paint[]
  strokeWeight?: number
  fills?: Paint[]
  cornerRadius?: number
  layoutSizingHorizontal?: string
  layoutSizingVertical?: string
  characters?: string
  style?: TextStyle
}

// Figma REST writes `null` for an optional style, layout or paint field it has
// no value for (an unpinned `fontPostScriptName`, an unset alignment). The spec
// types use `undefined`, so the reader normalizes the two here instead of
// rejecting a legitimate export.
const optionalString = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined)
const optionalNumber = z
  .number()
  .nullish()
  .transform((value) => value ?? undefined)
const optionalBoolean = z
  .boolean()
  .nullish()
  .transform((value) => value ?? undefined)
const optionalBox = z
  .looseObject({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
  .nullish()
  .transform((value) => value ?? undefined)

const PaintSchema = z.looseObject({
  type: optionalString,
  visible: optionalBoolean,
  color: z
    .looseObject({ r: z.number(), g: z.number(), b: z.number() })
    .nullish()
    .transform((value) => value ?? undefined),
})

const RawNodeSchema: z.ZodType<RawNode> = z.lazy(() =>
  z.looseObject({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    children: z.array(RawNodeSchema).optional(),
    visible: optionalBoolean,
    absoluteBoundingBox: optionalBox,
    layoutMode: optionalString,
    itemSpacing: optionalNumber,
    paddingTop: optionalNumber,
    paddingRight: optionalNumber,
    paddingBottom: optionalNumber,
    paddingLeft: optionalNumber,
    primaryAxisAlignItems: optionalString,
    counterAxisAlignItems: optionalString,
    strokes: z.array(PaintSchema).optional(),
    strokeWeight: optionalNumber,
    fills: z.array(PaintSchema).optional(),
    cornerRadius: optionalNumber,
    layoutSizingHorizontal: optionalString,
    layoutSizingVertical: optionalString,
    characters: optionalString,
    style: z
      .looseObject({
        fontSize: optionalNumber,
        lineHeightPx: optionalNumber,
        lineHeightPercentFontSize: optionalNumber,
        fontWeight: optionalNumber,
        fontPostScriptName: optionalString,
        fontStyle: optionalString,
      })
      .optional(),
  }),
)

const ExportSchema = z.looseObject({
  kind: z.string().optional(),
  fileKey: z.string().optional(),
  version: z.string().optional(),
  nodes: z.record(z.string(), z.looseObject({ document: RawNodeSchema.optional() })).optional(),
})

export type Project = {
  file: string
  origin: SourceOrigin
  version: string | undefined
  raw: z.infer<typeof ExportSchema>
  catalogue: InventoryNode[]
}

export type SpecNode = {
  schemaVersion: number
  nodeId: string
  name: string
  type: string
  box: { width: number; height: number } | undefined
  at: { x: number; y: number } | undefined
  radius: number | undefined
  visible: false | undefined
  sizing: { horizontal: string | undefined; vertical: string | undefined } | undefined
  layout:
    | {
        mode: string
        gap: number
        padding: number[]
        align?: string
        counterAlign?: string
      }
    | undefined
  strokes: Array<{ width: number; color: string | undefined }> | undefined
  fills: Array<string | undefined> | undefined
  text:
    | {
        characters: string | undefined
        fontSize: number | undefined
        lineHeight: number | undefined
        weight: number | undefined
        cssWeight: number | undefined
        styleName: string | undefined
        color: string | undefined
      }
    | undefined
  children?: SpecNode[]
  parent?: { name: string; mode: string | undefined }
}

export type VariantInfo = {
  nodeId: string
  name: string
  state: Record<string, string>
  box: { width: number; height: number } | undefined
}

// The bundled Titillio has no 500 face: the source style names map to the CSS
// weights that keep the declared face (figma-to-code skill, references/visual-parity.md).
const CSS_WEIGHT = new Map([
  [300, 400],
  [400, 400],
  [500, 600],
  [600, 700],
  [700, 700],
])

export function cssWeight(sourceWeight: number | undefined): number | undefined {
  return sourceWeight === undefined ? undefined : (CSS_WEIGHT.get(sourceWeight) ?? sourceWeight)
}

export function hexOf(paint: Paint | undefined): string | undefined {
  if (!paint || paint.type !== "SOLID" || !paint.color) return undefined
  const { r, g, b } = paint.color
  const channel = (value: number): string =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, "0")
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

// The source a parity run reads, in order: an explicit `--input`, the local
// pinned snapshot, the committed evidence slice. The slice makes the source side
// reproducible in a clone without `.figma/` and without a token.
export function resolveExport(input?: string): { file: string; origin: SourceOrigin } {
  // Every path is relative to the design-system root, like the rest of the CLI;
  // an absolute path is taken as written.
  if (input) return { file: path.isAbsolute(input) ? input : rootPath(input), origin: "input" }
  const snapshot = rootPath(SNAPSHOT_PATH)
  if (fs.existsSync(snapshot)) return { file: snapshot, origin: "snapshot" }
  const evidence = evidencePaths().source
  if (fs.existsSync(evidence)) return { file: evidence, origin: "evidence" }
  throw new Error(
    `${SNAPSHOT_PATH} and the committed evidence slice are both missing: the parity source is ` +
      `the pinned export the user produces with the live export, or the committed evidence slice.`,
  )
}

export function loadExport(input?: string): Project {
  const { file, origin } = resolveExport(input)
  const raw = parseSchema(ExportSchema, readJson(file), file)
  // The committed slice carries only the documents a case points at, so it
  // cannot satisfy `normalizeLive` (which needs every published node): the
  // catalogue comes from the committed inventory instead. The full-snapshot
  // path stays the normalizer's.
  const catalogue = raw.kind === "parity-source" ? loadInventoryNodes() : normalizeLive(raw)
  return { file, origin, version: raw.version, raw, catalogue }
}

const documentIndexes = new WeakMap<Project, Map<string, RawNode>>()

// Every document node of the export, id → raw node: the published set, its
// variants and the nested instances all become addressable.
export function documentIndex(project: Project): Map<string, RawNode> {
  const cached = documentIndexes.get(project)
  if (cached) return cached
  const index = new Map<string, RawNode>()
  const walk = (node: RawNode): void => {
    index.set(node.id, node)
    for (const child of node.children ?? []) walk(child)
  }
  for (const record of Object.values(project.raw.nodes ?? {})) {
    if (record.document) walk(record.document)
  }
  documentIndexes.set(project, index)
  return index
}

export function sourceNode(project: Project, nodeId: string): RawNode | undefined {
  return documentIndex(project).get(nodeId)
}

function boxOf(node: RawNode): { width: number; height: number } | undefined {
  const box = node.absoluteBoundingBox
  return box ? { width: Math.round(box.width), height: Math.round(box.height) } : undefined
}

function layoutOf(node: RawNode): SpecNode["layout"] {
  if (!node.layoutMode || node.layoutMode === "NONE") return undefined
  const layout: NonNullable<SpecNode["layout"]> = {
    mode: node.layoutMode,
    gap: node.itemSpacing ?? 0,
    padding: [
      node.paddingTop ?? 0,
      node.paddingRight ?? 0,
      node.paddingBottom ?? 0,
      node.paddingLeft ?? 0,
    ],
  }
  // The two alignment axes decide whether a computed padding is comparable at
  // all (a centred axis keeps the visual inset while the padding moves).
  if (node.primaryAxisAlignItems && node.primaryAxisAlignItems !== "MIN") {
    layout.align = node.primaryAxisAlignItems
  }
  if (node.counterAxisAlignItems && node.counterAxisAlignItems !== "MIN") {
    layout.counterAlign = node.counterAxisAlignItems
  }
  return layout
}

function strokesOf(node: RawNode): SpecNode["strokes"] {
  const strokes = (node.strokes ?? []).filter((paint) => paint.visible !== false)
  if (!strokes.length) return undefined
  return strokes.map((paint) => ({
    width: node.strokeWeight ?? 1,
    color: paint.type === "SOLID" ? hexOf(paint) : paint.type,
  }))
}

function fillsOf(node: RawNode): SpecNode["fills"] {
  const fills = (node.fills ?? []).filter(
    (paint) => paint.visible !== false && paint.type === "SOLID",
  )
  return fills.length ? fills.map(hexOf) : undefined
}

function textOf(node: RawNode): SpecNode["text"] {
  if (node.type !== "TEXT") return undefined
  const style = node.style ?? {}
  return {
    characters: node.characters,
    fontSize: style.fontSize,
    lineHeight: style.lineHeightPx ?? style.lineHeightPercentFontSize,
    weight: style.fontWeight,
    cssWeight: cssWeight(style.fontWeight),
    styleName: style.fontPostScriptName ?? style.fontStyle,
    color: hexOf((node.fills ?? []).find((paint) => paint.type === "SOLID")),
  }
}

const round2 = (value: number): number => Math.round(value * 100) / 100

// The two source facts the diff does not compare but a review reads: the node
// can be hidden in the file (the tree still lists it) and each axis can hug its
// content or fill its parent, which is what explains who drives a geometry.
function visibilityOf(node: RawNode): false | undefined {
  return node.visible === false ? false : undefined
}

function sizingOf(node: RawNode): SpecNode["sizing"] {
  if (!node.layoutSizingHorizontal && !node.layoutSizingVertical) return undefined
  return {
    horizontal: node.layoutSizingHorizontal,
    vertical: node.layoutSizingVertical,
  }
}

// The compact spec of one node and (bounded) its children. `at` is the node's
// offset from the spec root, so a nested subject can be compared against a DOM
// element measured from the same origin (the `compareOffset` contract).
export function nodeSpec(
  node: RawNode,
  { depth = 2, origin }: { depth?: number; origin?: { x: number; y: number } } = {},
): SpecNode {
  const box = node.absoluteBoundingBox
  const root = origin ?? (box ? { x: box.x, y: box.y } : undefined)
  const spec: SpecNode = {
    schemaVersion: SCHEMA_VERSION,
    nodeId: node.id,
    name: node.name,
    type: node.type,
    box: boxOf(node),
    at: box && root ? { x: round2(box.x - root.x), y: round2(box.y - root.y) } : undefined,
    radius: node.cornerRadius ?? undefined,
    visible: visibilityOf(node),
    sizing: sizingOf(node),
    layout: layoutOf(node),
    strokes: strokesOf(node),
    fills: fillsOf(node),
    text: textOf(node),
  }
  if (depth > 0 && node.children?.length) {
    spec.children = node.children.map((child) =>
      nodeSpec(child, { depth: depth - 1, origin: root }),
    )
  }
  return spec
}

// The variant-level nodes of a published set, with their size and the state the
// name declares (`Status=Enabled, Filled=False, * Required=True`).
export function variantsOf(node: RawNode): VariantInfo[] {
  if (node.type !== "COMPONENT_SET") return []
  return (node.children ?? []).map((child) => ({
    nodeId: child.id,
    name: child.name,
    state: Object.fromEntries(
      child.name
        .split(",")
        .map((part) => part.trim().split("="))
        .filter((pair): pair is [string, string] => Boolean(pair[0] && pair[1]))
        .map(([key, value]) => [key.trim().replace(/^\*/, ""), value.trim()]),
    ),
    box: boxOf(child),
  }))
}

// One line per node, indented by depth: the anatomy read (`--compact`). It is
// derived from `nodeSpec`, so the view and the diff can never disagree, and it
// carries the two review-only facts the numeric diff skips: a hidden layer and
// the hug/fill sizing of each axis.
export function formatSpecTree(spec: SpecNode, depth = 0): string[] {
  const parts = [spec.nodeId, spec.type, JSON.stringify(spec.name)]
  if (spec.radius !== undefined) parts.push(`r=${spec.radius}`)
  if (spec.strokes) {
    parts.push(
      `stroke=${spec.strokes
        .map((stroke) => `${stroke.width}${stroke.color ? ` ${stroke.color}` : ""}`)
        .join(",")}`,
    )
  }
  if (spec.fills && spec.type !== "TEXT") parts.push(`fill=${spec.fills.join(",")}`)
  if (spec.box) parts.push(`${spec.box.width}x${spec.box.height}`)
  if (spec.at) parts.push(`@${spec.at.x},${spec.at.y}`)
  const layout: string[] = []
  if (spec.layout) {
    layout.push(spec.layout.mode)
    if (spec.layout.gap) layout.push(`gap=${spec.layout.gap}`)
    if (spec.layout.padding.some(Boolean)) layout.push(`pad=${spec.layout.padding.join("/")}`)
    if (spec.layout.align || spec.layout.counterAlign) {
      layout.push(`align=${spec.layout.align ?? "-"}/${spec.layout.counterAlign ?? "-"}`)
    }
  }
  if (spec.sizing)
    layout.push(`sizing=${spec.sizing.horizontal ?? "-"}/${spec.sizing.vertical ?? "-"}`)
  if (layout.length) parts.push(layout.join(" "))
  if (spec.text) {
    const text = spec.text
    const style = [
      text.styleName ?? "",
      text.fontSize !== undefined ? `${text.fontSize}px` : "",
      text.lineHeight !== undefined ? `lh=${text.lineHeight}` : "",
      text.color ?? "",
    ]
      .filter(Boolean)
      .join(" ")
    parts.push(`text=${JSON.stringify(text.characters)} ${style}`)
  }
  if (spec.visible === false) parts.push("hidden")
  const lines = [`${"  ".repeat(depth)}- ${parts.join(" | ")}`]
  for (const child of spec.children ?? []) lines.push(...formatSpecTree(child, depth + 1))
  return lines
}

// The same set narrowed to the variants a predicate accepts (`--device`): the
// state rules then apply inside the device, so a review names the device instead
// of reading the first variant — which is the desktop one.
export function variantsWhere(
  node: RawNode | undefined,
  predicate: (name: string, node: RawNode) => boolean,
): RawNode | undefined {
  if (!node || node.type !== "COMPONENT_SET") return node
  return {
    ...node,
    children: (node.children ?? []).filter((child) => predicate(child.name, child)),
  }
}

// `--state filled` / `--variant 529:6110`: pick the variant the review captures.
// An exact match on any declared value wins; then the natural-language aliases
// (`filled` -> `Filled=True`, `empty` -> `Filled=False`) so the command line
// reads the way the source states do.
export function pickVariant(
  node: RawNode,
  { variant, state }: { variant?: string; state?: string } = {},
): VariantInfo {
  const variants = variantsOf(node)
  // A published node without variants (a plain `COMPONENT`) is its own single
  // variant: there is no axis to select, so `--state` only names the case and
  // `--variant`, when given, has to be the node itself.
  if (!variants.length) {
    if (variant && variant !== node.id) {
      throw new Error(`${variant} is not a variant of ${node.id}: the node has no variants`)
    }
    return { nodeId: node.id, name: node.name, state: {}, box: boxOf(node) }
  }
  if (variant) {
    const match = variants.find((item) => item.nodeId === variant)
    if (!match) throw new Error(`${variant} is not a variant of ${node.id}`)
    return match
  }
  const wanted = (state ?? "").toLowerCase()
  if (wanted.includes("|")) {
    // Multi-axis sets (`Device=MD Desktop, Message=Thank you page`): every
    // token must match one of the declared values.
    const tokens = wanted
      .split("|")
      .map((token) => token.trim())
      .filter(Boolean)
    const match = variants.find((item) =>
      tokens.every((token) =>
        Object.values(item.state).some(
          (value) => value.toLowerCase() === token || value.toLowerCase().includes(token),
        ),
      ),
    )
    if (match) return match
  }
  if (wanted) {
    const exact = variants.find((item) =>
      Object.values(item.state).some((value) => value.toLowerCase() === wanted),
    )
    if (exact) return exact
    // A short state token (`md`, `desktop`) matches the declared device value.
    const partial = variants.find((item) =>
      Object.values(item.state).some((value) => value.toLowerCase().includes(wanted)),
    )
    if (partial) return partial
    const alias = variants.find(
      (item) =>
        ("filled" === wanted && item.state.Filled === "True") ||
        ("empty" === wanted && item.state.Filled === "False"),
    )
    if (alias) return alias
  }
  const first = variants[0]
  if (!first) throw new Error(`${node.id} has no variants`)
  return first
}

// The named leaves of a spec subtree, so a subject can be addressed by the layer
// name the source uses (`Label text`, `Description`, `Button`). A nested match
// carries its parent identity: the composition checks need to know which layers
// the source declares as siblings, and on which axis they are ordered.
export function namedLeaves(
  spec: SpecNode,
  name: string,
  matches: SpecNode[] = [],
  parent?: SpecNode,
): SpecNode[] {
  if (spec.name.toLowerCase() === name.toLowerCase()) {
    matches.push(
      parent ? { ...spec, parent: { name: parent.name, mode: parent.layout?.mode } } : spec,
    )
  }
  for (const child of spec.children ?? []) namedLeaves(child, name, matches, spec)
  return matches
}

// The offset of one spec node from another layer of the same tree: both sides
// live in the variant's coordinate space, so the difference is the relationship
// the DOM probe measures against the element the case declares as its origin.
export function offsetBetween(
  node: SpecNode,
  origin: SpecNode,
): { left: number; top: number } | undefined {
  if (!node.at || !origin.at) return undefined
  return { left: round2(node.at.x - origin.at.x), top: round2(node.at.y - origin.at.y) }
}

export async function sourceCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const [nodeId, ...rest] = argv
  if (!nodeId) {
    console.error(
      "usage: node src/cli.ts parity source <nodeId> [--depth N] [--json] [--compact] [--png [file]]",
    )
    process.exit(2)
  }
  const depthIndex = rest.indexOf("--depth")
  const depth = depthIndex >= 0 ? Number(rest[depthIndex + 1]) : 2
  const inputIndex = rest.indexOf("--input")
  const input = inputIndex >= 0 ? rest[inputIndex + 1] : undefined
  const project = loadExport(input)
  console.error(`source: ${project.file} (${project.origin})`)
  const node = sourceNode(project, nodeId.replace("-", ":"))
  if (!node) {
    console.error(`${nodeId} is not in the pinned export`)
    process.exit(2)
  }
  const pngIndex = rest.indexOf("--png")
  if (pngIndex >= 0) {
    const next = rest[pngIndex + 1]
    // An explicit path follows `--png`; without one the pinned variant PNG
    // lands in the gitignored parity output, named by its node id.
    const file =
      next && !next.startsWith("--")
        ? path.isAbsolute(next)
          ? next
          : rootPath(next)
        : rootPath(".figma/parity/source", `${node.id.replace(":", "-")}.png`)
    const { fileKey } = project.raw
    const version = project.version
    if (!fileKey || !version) {
      throw new Error("--png needs the pinned export's fileKey and version")
    }
    const images = await fetchFigmaImagesPng(fileKey, version, [node.id])
    const buffer = images.get(node.id)
    if (!buffer) throw new Error(`Figma rendered no PNG for ${node.id}`)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, buffer)
    console.error(`png: ${file} (version ${version})`)
  }
  const spec = nodeSpec(node, { depth })
  const variants = variantsOf(node)
  if (rest.includes("--compact")) {
    for (const line of formatSpecTree(spec)) console.log(line)
    for (const item of variants) console.log(`  variant ${item.nodeId} ${item.name}`)
    return
  }
  const output = { spec, variants }
  if (rest.includes("--json")) console.log(JSON.stringify(output, null, 2))
  else {
    console.log(JSON.stringify(output.spec, null, 2))
    for (const item of output.variants) console.log(`  variant ${item.nodeId} ${item.name}`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  enterRoot()
  await sourceCli()
}
