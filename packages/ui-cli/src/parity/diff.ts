// Figma parity — classified diff.
//
// Pure functions: source spec + render probe in, classified deltas out. This is
// the single place that owns the tolerance, the weight law, the target rule and
// the token classification (the rules are listed in the parity-tooling reference
// of the figma-to-code skill).
import fs from "node:fs"
import { z } from "zod"

import { tokensPath } from "../lib/paths.ts"
import { parseSchema } from "../lib/validate.ts"
import type { SpecNode } from "./source.ts"
import { rgbToHex } from "./render.ts"

export const SCHEMA_VERSION = 1
export const TOLERANCE = 2

const TOKEN_CSS = tokensPath("src/figma.generated.css")
const TOKEN_MANIFEST = tokensPath("src/manifest.json")

type TokenCandidate = {
  name: string
  size?: number
  lineHeight?: number
  value?: number
  weight?: number
}

export type TokenIndex = {
  type: TokenCandidate[]
  radius: TokenCandidate[]
  color: TokenCandidate[]
  space: TokenCandidate[]
}

// Two passes over the same case agree when they name the same paths with the
// same values: the order the probe walks the tree in carries no meaning.
export function sameDeltas(first: Delta[], second: Delta[]): boolean {
  const fingerprint = (deltas: Delta[]) =>
    deltas
      .map(
        (delta) =>
          `${delta.path}=${JSON.stringify([delta.value ?? null, delta.source ?? null, delta.render ?? null])}`,
      )
      .sort()
  const left = fingerprint(first)
  const right = fingerprint(second)
  return left.length === right.length && left.every((entry, index) => entry === right[index])
}

export type Delta = {
  path: string
  source?: unknown
  render?: unknown
  severity: string
  value?: unknown
  lineHeight?: number
  token?: { kind: string; name?: string; delta?: number; nearest?: string }
}

export type SourceSubject = Partial<SpecNode> & {
  offset?: { left: number; top: number }
  parent?: { name: string; mode?: string }
  childCount?: number
  gap?: number
  padding?: number[]
  visibleText?: string
  font?: { size?: number; weight?: number }
}

export type RenderSubject = {
  box?: { width: number; height: number }
  offset?: { left: number; top: number }
  padding?: number[]
  text?: string
  layout?: string
  childCount?: number
  gap?: number
  rowGap?: number
  columnGap?: number
  visibleText?: string
  font?: { size?: number; weight?: number; lineHeight?: number }
  expansion?: { top?: number; bottom?: number }
  border?: { width: number; color?: string }
  boxShadow?: string
  background?: string
  radius?: number
  fill?: string
  stroke?: { width?: number; color?: string }
  lineHeight?: number
  color?: string
}

export type Responsive = {
  clipped?: Array<{ selector: string; hidden: number; axis: string; client: number }>
  escaped?: Array<{ selector: string; edges?: Record<string, number> }>
  truncated?: Array<{ selector: string; hidden: number; text: string }>
  scrollable?: Array<{ selector: string; x: number; y: number; before?: number }>
  band?: { rows?: number; children?: number }
}

type Probe = {
  subjects?: Record<string, RenderSubject>
  responsive?: Responsive
}

const TokenManifestSchema = z.looseObject({
  variables: z
    .record(
      z.string(),
      z.looseObject({
        value: z.unknown().optional(),
        size: z.number().optional(),
        lineHeight: z.number().optional(),
        weight: z.number().optional(),
      }),
    )
    .optional(),
})

// A borderless render that paints an inset ring (an inset box-shadow with no
// offset and no blur) draws its stroke inside the box, like a Figma INSIDE
// stroke: that ring is the stroke the diff compares.
export function renderStroke(render: RenderSubject): { width: number; color?: string } | undefined {
  if (!render.border || render.border.width > 0 || !render.boxShadow) return render.border
  const layers = render.boxShadow.split(/,(?![^(]*\))/).map((layer) => layer.trim())
  for (const layer of layers) {
    if (!/\binset\b/.test(layer)) continue
    const color = /([a-z-]+\([^)]*\)|#[0-9a-f]{3,8})/i.exec(layer)?.[1]
    if (!color || /rgba\([^)]*,\s*0\)$/.test(color)) continue
    const lengths = (layer.replace(color, "").match(/-?[\d.]+px/g) ?? []).map(parseFloat)
    const [x = 0, y = 0, blur = 0, spread = 0] = lengths
    if (x === 0 && y === 0 && blur === 0 && spread > 0) return { width: spread, color }
  }
  return render.border
}

function hexOfColor(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("#")
    ? value.toLowerCase()
    : rgbToHex(value)?.toLowerCase()
}

// The token vocabulary the classification uses: the generated type scale and
// radii, plus every colour variable and its hex value from the manifest.
export function tokenIndex({
  cssPath = TOKEN_CSS,
  manifestPath = TOKEN_MANIFEST,
}: { cssPath?: string; manifestPath?: string } = {}): TokenIndex {
  const index: TokenIndex = { type: [], radius: [], color: [], space: [] }
  const css = fs.readFileSync(cssPath, "utf8")
  // Only the size declaration of a text token counts: its `--line-height`,
  // `--font-weight` and `--letter-spacing` sub-properties carry other values.
  const declarations = [
    ...css.matchAll(/--(text|radius|figma-radius)-([\w-]+):\s*([\d.]+)(rem|px);/g),
  ]
  for (const [, group, name, value, unit] of declarations) {
    const pixels = Number.parseFloat(value ?? "")
    if (Number.isNaN(pixels)) continue
    const asPixels = unit === "px" ? pixels : pixels * 16
    if (group === "text") {
      const lineHeight = new RegExp(`--text-${name}--line-height:\\s*([\\d.]+)rem;`).exec(css)
      index.type.push({
        name: `text-${name}`,
        size: asPixels,
        lineHeight: lineHeight ? Number(lineHeight[1]) * 16 : undefined,
      })
    } else {
      index.radius.push({ name: `radius-${name}`, value: Math.round(asPixels) })
    }
  }
  const manifest = parseSchema(
    TokenManifestSchema,
    JSON.parse(fs.readFileSync(manifestPath, "utf8")),
    manifestPath,
  )
  for (const [name, variable] of Object.entries(manifest.variables ?? {})) {
    const value = variable.value
    if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) {
      index.color.push({ name, value: Number.parseInt(value.slice(1), 16) })
      continue
    }
    if (value && typeof value === "object" && "r" in value && "g" in value && "b" in value) {
      const channel = (number: number): string =>
        Math.round(number * 255)
          .toString(16)
          .padStart(2, "0")
      const color = parseSchema(
        z.looseObject({ r: z.number(), g: z.number(), b: z.number() }),
        value,
        "token color",
      )
      index.color.push({
        name,
        value: Number.parseInt(`${channel(color.r)}${channel(color.g)}${channel(color.b)}`, 16),
      })
    }
    if (
      value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === "TYPOGRAPHY" &&
      "size" in value &&
      typeof value.size === "number"
    ) {
      index.type.push({
        name,
        size: value.size,
        lineHeight:
          "lineHeight" in value && typeof value.lineHeight === "number"
            ? value.lineHeight
            : undefined,
        weight: "weight" in value && typeof value.weight === "number" ? value.weight : undefined,
      })
    }
  }
  for (let step = 1; step <= 60; step += 1)
    index.space.push({ name: `space-${step}`, value: step * 4 })
  return index
}

// A value is `token` when it matches the vocabulary, `near-token` when it is
// within `tolerance` and `inline` otherwise. Type candidates are broken by the
// line height when the caller knows it: several styles share a font size.
export function classify(
  index: TokenIndex,
  kind: string,
  value: unknown,
  tolerance = TOLERANCE,
  pair: { lineHeight?: number } = {},
): Delta["token"] {
  if (typeof value !== "number" || Number.isNaN(value)) return { kind: "inline" }
  const candidates: TokenCandidate[] =
    kind === "color"
      ? []
      : kind === "type"
        ? index.type
        : kind === "radius"
          ? index.radius
          : kind === "space"
            ? index.space
            : []
  let best: TokenCandidate | undefined
  let bestDelta = Number.POSITIVE_INFINITY
  let bestLine = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    const target = kind === "type" ? candidate.size : candidate.value
    if (target == null) continue
    const delta = Math.abs(target - value)
    const lineDelta =
      kind === "type" && pair.lineHeight != null && candidate.lineHeight != null
        ? Math.abs(candidate.lineHeight - pair.lineHeight)
        : 0
    if (delta < bestDelta || (delta === bestDelta && lineDelta < bestLine)) {
      bestDelta = delta
      bestLine = lineDelta
      best = candidate
    }
  }
  if (!best) return { kind: "inline" }
  if (bestDelta === 0) return { kind: "token", name: best.name }
  if (bestDelta <= tolerance) return { kind: "near-token", name: best.name, delta: bestDelta }
  return { kind: "inline", nearest: best.name, delta: bestDelta }
}

function push(
  deltas: Delta[],
  key: string,
  path: string,
  source: unknown,
  render: unknown,
  severity = "delta",
): void {
  deltas.push({ path: `${key}.${path}`, source, render, severity })
}

// The composition check: the mapped siblings the source declares under the same
// parent must keep that order on the DOM side. A relative sign comparison needs
// no origin and no pixel score, and it catches the class a box comparison cannot
// see (a swapped order with equal heights).
export function compositionDeltas({
  sources,
  probe,
  tolerance = TOLERANCE,
}: {
  sources: Record<string, SourceSubject>
  probe: Probe
  tolerance?: number
}): Delta[] {
  const deltas: Delta[] = []
  const entries = Object.entries(sources)
    .map(([key, source]) => ({ key, source, render: probe.subjects?.[key] }))
    .filter((item) => item.source.parent?.name && item.source.offset && item.render?.offset)
  const groups = new Map<string, typeof entries>()
  for (const item of entries) {
    const group = item.source.parent?.name
    if (!group) continue
    const groupEntries = groups.get(group)
    if (groupEntries) groupEntries.push(item)
    else groups.set(group, [item])
  }
  for (const items of groups.values()) {
    if (items.length < 2) continue
    const axis = items[0]?.source.parent?.mode === "HORIZONTAL" ? "left" : "top"
    for (let first = 0; first < items.length; first += 1) {
      for (let second = first + 1; second < items.length; second += 1) {
        const a = items[first]
        const b = items[second]
        if (!a || !b) continue
        const sourceDelta = (a.source.offset?.[axis] ?? 0) - (b.source.offset?.[axis] ?? 0)
        const renderDelta = (a.render?.offset?.[axis] ?? 0) - (b.render?.offset?.[axis] ?? 0)
        if (Math.abs(sourceDelta) <= tolerance || Math.abs(renderDelta) <= tolerance) continue
        if (Math.sign(sourceDelta) === Math.sign(renderDelta)) continue
        deltas.push({
          path: `${a.key}.composition.order`,
          source: `${a.key} before ${b.key}`,
          render: `${b.key} before ${a.key}`,
          severity: "advisory",
        })
      }
    }
  }
  return deltas
}

// The responsive verdict (RA5, R6): the render's own report of what the source
// frame cannot show.
export function responsiveDeltas({ responsive }: { responsive?: Responsive }): Delta[] {
  const deltas: Delta[] = []
  if (!responsive) return deltas
  const add = (path: string, source: unknown, render: unknown, severity = "delta"): void => {
    deltas.push({ path, source, render, severity })
  }
  for (const finding of responsive.clipped ?? []) {
    add(
      `responsive.clipped.${finding.selector}`,
      "no hidden overflow",
      `${finding.hidden}px hidden on ${finding.axis} (${finding.client}px box, overflow-${finding.axis}: hidden)`,
    )
  }
  for (const finding of responsive.escaped ?? []) {
    const edges = Object.entries(finding.edges ?? {})
      .map(([edge, value]) => `${edge} ${value}px`)
      .join(", ")
    add(
      `responsive.escaped.${finding.selector}`,
      "inside the root box",
      `painted outside by ${edges}`,
    )
  }
  for (const finding of responsive.truncated ?? []) {
    add(
      `responsive.truncated.${finding.selector}`,
      "text intact",
      `${finding.hidden}px of "${finding.text}" not rendered`,
    )
  }
  for (const finding of responsive.scrollable ?? []) {
    add(
      `responsive.scrollable.${finding.selector}`,
      "no scrolling",
      `scrolls ${finding.x}×${finding.y}px` +
        `${finding.before ? `, content starts ${finding.before}px before the scroll origin` : ""}`,
      "advisory",
    )
  }
  return deltas
}

// The band structure the source declares against the one the render shows (RA5).
export function bandDeltas({
  source,
  responsive,
}: {
  source?: SourceSubject
  responsive?: Responsive
}): Delta[] {
  const deltas: Delta[] = []
  const band = responsive?.band
  const mode = source?.layout?.mode
  if (!mode || !band) return deltas
  const children = (source.children ?? []).filter(
    (child) => child.box && child.box.width > 0 && child.box.height > 0,
  )
  if (children.length < 2 || (band.children ?? 0) < 2) return deltas
  const renderRows = band.rows ?? 1
  if (mode === "HORIZONTAL" && renderRows > 1) {
    deltas.push({
      path: "responsive.band.wrap",
      source: "one band",
      render: `${renderRows} lines`,
      severity: "delta",
    })
  } else if (mode === "VERTICAL" && renderRows === 1) {
    deltas.push({
      path: "responsive.band.stack",
      source: `a stack of ${children.length}`,
      render: "one line",
      severity: "delta",
    })
  }
  return deltas
}

// The composition signature the declared scope is verified with (RA5).
export function compositionSignature(probe: Probe): string {
  const entries = Object.entries(probe.subjects ?? {})
    .map(([key, value]) => [
      key,
      value.layout,
      value.childCount,
      Math.round((value.box?.height ?? 0) / 2),
      value.font?.size,
      value.font?.weight,
      value.gap,
      (value.padding ?? []).join("/"),
      value.visibleText,
      value.text?.slice(0, 40),
    ])
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
  const band = probe.responsive?.band
  return JSON.stringify([...entries, ["band", band?.rows, band?.children]])
}

// The declared scope is verified, not trusted (RA5, R4).
export function scopeDeltas({
  scope,
}: {
  scope?: { declared?: string; changed?: Record<string, boolean> }
}): Delta[] {
  const deltas: Delta[] = []
  if (!scope?.declared) return deltas
  const expected = scope.declared === "viewport" ? "viewport" : "rootWidth"
  if (!scope.changed?.[expected]) {
    deltas.push({
      path: `responsive.scope.${scope.declared}`,
      source: `${scope.declared} scope: the composition follows the ${scope.declared}`,
      render: `unchanged when only the ${scope.declared === "viewport" ? "viewport" : "root width"} moved`,
      severity: "delta",
    })
  }
  return deltas
}

// Compares one subject: geometry, box model, paint, type and the target rule.
export function compareSubject({
  key,
  source,
  render,
  subject = {},
  tolerance = TOLERANCE,
}: {
  key: string
  source?: SourceSubject
  render?: RenderSubject
  subject?: {
    compareBox?: boolean | "height" | "full"
    compareOffset?: boolean | string
    interactive?: boolean
    compareText?: boolean
  }
  tolerance?: number
}): Delta[] {
  const deltas: Delta[] = []
  if (!source) throw new Error(`${key}: no source spec`)
  if (!render) {
    push(deltas, key, "render", "present", "missing", "delta")
    return deltas
  }
  const note = (path: string, value: unknown): void => {
    deltas.push({ path: `${key}.${path}`, value, severity: "ok" })
  }
  const compareBox = subject.compareBox === true ? "height" : subject.compareBox
  const textSubject = source.type === "TEXT" && compareBox !== "full"

  if (source.box && render.box && (!textSubject || compareBox)) {
    const dimensions: Array<"width" | "height"> = textSubject ? ["height"] : ["width", "height"]
    for (const dimension of dimensions) {
      const delta = (render.box[dimension] ?? 0) - (source.box[dimension] ?? 0)
      if (Math.abs(delta) > tolerance) {
        push(deltas, key, `box.${dimension}`, source.box[dimension], render.box[dimension])
      } else {
        note(`box.${dimension}`, `${render.box[dimension]}px`)
      }
    }
  }
  const offsets = subject.compareOffset ? source.offset : undefined
  if (offsets && render.offset) {
    const axes: Array<"left" | "top"> = textSubject ? ["top"] : ["left", "top"]
    for (const axis of axes) {
      const expected = offsets[axis]
      const actual = render.offset[axis]
      if (expected == null || actual == null) continue
      if (Math.abs(actual - expected) > tolerance) {
        push(deltas, key, `offset.${axis}`, expected, actual, "advisory")
      } else {
        note(`offset.${axis}`, `${actual}px`)
      }
    }
  }
  if (subject.interactive) {
    const expansion = render.expansion
    const reach =
      (render.box?.height ?? 0) + Math.abs(expansion?.top ?? 0) + Math.abs(expansion?.bottom ?? 0)
    if (reach >= 44) note("target", `${reach}px`)
    else push(deltas, key, "target", ">=44px", `${reach}px`)
  }
  if (source.layout && render.padding && !textSubject) {
    const sourcePadding = source.layout.padding ?? []
    const verticalCentred =
      source.layout.mode === "VERTICAL"
        ? source.layout.align === "CENTER"
        : source.layout.counterAlign === "CENTER"
    const horizontalCentred =
      source.layout.mode === "HORIZONTAL"
        ? source.layout.align === "CENTER"
        : source.layout.counterAlign === "CENTER"
    const sameHeight =
      source.box && render.box && Math.abs(render.box.height - source.box.height) <= tolerance
    const sameWidth =
      source.box && render.box && Math.abs(render.box.width - source.box.width) <= tolerance
    for (const [position, edge] of ["top", "right", "bottom", "left"].entries()) {
      const expected = sourcePadding[position]
      const actual = render.padding[position]
      if (expected == null || actual == null) continue
      const centredEdge =
        edge === "top" || edge === "bottom"
          ? verticalCentred && sameHeight
          : horizontalCentred && sameWidth
      if (Math.abs(actual - expected) > tolerance) {
        if (centredEdge) {
          note(
            `padding.${edge}`,
            `centred content: computed ${actual}px against the source ${expected}px inset`,
          )
        } else {
          push(deltas, key, `padding.${edge}`, expected, actual)
        }
      } else {
        note(`padding.${edge}`, `${actual}px`)
      }
    }
    // A source HORIZONTAL layout spaces its children along the inline axis, a
    // VERTICAL one along the block axis: compare the matching CSS gap, not the
    // shorthand's first value (which is always the row gap).
    const renderGap =
      source.layout.mode === "HORIZONTAL"
        ? (render.columnGap ?? render.gap)
        : (render.rowGap ?? render.gap)
    if (source.layout.gap != null && renderGap != null) {
      if (Math.abs(renderGap - source.layout.gap) > tolerance) {
        if (render.childCount === 0) {
          note(
            "gap",
            `leaf element: the source ${source.layout.gap}px gap belongs to its container`,
          )
        } else {
          push(deltas, key, "gap", source.layout.gap, renderGap)
        }
      } else {
        note("gap", `${renderGap}px`)
      }
    }
  }
  if (!textSubject && source.radius != null && render.radius != null) {
    if (Math.abs(render.radius - source.radius) > tolerance) {
      push(deltas, key, "radius", source.radius, render.radius)
    } else {
      note("radius", `${render.radius}px`)
    }
  }
  const stroke = source.strokes?.[0]
  const renderBorder = renderStroke(render)
  if (stroke && renderBorder && !textSubject) {
    if (Math.abs(renderBorder.width - stroke.width) > tolerance) {
      push(deltas, key, "border.width", stroke.width, renderBorder.width)
    } else {
      note("border.width", `${renderBorder.width}px`)
    }
    if (stroke.color && hexOfColor(renderBorder.color) !== stroke.color.toLowerCase()) {
      push(deltas, key, "border.color", stroke.color, hexOfColor(renderBorder.color))
    } else if (stroke.color) {
      note("border.color", stroke.color)
    }
  }
  const fill = source.type === "TEXT" ? undefined : source.fills?.[0]
  if (fill && render.background) {
    if (/rgba?\([^)]*,\s*0\)$/.test(render.background)) {
      note("background", "transparent: the painted surface is the panel behind")
    } else if (hexOfColor(render.background) !== fill.toLowerCase()) {
      push(deltas, key, "background", fill, hexOfColor(render.background))
    } else {
      note("background", fill)
    }
  }
  if (source.text && render.font) {
    for (const metric of ["size", "lineHeight"] as const) {
      const expected = source.text[metric === "size" ? "fontSize" : "lineHeight"]
      if (expected == null) continue
      const actual = render.font[metric]
      if (actual == null) continue
      if (Math.abs(actual - expected) > tolerance) {
        push(deltas, key, `font.${metric}`, expected, actual)
      } else {
        note(`font.${metric}`, `${actual}px`)
      }
    }
    if (source.text.cssWeight != null && render.font.weight !== source.text.cssWeight) {
      push(deltas, key, "font.weight", source.text.cssWeight, render.font.weight)
    } else if (source.text.cssWeight != null) {
      note("font.weight", `${source.text.styleName} -> ${render.font.weight}`)
    }
    const sourceColor = source.text.color
    if (sourceColor && render.color) {
      if (hexOfColor(render.color) !== sourceColor.toLowerCase()) {
        push(deltas, key, "font.color", sourceColor, hexOfColor(render.color))
      } else {
        note("font.color", sourceColor)
      }
    }
    if (subject.compareText === true && source.text.characters && render.text) {
      const expected = source.text.characters.replace(/\s+/g, " ").trim()
      if (!render.text.startsWith(expected.slice(0, 40))) {
        push(deltas, key, "text", expected.slice(0, 60), render.text.slice(0, 60), "delta")
      }
    }
  }
  return deltas
}

// A residue may name a root delta by its bare property path (`gap`,
// `box.height`) or a nested subject by its own layer name (`Level 1.gap`). The
// root subject is always `field`, so a path that names no subject takes it.
function rootSubjectPath(path: string, subjects: Set<string>): string {
  if (path.startsWith("responsive.")) return path
  for (const name of subjects) {
    if (path === name || path.startsWith(`${name}.`)) return path
  }
  return `field.${path}`
}

// Splits the deltas into the recorded residues, the advisory ones and the ones
// that still need a fix, then classifies every numeric value against the token
// vocabulary.
export function classifyResults(
  deltas: Delta[],
  {
    residues = [],
    index = tokenIndex(),
    strict = false,
  }: {
    residues?: Array<{ path: string; reason: string }>
    index?: TokenIndex
    strict?: boolean
  } = {},
): {
  schemaVersion: number
  deltas: Delta[]
  advisories: Delta[]
  residues: Array<Delta & { reason: string }>
  notes: Array<{ path: string; note: unknown }>
  verdict: string
} {
  const reasons = new Map(residues.map((entry) => [entry.path, entry.reason]))
  const kept: Delta[] = []
  const recorded: Array<Delta & { reason: string }> = []
  const advisories: Delta[] = []
  const kindOf = (path: string): "radius" | "space" | "type" => {
    if (path.includes("radius")) return "radius"
    if (path.includes("offset.")) return "space"
    return "type"
  }
  for (const delta of deltas) {
    if (delta.severity === "ok") continue
    const reason = reasons.get(delta.path)
    const token =
      typeof delta.render === "number"
        ? classify(index, kindOf(delta.path), delta.render, TOLERANCE, {
            lineHeight: delta.lineHeight,
          })
        : undefined
    const entry: Delta = { ...delta, ...(token ? { token } : {}) }
    if (reason) recorded.push({ ...entry, reason })
    else if (delta.severity === "advisory" && !strict) advisories.push(entry)
    else kept.push(entry)
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    deltas: kept,
    advisories,
    residues: recorded,
    notes: deltas
      .filter((delta) => delta.severity === "ok")
      .map((delta) => ({ path: delta.path, note: delta.value })),
    verdict: kept.length
      ? "review-required"
      : recorded.length
        ? "verified-with-residues"
        : "verified",
  }
}

export function compare({
  sources,
  probe,
  subject = {},
  band,
  scope,
  tolerance = TOLERANCE,
  residues = [],
  index,
  strict = false,
}: {
  sources: Record<string, SourceSubject>
  probe: Probe
  subject?: Parameters<typeof compareSubject>[0]["subject"]
  band?: SourceSubject
  scope?: { declared?: string; changed?: Record<string, boolean> }
  tolerance?: number
  residues?: Array<{ path: string; reason: string }>
  index?: TokenIndex
  strict?: boolean
}) {
  const vocabulary = index ?? tokenIndex()
  const deltas: Delta[] = []
  for (const [key, source] of Object.entries(sources)) {
    deltas.push(
      ...compareSubject({
        key,
        source,
        render: probe.subjects?.[key],
        subject,
        tolerance,
      }),
    )
  }
  if (subject.compareOffset) {
    deltas.push(...compositionDeltas({ sources, probe, tolerance }))
  }
  deltas.push(...responsiveDeltas({ responsive: probe.responsive }))
  deltas.push(...bandDeltas({ source: band, responsive: probe.responsive }))
  deltas.push(...scopeDeltas({ scope }))
  const subjects = new Set(Object.keys(sources))
  const recorded = residues.map((entry) => ({
    ...entry,
    path: rootSubjectPath(entry.path, subjects),
  }))
  return classifyResults(deltas, { residues: recorded, index: vocabulary, strict })
}

function tokenSuffix(token: Delta["token"]): string {
  return token ? ` (${token.kind}${token.name ? `: ${token.name}` : ""})` : ""
}

export function formatResult(result: {
  verdict: string
  deltas: Delta[]
  advisories?: Delta[]
  residues: Array<Delta & { reason: string }>
}): string {
  const lines = [`verdict: ${result.verdict}`]
  for (const delta of result.deltas) {
    lines.push(
      `  DELTA ${delta.path}: source ${delta.source} render ${delta.render}${tokenSuffix(delta.token)}`,
    )
  }
  for (const advisory of result.advisories ?? []) {
    lines.push(
      `  ADVISORY ${advisory.path}: source ${advisory.source} render ${advisory.render}${tokenSuffix(
        advisory.token,
      )}`,
    )
  }
  for (const residue of result.residues) {
    lines.push(
      `  residue ${residue.path}: source ${residue.source} render ${residue.render} — ${residue.reason}`,
    )
  }
  return lines.join("\n")
}
