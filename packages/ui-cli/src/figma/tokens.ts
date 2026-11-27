#!/usr/bin/env node
// Figma design tokens — hermetic check and offline generation.
//
//   pnpm ui-cli update tokens --input .figma/variables-with-ids.json
//   pnpm ui-cli check tokens
//
// `--write` curates a pinned, read-only variable snapshot into the committed
// source of truth (packages/tokens/src/manifest.json) together with the reviewed
// foundation entries (packages/tokens/src/foundations.json), and regenerates the CSS
// foundation layer and the documentation inventory. `--check` never touches the
// network: it validates the manifest, re-emits both generated files and fails on
// any difference, and verifies every `var(--figma-*)` reference in src/index.css.
//
// Manifest schema 2 keys every token by its stable Figma identity — the
// published variable or style key the snapshot carries in its `ids` map. The
// name is a mutable label: a rename in Figma keeps the id, the CSS name and the
// text alias, and `--write` reports it as a delta instead of failing. When the
// snapshot has no ids, `--write` carries the previous id over by name and says
// how many entries it carried.
//
// The snapshot comes from a read-only export (Figma MCP get_variable_defs, its
// search assets, or the REST variables endpoint) and stays local, like
// .figma/live-rest.json. Canonical namespaces are the MUI Italia Next
// collections; every other known namespace is recorded as excluded with a
// reason, and unknown namespaces fail the refresh instead of being silently
// dropped.
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { formatJson, readJson, writeJson } from "../lib/json.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { cssDeclarations, normalizeValue } from "../checks/foundation-styles.ts"
import { report, type CheckReport } from "../checks/report.ts"
import { parseSchema } from "../lib/validate.ts"
import {
  FoundationsFileSchema,
  TokenManifestSchema,
  TokenSnapshotSchema,
  type FoundationEntry,
  type TokenEntry,
  type TokenSnapshot,
  TypographyValueSchema,
  EffectValueSchema,
} from "../schemas/tokens.ts"

interface TokenPaths {
  manifest: string
  foundations: string
  css: string
  tokensCss: string
  inventory: string
  semanticInventory: string
  dtcg: string
  textClasses: string
  styles: string
}

function tokenPaths(workspace: Workspace): TokenPaths {
  return {
    manifest: path.join(workspace.tokensRoot, "src/manifest.json"),
    foundations: path.join(workspace.tokensRoot, "src/foundations.json"),
    css: path.join(workspace.tokensRoot, "src/figma.generated.css"),
    tokensCss: path.join(workspace.tokensRoot, "src/tokens.generated.css"),
    inventory: path.join(workspace.tokensRoot, "src/figma-tokens.generated.ts"),
    semanticInventory: path.join(workspace.tokensRoot, "src/pui-tokens.generated.ts"),
    dtcg: path.join(workspace.tokensRoot, "src/tokens.dtcg.generated.json"),
    textClasses: path.join(workspace.tokensRoot, "src/figma-text-classes.generated.ts"),
    styles: path.join(workspace.root, "src/index.css"),
  }
}

function fileKeyFromWorkspace(workspace: Workspace): string {
  const file = workspace.path("src/catalog/figma/file.ts")
  const source = fs.readFileSync(file, "utf8")
  const match = source.match(/FIGMA_FILE_KEY\s*=\s*["']([^"']+)["']/)
  if (!match?.[1]) throw new Error("src/catalog/figma/file.ts must export a literal FIGMA_FILE_KEY")
  return match[1]
}

const CANONICAL_PREFIXES = [
  "Color/",
  "Headings/",
  "Heading/",
  "Body/",
  "Label & Caption/",
  "Foundations/",
  "Elevation/",
  "Shadow ",
]

const EXCLUDED_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^(?:Color\/)?Neutri\//, "legacy MUI Italia namespace (typo) superseded by Color/Neutrals/*"],
  [/^Text\//, "legacy MUI Italia namespace superseded by Color/Text/*"],
  [/^Button\//, "legacy MUI Italia namespace superseded by Color/Button/*"],
  [/^(?:Status |Surface\/|Blue IO\/)/, "legacy MUI Italia namespace without the Color/ prefix"],
  [/^Color\/Blue IO\//, "App IO library variable, not published by MUI Italia Next"],
  [/^\*NEW\*/, "draft variable outside the published collection"],
  [/^Grey\//, "legacy Material palette outside the MUI Italia collections"],
  [/^Background\//, "legacy alias superseded by Color/Surface/*"],
  [/^Common\//, "legacy alias superseded by Color/Neutrals/*"],
  [/^(?:XS Mobile|MD Tablet|LG Desktop)$/, "duplicate shorthand of Device/*"],
  [/^Device\//, "layout sizes, not runtime CSS tokens"],
  [/^radius-\d+$/, "shorthand duplicate of Foundations/radius-*"],
  [/^Shadow\//, "duplicate of Shadow 32"],
  [/^Android\//, "platform-specific library variable"],
  [/^Color\/Surface\/Surface skeleton opacity$/, "unresolved alias without a consumer"],
  [
    /^Color\/Opacity\/Black 35$/,
    "superseded by Color/Surface/Surface overlay (the documented 35% black overlay)",
  ],
  [
    /^Color\/Opacity\/Grey 850 (?:20|60)$/,
    "App IO library opacity variable, not published by MUI Italia Next",
  ],
  [
    /^Color\/Surface\/Surface Blu Italia 50$/,
    "Blu Italia brand surface, not consumed by the shipped components",
  ],
  [/^spacing\//, "component-specific float pending a consumer"],
]

// The source Titillio family is bundled directly from the pagopa/titillio
// repository (vendored at a pinned commit, unmodified). Figma's style weights
// (Semibold 500, Bold 600) stay mapped to the declared CSS weights of the
// bundled faces (Semibold 600, Bold 700) so every weight reference keeps its
// face; DM Mono is still not bundled and resolves to the platform stack.
const BUNDLED_FAMILIES: Record<string, string> = {
  Titillio: "Titillio",
  "DM Mono": "DM Mono (not bundled)",
}
const BUNDLED_WEIGHTS: Record<number, number> = { 400: 400, 500: 600, 600: 700 }

// Explicit css variable names where the generic derivation would be wrong or
// unreadable; the generic rule collapses repeated words across path segments.
// `Foundations/<name>` entries already shorten to `figma-<name>`.
const CSS_NAME_OVERRIDES: Record<string, string> = {
  "Color/Status Success/Succes 850": "figma-color-status-success-850",
  "Color/Icon/Active & Decorativy primary": "figma-color-icon-active-decorative-primary",
  "Foundations/radius-0": "figma-radius-0",
  "Foundations/radius-8": "figma-radius-8",
  "Foundations/radius-16": "figma-radius-16",
  "Foundations/radius-24": "figma-radius-24",
}

// Theme utility names for the typography scale (`text-<alias>`). Every
// typography variable needs an alias when it enters the manifest, and every
// alias in this policy must be assigned to exactly one variable. The alias is
// stored in the manifest, so it survives a rename.
// Exported for the CLI regression fixtures, which must mirror the policy.
export const TYPOGRAPHY_ALIASES: Record<string, string> = {
  "Headings/Hero": "hero",
  "Headings/H3": "h3",
  "Headings/H4": "h4",
  "Heading/XXL title": "title-xxl",
  "Heading/XL title": "title-xl",
  "Heading/LG title": "title-lg",
  "Heading/XXL title • Mobile": "title-xxl-mobile",
  "Heading/XL title • Mobile": "title-xl-mobile",
  "Heading/LG title • Mobile": "title-lg-mobile",
  "Heading/MD title": "title-md",
  "Heading/MD title • Mobile": "title-md-mobile",
  "Heading/SM title": "title-sm",
  "Heading/SM title • Mobile": "title-sm-mobile",
  "Heading/XS title": "title-xs",
  "Heading/XS title • Mobile": "title-xs-mobile",
  "Body/Body": "body",
  "Body/Body SB": "body-sb",
  "Body/Body Big SB": "body-big-sb",
  "Body/Body Small": "body-small",
  "Body/Link": "body-link",
  "Body/Mono": "mono",
  "Label & Caption/Label": "label",
  "Label & Caption/Label SB": "label-sb",
  "Label & Caption/Label Mini": "label-mini",
  "Label & Caption/Label Mini SB": "label-mini-sb",
  "Label & Caption/Label overline": "label-overline",
  "Label & Caption/Caption": "caption",
  "Label & Caption/Caption SB": "caption-sb",
  "Label & Caption/Caption uppercase": "caption-uppercase",
  "Label & Caption/Button": "button",
}

const FOUNDATION_CATEGORIES = [
  "spacing",
  "size",
  "breakpoint",
  "container",
  "z-index",
  "shadow",
  "radius",
]
const FOUNDATION_SOURCE_KINDS = ["node", "variable", "style", "snapshot", "code"]
const FOUNDATION_ORIGINS = ["figma-asset", "local-extension"]
const ID_KINDS = ["variable", "style", "name"]

type Manifest = z.infer<typeof TokenManifestSchema>
type ManifestEntry = TokenEntry | FoundationEntry
type TypographyValue = {
  family: string
  style: string
  size: number
  weight: number
  lineHeight: number
  lineHeightUnit: "pixels" | "multiplier"
  letterSpacing: number
}
function entryId(entry: ManifestEntry): string {
  return entry.id ?? entry.name
}

function entryCssName(entry: ManifestEntry): string {
  return entry.cssName ?? ""
}

function isTypographyEntry(
  entry: ManifestEntry,
): entry is TokenEntry & { type: "TYPOGRAPHY"; value: TypographyValue; alias: string } {
  return (
    entry.type === "TYPOGRAPHY" &&
    "alias" in entry &&
    typeof entry.alias === "string" &&
    TypographyValueSchema.safeParse(entry.value).success
  )
}

function isFoundationEntry(entry: ManifestEntry): entry is FoundationEntry {
  return "origin" in entry
}

// -------------------------------------------------------------------- main --

export function checkTokens(workspace: Workspace): CheckReport {
  try {
    const result = runTokens(workspace, "check")
    return report("tokens", result.message, [], { details: result.details })
  } catch (error) {
    return report("tokens", "the manifest and generated token files must agree", [messageOf(error)])
  }
}

export function updateTokens(workspace: Workspace, input: string): string {
  const result = runTokens(workspace, "write", input)
  return [result.message, ...result.details.map((line) => `  ${line}`)].join("\n")
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function runTokens(
  workspace: Workspace,
  mode: "check" | "write",
  input?: string,
): { message: string; details: string[] } {
  const paths = tokenPaths(workspace)
  const fileKey = fileKeyFromWorkspace(workspace)

  if (mode === "write") {
    if (!input) throw new Error("update tokens needs --input <snapshot>")
    const snapshot = parseSchema(TokenSnapshotSchema, readJson(input), "token snapshot")
    const foundations = readFoundations(paths)
    const { manifest, report: changes } = curatedManifest(snapshot, foundations, workspace, paths)
    validateManifest(manifest, fileKey)
    fs.mkdirSync(path.dirname(paths.manifest), { recursive: true })
    writeJson(paths.manifest, manifest)
    fs.writeFileSync(paths.css, emitCss(manifest))
    fs.writeFileSync(paths.inventory, emitInventory(manifest))
    fs.writeFileSync(paths.textClasses, emitTextClasses(manifest))
    for (const [file, content] of tokenContract(manifest, paths).files) {
      fs.writeFileSync(file, content)
    }
    const unresolved = Object.keys(snapshot.unresolved ?? {}).filter(
      (name) => !excludedReason(name),
    ).length
    return {
      message:
        `tokens update: ${Object.keys(manifest.variables).length} variables ` +
        `(excluded ${Object.keys(manifest.excluded).length}, unresolved ${unresolved}) ` +
        `+ ${Object.keys(manifest.foundations).length} foundations -> ${paths.css}`,
      details: changes,
    }
  }

  const manifest = parseSchema(TokenManifestSchema, readJson(paths.manifest), paths.manifest)
  validateManifest(manifest, fileKey)
  const contract = tokenContract(manifest, paths)
  for (const [file, expected] of [
    [paths.css, emitCss(manifest)],
    [paths.inventory, emitInventory(manifest)],
    [paths.textClasses, emitTextClasses(manifest)],
    ...contract.files,
  ]) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null
    if (current !== expected) {
      throw new Error(
        `${file} does not match the manifest — run "ui-cli update tokens --input <snapshot>"`,
      )
    }
  }
  const defined = new Set(allEntries(manifest).map((entry) => `--${entryCssName(entry)}`))
  const missing = styleReferences(paths).filter((reference) => !defined.has(reference))
  if (missing.length) {
    throw new Error(
      `${paths.styles} references tokens that the manifest does not define:\n` +
        missing.map((name) => `  ${name}`).join("\n"),
    )
  }
  const published = new Set(contract.tokens.map((token) => token.cssName))
  const unpublished = [
    ...new Set(
      [...fs.readFileSync(paths.styles, "utf8").matchAll(/var\(\s*(--pui-[a-z0-9-]+)/g)].map(
        (match) => match[1],
      ),
    ),
  ].filter((reference) => !published.has(reference))
  if (unpublished.length) {
    throw new Error(
      `${paths.styles} references semantic tokens that ${SEMANTIC_ROOT} does not declare:\n` +
        unpublished.map((name) => `  ${name}`).join("\n"),
    )
  }
  const counts: Record<string, number> = {}
  for (const entry of allEntries(manifest)) counts[entry.type] = (counts[entry.type] ?? 0) + 1
  return {
    message:
      `${Object.keys(manifest.variables).length} variables ` +
      `(excluded ${Object.keys(manifest.excluded).length}) ` +
      `+ ${Object.keys(manifest.foundations).length} foundations ` +
      `(${Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([type, count]) => `${type.toLowerCase()} ${count}`)
        .join(" · ")})`,
    details: [
      `check tokens: ${Object.keys(manifest.variables).length} variables ` +
        `(excluded ${Object.keys(manifest.excluded).length}) ` +
        `+ ${Object.keys(manifest.foundations).length} foundations`,
    ],
  }
}

// ------------------------------------------------------------------ parsing --

function parseColor(raw: string, name: string): string {
  const value = raw.trim().toLowerCase()
  if (!/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/.test(value)) {
    throw new Error(`${name}: unsupported color value ${raw}`)
  }
  return value
}

function parseFloat(raw: string, name: string): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new Error(`${name}: unsupported float value ${raw}`)
  return value
}

function parseTypography(raw: string, name: string): TypographyValue {
  const match =
    /^Font\(\s*family:\s*"([^"]+)",\s*style:\s*([^,]+),\s*size:\s*([\d.]+),\s*weight:\s*(\d+),\s*lineHeight:\s*([\d.]+),\s*letterSpacing:\s*(-?[\d.]+)\s*\)$/.exec(
      raw.trim(),
    )
  if (!match) throw new Error(`${name}: unsupported typography value ${raw}`)
  const [, family, style, size, weight, lineHeight, letterSpacing] = match
  const height = Number(lineHeight ?? 0)
  const pixels = Number(size ?? 0)
  return {
    family: family ?? "",
    style: (style ?? "").trim(),
    size: pixels,
    weight: Number(weight),
    // Figma stores percentage line heights (100) for a few styles; a height
    // that far exceeds the font size can only be a multiplier.
    lineHeight: height > pixels * 3 ? height / 100 : height,
    lineHeightUnit: height > pixels * 3 ? "multiplier" : "pixels",
    letterSpacing: Number(letterSpacing ?? 0),
  }
}

function parseEffect(raw: string, name: string): z.infer<typeof EffectValueSchema> {
  const effects = raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match =
        /^Effect\(\s*type:\s*(\w+),\s*color:\s*(#[0-9a-fA-F]{6,8}),\s*offset:\s*\((-?[\d.]+),\s*(-?[\d.]+)\),\s*radius:\s*([\d.]+),\s*spread:\s*(-?[\d.]+)\s*\)$/.exec(
          entry,
        )
      if (!match) throw new Error(`${name}: unsupported effect value ${entry}`)
      return {
        type: match[1],
        color: match[2].toLowerCase(),
        offset: { x: Number(match[3]), y: Number(match[4]) },
        radius: Number(match[5]),
        spread: Number(match[6]),
      }
    })
  if (!effects.length) throw new Error(`${name}: empty effect value`)
  return effects
}

function classify(
  raw: string,
  name: string,
): { type: TokenEntry["type"]; value: TokenEntry["value"] } {
  const value = raw.trim()
  if (value.startsWith("#")) return { type: "COLOR", value: parseColor(value, name) }
  if (value.startsWith("Font(")) return { type: "TYPOGRAPHY", value: parseTypography(value, name) }
  if (value.startsWith("Effect(")) return { type: "EFFECT", value: parseEffect(value, name) }
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return { type: "FLOAT", value: parseFloat(value, name) }
  throw new Error(`${name}: unsupported variable value ${raw}`)
}

function excludedReason(
  name: string,
  patterns: ReadonlyArray<readonly [RegExp, string]> = EXCLUDED_PATTERNS,
): string | null {
  for (const [pattern, reason] of patterns) if (pattern.test(name)) return reason
  return null
}

function isCanonical(name: string, prefixes: readonly string[] = CANONICAL_PREFIXES): boolean {
  return prefixes.some((prefix) => name.startsWith(prefix))
}

// --------------------------------------------------------------- derivation --

function cssNameFor(name: string): string {
  if (CSS_NAME_OVERRIDES[name]) return CSS_NAME_OVERRIDES[name]
  const base = name.startsWith("Foundations/") ? name.slice("Foundations/".length) : name
  const words: string[] = []
  for (const word of base.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word && words[words.length - 1] !== word) words.push(word)
  }
  return `figma-${words.join("-")}`
}

function trimNumber(value: number): string {
  return String(Number(value.toFixed(4)))
}

function rem(value: number): string {
  return `${trimNumber(value / 16)}rem`
}

function cssValue(token: ManifestEntry): string {
  if (token.type === "COLOR")
    return typeof token.value === "string" ? token.value : String(token.value)
  if (token.type === "FLOAT") {
    const numeric = typeof token.value === "number" ? token.value : Number(token.value)
    return isFoundationEntry(token) && token.category === "z-index"
      ? trimNumber(numeric)
      : `${trimNumber(numeric)}px`
  }
  if (token.type === "EFFECT" && Array.isArray(token.value)) {
    return EffectValueSchema.parse(token.value)
      .map(
        (effect) =>
          `${effect.type === "INNER_SHADOW" ? "inset " : ""}${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${effect.spread}px ${effect.color}`,
      )
      .join(", ")
  }
  throw new Error(`No direct css value for ${token.type}`)
}

// Keep the generated declarations stable under the repository formatter: over
// the 100 column budget, break after the colon like Prettier-style CSS.
function declaration(name: string, value: string): string[] {
  const single = `  --${name}: ${value};`
  if (single.length <= 100) return [single]
  return [`  --${name}:`, `    ${value};`]
}

function typographyLines(name: string, value: TypographyValue, alias: string): string[] {
  const mappedWeight = BUNDLED_WEIGHTS[value.weight]
  const lines = [
    `  /* ${name} — ${value.family} ${value.style} ${value.size}/${value.lineHeight}${value.lineHeightUnit === "multiplier" ? "×" : "px"} */`,
    `  --text-${alias}: ${rem(value.size)};`,
    `  --text-${alias}--line-height: ${
      value.lineHeightUnit === "multiplier" ? trimNumber(value.lineHeight) : rem(value.lineHeight)
    };`,
    `  --text-${alias}--font-weight: ${mappedWeight};`,
  ]
  if (value.letterSpacing)
    lines.push(`  --text-${alias}--letter-spacing: ${value.letterSpacing}px;`)
  return lines
}

function allEntries(manifest: Manifest): ManifestEntry[] {
  const entries: ManifestEntry[] = [
    ...Object.values(manifest.variables),
    ...Object.values(manifest.foundations),
  ]
  return entries.sort(
    (a, b) => a.name.localeCompare(b.name) || entryId(a).localeCompare(entryId(b)),
  )
}

function themeEntries(
  manifest: Manifest,
  category: FoundationEntry["category"],
): Array<FoundationEntry & { theme: NonNullable<FoundationEntry["theme"]> }> {
  return Object.values(manifest.foundations)
    .filter(
      (entry): entry is FoundationEntry & { theme: NonNullable<FoundationEntry["theme"]> } =>
        entry.category === category && entry.theme !== undefined,
    )
    .sort((a, b) => Number(a.value) - Number(b.value) || entryId(a).localeCompare(entryId(b)))
}

// The internal Figma layer: the `:root` custom properties of the manifest,
// without the Tailwind theme that follows them. `emitCss` starts with it, and
// the semantic block of `index.css` reads it; the published token contract
// resolves its own values, so a consumer never receives one of these names.
function primitiveRootLines(manifest: Manifest): string[] {
  const groups: Record<string, ManifestEntry[]> = {
    COLOR: [],
    FLOAT: [],
    EFFECT: [],
    TYPOGRAPHY: [],
  }
  for (const entry of allEntries(manifest)) groups[entry.type].push(entry)
  const lines = [":root {"]
  for (const entry of groups.COLOR) {
    lines.push(`  /* ${entry.name} */`, ...declaration(entryCssName(entry), cssValue(entry)))
  }
  if (groups.EFFECT.length) lines.push("")
  for (const entry of groups.EFFECT) {
    lines.push(`  /* ${entry.name} */`, ...declaration(entryCssName(entry), cssValue(entry)))
  }
  if (groups.FLOAT.length) lines.push("")
  for (const entry of groups.FLOAT) {
    lines.push(`  /* ${entry.name} */`, ...declaration(entryCssName(entry), cssValue(entry)))
  }
  lines.push("}")
  return lines
}

function tokenFileHeader(manifest: Manifest): string {
  return [
    "/* Generated by packages/ui-cli/src/figma/tokens.ts from packages/tokens/src/manifest.json — do not edit. */",
    `/* Figma file ${manifest.fileKey} tokens, synced ${manifest.syncedAt} (${manifest.source.method}). */`,
  ].join("\n")
}

export function emitRootCss(manifest: Manifest): string {
  return `${[tokenFileHeader(manifest), "", ...primitiveRootLines(manifest)].join("\n")}\n`
}

// -------------------------------------------------------- semantic contract --

// The public tokens are the custom properties of the UI root, published under
// one vendor-neutral namespace so a Figma rename can never move them: the
// declaration, not the Figma variable name, is the contract (ADR-0013). The
// block is the stylesheet's own, so the Figma references it carries stay
// validated against the manifest and the published value is generated from
// them rather than typed twice.
const SEMANTIC_ROOT = ".pagopa-ui-root"
const SEMANTIC_PREFIX = "--pui-"

export type SemanticTokenType = "color" | "dimension" | "shadow"

export type SemanticToken = {
  /** The published custom property: `--pui-<role>`. */
  cssName: string
  /** The role the name carries, without the namespace. */
  name: string
  type: SemanticTokenType
  /** The value the contract publishes, resolved through the manifest. */
  value: string
  /** The vendor-neutral value the DTCG projection carries. */
  dtcg: string
}

export function semanticTokens(
  manifest: Manifest,
  stylesheet: string,
  file: string,
): SemanticToken[] {
  const declarations = cssDeclarations(stylesheet).filter(
    (declaration) => declaration.context === SEMANTIC_ROOT && declaration.property.startsWith("--"),
  )
  if (!declarations.length) {
    throw new Error(`${file}: ${SEMANTIC_ROOT} declares no custom property to publish`)
  }
  const outside = declarations.filter((rule) => !rule.property.startsWith(SEMANTIC_PREFIX))
  if (outside.length) {
    throw new Error(
      `${file}: ${SEMANTIC_ROOT} publishes ${SEMANTIC_PREFIX}* only, so a Figma ` +
        `name cannot leak into the contract:\n` +
        outside.map((rule) => `  ${rule.property}`).join("\n"),
    )
  }
  const primitives = new Map(
    allEntries(manifest).map((entry) => [`--${entryCssName(entry)}`, entry] as const),
  )
  const seen = new Set<string>()
  return declarations.map((rule) => {
    if (seen.has(rule.property)) throw new Error(`${file}: ${rule.property} is declared twice`)
    seen.add(rule.property)
    const declaration = normalizeValue(rule.value)
    return {
      cssName: rule.property,
      name: rule.property.slice(SEMANTIC_PREFIX.length),
      type: semanticType(declaration, primitives),
      value: resolvedValue(declaration, primitives, rule.property),
      dtcg: dtcgValue(declaration),
    }
  })
}

function semanticType(value: string, primitives: Map<string, ManifestEntry>): SemanticTokenType {
  const reference = REFERENCE.exec(value)
  if (reference) {
    const entry = primitives.get(reference[1])
    if (!entry) throw new Error(`${value}: the contract has no token to take a type from`)
    if (entry.type === "COLOR") return "color"
    if (entry.type === "EFFECT") return "shadow"
    return "dimension"
  }
  if (/#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i.test(value))
    return "color"
  return "dimension"
}

// The public file stands alone: a host reads the contract without importing the
// internal primitive layer, so every Figma reference is resolved here.
function resolvedValue(
  value: string,
  primitives: Map<string, ManifestEntry>,
  cssName: string,
): string {
  return value.replace(/var\(\s*(--figma-[a-z0-9-]+)\s*\)/g, (_, name: string) => {
    const entry = primitives.get(name)
    if (!entry) throw new Error(`${cssName}: ${name} is not a generated token`)
    return cssValue(entry)
  })
}

function dtcgValue(value: string): string {
  return value
    .replace(/var\(\s*--figma-([a-z0-9-]+)\s*\)/g, "{primitives.$1}")
    .replace(/var\(\s*--pui-([a-z0-9-]+)\s*\)/g, "{pui.$1}")
}

// A value that is nothing but a reference has no type of its own: the token it
// points at decides. Anything else is classified from its syntax.
const REFERENCE = /^var\(\s*(--[a-z0-9-]+)\s*\)$/

// The contract is derived from the stylesheet on every run, in both modes: the
// semantic block is the reviewed source, the three generated files its
// projections.
function tokenContract(
  manifest: Manifest,
  paths: TokenPaths,
): { tokens: SemanticToken[]; files: [string, string][] } {
  const tokens = semanticTokens(manifest, fs.readFileSync(paths.styles, "utf8"), paths.styles)
  return {
    tokens,
    files: [
      [paths.tokensCss, emitContractCss(tokens)],
      [paths.semanticInventory, emitSemanticInventory(tokens)],
      [paths.dtcg, formatJson(emitDtcg(manifest, tokens))],
    ],
  }
}

export function emitContractCss(tokens: SemanticToken[]): string {
  const lines = [
    "/* Generated by packages/ui-cli/src/figma/tokens.ts from the semantic block of",
    "   packages/pagopa-ui/src/index.css — do not edit. */",
    "/* The public token contract: the --pui-* values a host reads and overrides.",
    "   They follow the role, so a Figma variable rename never moves them, and",
    "   every Figma reference is resolved here: the file stands alone, with no",
    "   internal primitive layer beside it. */",
    ":root {",
    ...tokens.flatMap((token) => declaration(token.cssName.slice(2), token.value)),
    "}",
  ]
  return `${lines.join("\n")}\n`
}

export function emitSemanticInventory(tokens: SemanticToken[]): string {
  const lines = [
    "// Generated by packages/ui-cli/src/figma/tokens.ts from the semantic block of",
    "// packages/pagopa-ui/src/index.css — do not edit.",
    'export type SemanticTokenType = "color" | "dimension" | "shadow"',
    "",
    // An interface, not a type alias: the workspace linter rewrites the one
    // into the other, and the committed projection must survive `lint --fix`.
    "export interface SemanticToken {",
    "  cssName: string",
    "  name: string",
    "  type: SemanticTokenType",
    "  value: string",
    "  dtcg: string",
    "}",
    "",
    "export const semanticTokens: SemanticToken[] = [",
  ]
  for (const token of tokens) {
    lines.push("  {")
    lines.push(`    cssName: ${JSON.stringify(token.cssName)},`)
    lines.push(`    name: ${JSON.stringify(token.name)},`)
    lines.push(`    type: ${JSON.stringify(token.type)},`)
    lines.push(`    value: ${JSON.stringify(token.value)},`)
    lines.push(`    dtcg: ${JSON.stringify(token.dtcg)},`)
    lines.push("  },")
  }
  lines.push("]", "")
  return lines.join("\n")
}

export function emitDtcg(manifest: Manifest, tokens: SemanticToken[]): unknown {
  const pui: Record<string, { $type: string; $value: string }> = {}
  for (const token of tokens) pui[token.name] = { $type: token.type, $value: token.dtcg }
  const primitives: Record<string, { $type: string; $value: string }> = {}
  const rows = new Map(
    allEntries(manifest).map((entry) => [`--${entryCssName(entry)}`, entry] as const),
  )
  for (const token of tokens) {
    for (const match of token.dtcg.matchAll(/\{primitives\.([a-z0-9-]+)\}/g)) {
      const entry = rows.get(`--figma-${match[1]}`)
      if (!entry) throw new Error(`${token.cssName}: no primitive ${match[1]} to publish`)
      primitives[match[1]] = {
        $type: DTCG_TYPES[entry.type],
        $value: cssValue(entry),
      }
    }
  }
  return { $description: DTCG_DESCRIPTION, primitives, pui }
}

const DTCG_TYPES: Record<string, string> = {
  COLOR: "color",
  FLOAT: "dimension",
  EFFECT: "shadow",
  TYPOGRAPHY: "typography",
}

const DTCG_DESCRIPTION =
  "The pagopa/ui token contract in Design Tokens Community Group format. " +
  "`pui` is the public semantic layer, `primitives` the internal Figma-backed " +
  "values it resolves to."

function emitCss(manifest: Manifest): string {
  const entries = allEntries(manifest)
  const lines = [emitRootCss(manifest), "@theme {"]
  const typography = entries.filter(isTypographyEntry)
  typography.forEach((entry, index) => {
    lines.push(...typographyLines(entry.name, entry.value, entry.alias))
    if (index < typography.length - 1) lines.push("")
  })
  const radii = entries
    .filter((entry) => /^Foundations\/radius-(\d+)$/.test(entry.name))
    .sort(
      (a, b) =>
        Number(a.name.split("-").pop()) - Number(b.name.split("-").pop()) ||
        entryId(a).localeCompare(entryId(b)),
    )
  if (radii.length) {
    lines.push("")
    for (const entry of radii)
      lines.push(`  --radius-${entry.name.split("-").pop()}: var(--${entryCssName(entry)});`)
  }
  const spacing = themeEntries(manifest, "spacing").filter((entry) => /^\d+$/.test(entry.theme.key))
  if (spacing.length) {
    lines.push("")
    for (const entry of spacing) {
      lines.push(`  /* ${entry.name} — ${trimNumber(Number(entry.value))}px */`)
      lines.push(`  --spacing-${entry.theme.key}: ${rem(Number(entry.value))};`)
    }
  }
  for (const [category, namespace] of [
    ["breakpoint", "breakpoint"],
    ["container", "container"],
    ["z-index", "z-index"],
  ] as const) {
    const entriesForCategory = themeEntries(manifest, category)
    if (!entriesForCategory.length) continue
    lines.push("")
    // Tailwind ships its own viewport scale; the theme keeps the Figma
    // breakpoints only.
    if (category === "breakpoint") lines.push("  --breakpoint-*: initial;")
    for (const entry of entriesForCategory) {
      lines.push(
        `  /* ${entry.name} — ${trimNumber(Number(entry.value))}${category === "z-index" ? "" : "px"} */`,
      )
      const value = category === "z-index" ? String(entry.value) : rem(Number(entry.value))
      lines.push(`  --${namespace}-${entry.theme.key}: ${value};`)
    }
  }
  lines.push("}", "")
  return lines.join("\n")
}

type TokenRow = {
  id: string
  name: string
  type: string
  cssName: string
  value: string
  category?: string
  detail?: string
  fontSize?: string
  lineHeight?: string
  fontWeight?: number
  letterSpacing?: string
}

function emitInventory(manifest: Manifest): string {
  const rows: TokenRow[] = allEntries(manifest).map((entry) => {
    if (isTypographyEntry(entry)) {
      const value = entry.value
      const mappedWeight = BUNDLED_WEIGHTS[value.weight]
      const row: TokenRow = {
        id: entryId(entry),
        name: entry.name,
        type: entry.type,
        cssName: `text-${entry.alias}`,
        value: `${value.size}/${value.lineHeight}${value.lineHeightUnit === "multiplier" ? "×" : "px"}`,
        detail: `${BUNDLED_FAMILIES[value.family] ?? value.family} ${value.style} · Figma weight ${value.weight} → ${mappedWeight}`,
        fontSize: rem(value.size),
        lineHeight:
          value.lineHeightUnit === "multiplier"
            ? trimNumber(value.lineHeight)
            : rem(value.lineHeight),
        fontWeight: mappedWeight,
      }
      if (value.letterSpacing) row.letterSpacing = `${value.letterSpacing}px`
      if (isFoundationEntry(entry)) row.category = entry.category
      return row
    }
    const row: TokenRow = {
      id: entryId(entry),
      name: entry.name,
      type: entry.type,
      cssName: `--${entryCssName(entry)}`,
      value: cssValue(entry),
    }
    if (isFoundationEntry(entry)) row.category = entry.category
    return row
  })
  const lines = [
    "// Generated by packages/ui-cli/src/figma/tokens.ts from packages/tokens/src/manifest.json — do not edit.",
    'export type FigmaTokenType = "COLOR" | "FLOAT" | "EFFECT" | "TYPOGRAPHY"',
    "",
    "export type FigmaToken = {",
    "  id: string",
    "  name: string",
    "  type: FigmaTokenType",
    "  cssName: string",
    "  value: string",
    "  category?: string",
    "  detail?: string",
    "  fontSize?: string",
    "  lineHeight?: string",
    "  fontWeight?: number",
    "  letterSpacing?: string",
    "}",
    "",
    "export const figmaTokenSource = {",
    `  fileKey: ${JSON.stringify(manifest.fileKey)},`,
    `  syncedAt: ${JSON.stringify(manifest.syncedAt)},`,
    `  method: ${JSON.stringify(manifest.source.method)},`,
    "}",
    "",
    "export const figmaTokens: FigmaToken[] = [",
  ]
  for (const row of rows) {
    lines.push("  {")
    lines.push(`    id: ${JSON.stringify(row.id)},`)
    lines.push(`    name: ${JSON.stringify(row.name)},`)
    lines.push(`    type: ${JSON.stringify(row.type)},`)
    lines.push(`    cssName: ${JSON.stringify(row.cssName)},`)
    lines.push(`    value: ${JSON.stringify(row.value)},`)
    if (row.category) lines.push(`    category: ${JSON.stringify(row.category)},`)
    if (row.detail) lines.push(`    detail: ${JSON.stringify(row.detail)},`)
    if (row.fontSize) lines.push(`    fontSize: ${JSON.stringify(row.fontSize)},`)
    if (row.lineHeight) lines.push(`    lineHeight: ${JSON.stringify(row.lineHeight)},`)
    if (row.fontWeight) lines.push(`    fontWeight: ${row.fontWeight},`)
    if (row.letterSpacing) lines.push(`    letterSpacing: ${JSON.stringify(row.letterSpacing)},`)
    lines.push("  },")
  }
  lines.push("]", "")
  return lines.join("\n")
}

function emitTextClasses(manifest: Manifest): string {
  const classes = Object.values(manifest.variables)
    .filter((entry) => entry.type === "TYPOGRAPHY")
    .map((entry) => `text-${entry.alias}`)
    .sort()
  return [
    "// Generated by packages/ui-cli/src/figma/tokens.ts from packages/tokens/src/manifest.json — do not edit.",
    "// The configured cn engine must know these classes as font sizes; otherwise",
    "// it treats them as text colors and drops them in conflicts (src/lib/cn.ts).",
    "export const figmaTextClasses: string[] = [",
    ...classes.map((className) => `  ${JSON.stringify(className)},`),
    "]",
    "",
  ].join("\n")
}

// ------------------------------------------------------------- validation --

function readFoundations(paths: TokenPaths): z.infer<typeof FoundationsFileSchema> {
  return parseSchema(FoundationsFileSchema, readJson(paths.foundations), paths.foundations)
}

type PriorToken = {
  id?: string
  name?: string
  idKind?: string
  idLibrary?: string | null
  cssName?: string
  alias?: string
}

const PreviousManifestSchema = z.looseObject({
  schemaVersion: z.number(),
  variables: z
    .record(
      z.string(),
      z.looseObject({
        id: z.string().optional(),
        name: z.string().optional(),
        idKind: z.string().optional(),
        idLibrary: z.string().nullable().optional(),
        cssName: z.string().optional(),
        alias: z.string().optional(),
      }),
    )
    .optional(),
})

function previousManifest(manifestPath: string): {
  byId: Map<string, PriorToken>
  byName: Map<string, PriorToken>
} {
  if (!fs.existsSync(manifestPath)) {
    return { byId: new Map(), byName: new Map() }
  }
  const previous = parseSchema(PreviousManifestSchema, readJson(manifestPath), manifestPath)
  const byId = new Map<string, PriorToken>()
  const byName = new Map<string, PriorToken>()
  if (previous.schemaVersion === 1) {
    for (const [name, token] of Object.entries(previous.variables ?? {})) {
      byName.set(name, { ...token, name })
    }
  } else {
    for (const [id, token] of Object.entries(previous.variables ?? {})) {
      byId.set(id, token)
      if (token.name) byName.set(token.name, token)
    }
  }
  return { byId, byName }
}

type ManifestCuration = {
  variables: Record<string, TokenEntry>
  excluded: Record<string, string>
  unmapped: string[]
  report: string[]
  carried: number
  synthetic: number
  unresolvedIds: number
  renamed: number
  relinked: number
}

function emptyCuration(): ManifestCuration {
  return {
    variables: {},
    excluded: {},
    unmapped: [],
    report: [],
    carried: 0,
    synthetic: 0,
    unresolvedIds: 0,
    renamed: 0,
    relinked: 0,
  }
}

function curateVariable(
  name: string,
  raw: unknown,
  ids: NonNullable<TokenSnapshot["ids"]>,
  byId: Map<string, PriorToken>,
  byName: Map<string, PriorToken>,
  state: ManifestCuration,
): void {
  const reason = excludedReason(name)
  if (reason) {
    state.excluded[name] = reason
    return
  }
  if (!isCanonical(name)) {
    state.unmapped.push(name)
    return
  }
  const info = ids[name]
  const incomingId =
    typeof info === "string"
      ? info
      : info && typeof info === "object" && "key" in info && typeof info.key === "string"
        ? info.key
        : null
  const prior = (incomingId && byId.get(incomingId)) || byName.get(name)
  const id = incomingId ?? prior?.id ?? `local:${name}`
  if (incomingId && prior?.id && prior.id !== incomingId) {
    state.relinked++
    state.report.push(`relinked ${name}: ${prior.id} -> ${incomingId}`)
  } else if (!incomingId && prior?.id && !prior.id.startsWith("local:")) state.carried++
  else if (!incomingId && prior?.id) state.unresolvedIds++
  else if (!incomingId) {
    state.synthetic++
    state.report.push(`no stable id for ${name}: recorded as ${id}`)
  }
  if (incomingId && prior && prior.name !== name) {
    state.renamed++
    state.report.push(`renamed ${prior.name} -> ${name} (${id})`)
  }
  if (typeof raw !== "string") throw new Error(`${name}: unsupported variable value`)
  const token = classify(raw, name)
  const alias = prior?.alias ?? TYPOGRAPHY_ALIASES[name]
  if (token.type === "TYPOGRAPHY" && !alias)
    throw new Error(`${name}: missing text-* alias for the typography scale`)
  state.variables[id] = {
    id,
    idKind: parseSchema(
      z.enum(["variable", "style", "name"]),
      (info && typeof info === "object" && "kind" in info && typeof info.kind === "string"
        ? info.kind
        : undefined) ??
        prior?.idKind ??
        (incomingId ? "variable" : "name"),
      `${name}: idKind`,
    ),
    idLibrary:
      (info && typeof info === "object" && "library" in info && typeof info.library === "string"
        ? info.library
        : undefined) ??
      prior?.idLibrary ??
      null,
    name,
    type: token.type,
    value: token.value,
    cssName: prior?.cssName ?? cssNameFor(name),
    ...(alias ? { alias } : {}),
  }
}

function validateUnresolved(snapshot: TokenSnapshot, state: ManifestCuration): void {
  if (state.unmapped.length) {
    throw new Error(
      `Unmapped variable namespaces (${state.unmapped.length}) — extend the canonical prefixes or the exclusion patterns:\n` +
        state.unmapped.map((name) => `  ${name}`).join("\n"),
    )
  }
  const unresolved: string[] = []
  for (const name of Object.keys(snapshot.unresolved ?? {})) {
    const reason = excludedReason(name)
    if (reason) state.excluded[name] = reason
    else unresolved.push(name)
  }
  if (unresolved.length) {
    throw new Error(
      `Unresolved variables without a curation policy (${unresolved.length}) — resolve them in the snapshot or add a reasoned exclusion pattern:\n` +
        unresolved.map((name) => `  ${name}`).join("\n"),
    )
  }
}

function appendCurationSummary(state: ManifestCuration, byId: Map<string, PriorToken>): void {
  const seen = new Set(Object.keys(state.variables))
  const seenNames = new Set(Object.values(state.variables).map((entry) => entry.name))
  const removed = [...byId.keys()].filter(
    (id) => !seen.has(id) && !seenNames.has(byId.get(id)?.name ?? ""),
  )
  if (removed.length)
    state.report.push(
      `removed ${removed.length}: ` +
        removed
          .map((id) => byId.get(id)?.name ?? id)
          .slice(0, 6)
          .join(", ") +
        (removed.length > 6 ? ", …" : ""),
    )
  if (state.carried)
    state.report.push(
      `${state.carried} ids carried over by name — export the variables with a figma id map to make renames explicit`,
    )
  if (state.synthetic) state.report.push(`${state.synthetic} entries without a stable id`)
  if (state.unresolvedIds)
    state.report.push(
      `${state.unresolvedIds} entries have no published id — their key stays local:<name>`,
    )
  if (state.renamed)
    state.report.push(`${state.renamed} renames recorded — the id, the css name and the alias stay`)
  if (state.relinked) state.report.push(`${state.relinked} entries relinked to their published key`)
}

function curatedManifest(
  snapshot: TokenSnapshot,
  foundationsSource: z.infer<typeof FoundationsFileSchema>,
  workspace: Workspace,
  paths: TokenPaths,
): { manifest: Manifest; report: string[] } {
  const fileKey = fileKeyFromWorkspace(workspace)
  if (snapshot.fileKey && snapshot.fileKey !== fileKey)
    throw new Error("The variable snapshot belongs to a different Figma file")
  const { byId, byName } = previousManifest(paths.manifest)
  const state = emptyCuration()
  for (const [name, raw] of Object.entries(snapshot.variables ?? {})) {
    curateVariable(name, raw, snapshot.ids ?? {}, byId, byName, state)
  }
  validateUnresolved(snapshot, state)
  appendCurationSummary(state, byId)
  return buildCuratedManifest(snapshot, foundationsSource, fileKey, paths, state)
}

function buildCuratedManifest(
  snapshot: TokenSnapshot,
  foundationsSource: z.infer<typeof FoundationsFileSchema>,
  fileKey: string,
  paths: TokenPaths,
  state: ManifestCuration,
): { manifest: Manifest; report: string[] } {
  const foundations: Record<string, FoundationEntry> = {}
  for (const [id, entry] of Object.entries(foundationsSource.entries))
    foundations[id] = { ...entry, id, cssName: cssNameFor(entry.name) }
  const sort = <T>(record: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)))
  const manifest = parseSchema(
    TokenManifestSchema,
    {
      schemaVersion: 2,
      fileKey,
      syncedAt: snapshot.syncedAt ?? new Date().toISOString().slice(0, 10),
      source: snapshot.source ?? { method: "unknown" },
      variables: sort(state.variables),
      foundations: sort(foundations),
      excluded: sort(state.excluded),
    },
    paths.manifest,
  )
  return { manifest, report: state.report }
}

function validateEffectList(value: unknown, name: string): void {
  const parsed = EffectValueSchema.safeParse(value)
  if (!parsed.success || !parsed.data.length) {
    throw new Error(`${name}: effect values must be a nonempty list`)
  }
  for (const effect of parsed.data) {
    if (
      typeof effect?.type !== "string" ||
      !effect.type ||
      parseColor(effect.color ?? "", name) !== effect.color ||
      !Number.isFinite(effect.offset?.x) ||
      !Number.isFinite(effect.offset?.y) ||
      !Number.isFinite(effect.radius) ||
      !Number.isFinite(effect.spread)
    ) {
      throw new Error(`${name}: invalid effect entry`)
    }
  }
}

function validateFoundationEntry(
  id: string,
  entry: FoundationEntry,
  cssNames: Map<string, string>,
): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error(`${id}: foundation ids are kebab-case`)
  }
  if (entry.id !== id) throw new Error(`${id}: the entry key and its id must match`)
  if (!FOUNDATION_CATEGORIES.includes(entry.category)) {
    throw new Error(`${id}: unknown foundation category ${entry.category}`)
  }
  if (!FOUNDATION_ORIGINS.includes(entry.origin)) {
    throw new Error(`${id}: origin must be figma-asset or local-extension`)
  }
  if (!entry.source || !FOUNDATION_SOURCE_KINDS.includes(entry.source.kind)) {
    throw new Error(`${id}: a source of kind ${FOUNDATION_SOURCE_KINDS.join("/")} is required`)
  }
  if (!entry.source.note) throw new Error(`${id}: the source requires a note`)
  if (entry.origin === "local-extension" && !entry.reason) {
    throw new Error(`${id}: a local extension requires a reason`)
  }
  if (entry.origin === "figma-asset" && !entry.source.ref) {
    throw new Error(`${id}: a figma-asset source requires the published key in source.ref`)
  }
  if (
    typeof entry.name !== "string" ||
    !(entry.name.startsWith("Foundations/") || isCanonical(entry.name))
  ) {
    throw new Error(`${id}: foundations live under Foundations/ or a canonical namespace`)
  }
  if (entry.type === "FLOAT") {
    if (!Number.isFinite(entry.value)) throw new Error(`${id}: float values must be finite numbers`)
  } else if (entry.type === "EFFECT") {
    validateEffectList(entry.value, id)
  } else {
    throw new Error(`${id}: foundations are FLOAT or EFFECT values`)
  }
  if (entry.category === "spacing") {
    if (entry.theme?.namespace !== "spacing" || typeof entry.theme.key !== "string") {
      throw new Error(`${id}: a spacing entry requires theme {namespace: "spacing", key}`)
    }
  }
  if (["breakpoint", "container", "z-index"].includes(entry.category)) {
    if (entry.theme?.namespace !== entry.category || typeof entry.theme.key !== "string") {
      throw new Error(
        `${id}: a ${entry.category} entry requires theme {namespace: "${entry.category}", key}`,
      )
    }
  }
  if (entry.category === "radius" && !/^Foundations\/radius-\d+(?:\.\d+)?$/.test(entry.name)) {
    throw new Error(`${id}: radius entries are named Foundations/radius-<value>`)
  }
  if (entry.category === "shadow" && entry.type !== "EFFECT") {
    throw new Error(`${id}: shadow entries are EFFECT values`)
  }
  if (cssNames.has(entryCssName(entry)))
    throw new Error(`Duplicate css name ${entryCssName(entry)} — fix the name`)
  cssNames.set(entryCssName(entry), id)
}

function validateManifest(manifest: Manifest, fileKey: string): void {
  if (manifest.schemaVersion !== 2) throw new Error("Unsupported manifest schema version")
  if (manifest.fileKey !== fileKey) {
    throw new Error("The manifest does not belong to the configured Figma file")
  }
  if (typeof manifest.syncedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.syncedAt)) {
    throw new Error("The manifest requires an ISO syncedAt date")
  }
  const cssNames = new Map()
  const aliases = new Map()
  for (const [id, token] of Object.entries(manifest.variables)) {
    if (token.id !== id) throw new Error(`${id}: the entry key and its id must match`)
    if (typeof token.name !== "string" || !token.name) throw new Error(`${id}: a name is required`)
    if (!isCanonical(token.name))
      throw new Error(`${token.name}: non-canonical variable in the manifest`)
    if (!ID_KINDS.includes(token.idKind)) {
      throw new Error(`${id}: idKind must be one of ${ID_KINDS.join("/")}`)
    }
    if (token.idKind === "name" && !id.startsWith("local:")) {
      throw new Error(`${id}: an entry without a published id is keyed as local:<name>`)
    }
    if (typeof token.cssName !== "string" || !/^[a-z0-9-]+$/.test(token.cssName)) {
      throw new Error(`${token.name}: invalid cssName`)
    }
    if (cssNames.has(token.cssName)) throw new Error(`Duplicate css name ${token.cssName}`)
    cssNames.set(token.cssName, id)
    if (token.type === "COLOR") {
      if (typeof token.value !== "string" || parseColor(token.value, token.name) !== token.value) {
        throw new Error(`${token.name}: color values must be stored normalized`)
      }
    } else if (token.type === "FLOAT") {
      if (typeof token.value !== "number" || !Number.isFinite(token.value)) {
        throw new Error(`${token.name}: float values must be finite numbers`)
      }
    } else if (token.type === "EFFECT") {
      validateEffectList(token.value, token.name)
    } else if (token.type === "TYPOGRAPHY") {
      const parsed = TypographyValueSchema.safeParse(token.value)
      if (!parsed.success) throw new Error(`${token.name}: invalid typography value`)
      const value = parsed.data
      if (!BUNDLED_WEIGHTS[value.weight]) {
        throw new Error(`${token.name}: map the Figma weight ${value.weight} to a bundled weight`)
      }
      const known = new Set(Object.values(TYPOGRAPHY_ALIASES))
      if (!token.alias || !known.has(token.alias)) {
        throw new Error(`${token.name}: missing text-* alias for the typography scale`)
      }
      if (aliases.has(token.alias)) throw new Error(`Duplicate text-* alias "${token.alias}"`)
      aliases.set(token.alias, token.name)
    } else {
      throw new Error(`${token.name}: unsupported token type ${token.type}`)
    }
  }
  for (const [id, entry] of Object.entries(manifest.foundations ?? {})) {
    validateFoundationEntry(id, entry, cssNames)
  }
  for (const alias of Object.values(TYPOGRAPHY_ALIASES)) {
    if (!aliases.has(alias)) throw new Error(`stale typography alias "${alias}"`)
  }
  for (const name of Object.keys(manifest.excluded ?? {})) {
    if (!manifest.excluded[name]) throw new Error(`${name}: exclusion requires a reason`)
    if (!excludedReason(name)) {
      throw new Error(`${name}: excluded without a matching pattern`)
    }
  }
}

function styleReferences(paths: TokenPaths): string[] {
  const source = fs.readFileSync(paths.styles, "utf8")
  if (!source.includes('@import "pagopa-ui-tokens/figma.generated.css";')) {
    throw new Error(`${paths.styles}: missing the generated tokens import`)
  }
  return [...new Set([...source.matchAll(/var\((--figma-[a-z0-9-]+)/g)].map((match) => match[1]))]
}

// ---------------------------------------------------------------- drift --

export type TokenDriftEntry = { id: string; name: string; type: string; value: unknown }
export type TokenDriftChange = { id: string; name: string; from: unknown; to: unknown }
export type TokenDriftRename = { id: string; from: string; to: string }

export type TokenDrift = {
  added: TokenDriftEntry[]
  changed: TokenDriftChange[]
  renamed: TokenDriftRename[]
  removed: { id: string; name: string }[]
  /** Names outside the canonical namespaces: a live variable nobody curated. */
  unmapped: string[]
  /** Values the manifest cannot express, with the reason the curation gave. */
  unreadable: string[]
}

/** The committed manifest, or nothing when the package has not pinned one yet. */
export function readTokenManifest(workspace: Workspace): Manifest | null {
  const file = tokenPaths(workspace).manifest
  if (!fs.existsSync(file)) return null
  return parseSchema(TokenManifestSchema, readJson(file), file)
}

const sameTokenValue = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * The variables a live read carries, compared with the committed manifest
 * through the same curation `update tokens` runs: the exclusion patterns and
 * the canonical namespaces decide what is a token, the id — not the name —
 * decides identity, and a rename keeps the id and the css name. An entry lands
 * in one vector: a renamed variable is not also reported as changed, because
 * the next run compares its value under the new name.
 */
export function compareTokenDrift(manifest: Manifest | null, snapshot: TokenSnapshot): TokenDrift {
  const committed = manifest?.variables ?? {}
  const byId = new Map<string, PriorToken>()
  const byName = new Map<string, PriorToken>()
  for (const [id, entry] of Object.entries(committed)) {
    byId.set(id, entry)
    byName.set(entry.name, entry)
  }
  const state = emptyCuration()
  const unreadable: string[] = []
  for (const [name, raw] of Object.entries(snapshot.variables ?? {})) {
    try {
      curateVariable(name, raw, snapshot.ids ?? {}, byId, byName, state)
    } catch (error) {
      unreadable.push(`${name}: ${messageOf(error)}`)
    }
  }
  const live = state.variables
  const liveNames = new Set(Object.values(live).map((entry) => entry.name))
  const added: TokenDriftEntry[] = []
  const changed: TokenDriftChange[] = []
  const renamed: TokenDriftRename[] = []
  for (const [id, entry] of Object.entries(live)) {
    // A live read without a published key falls back to `local:<name>`; the
    // committed name is what says the two are the same variable.
    const prior = committed[id] ?? byName.get(entry.name)
    if (!prior) {
      added.push({ id, name: entry.name, type: entry.type, value: entry.value })
      continue
    }
    if (prior.name !== entry.name) {
      renamed.push({ id: prior.id ?? id, from: prior.name, to: entry.name })
      continue
    }
    if (prior.type !== entry.type || !sameTokenValue(prior.value, entry.value))
      changed.push({ id: prior.id ?? id, name: entry.name, from: prior.value, to: entry.value })
  }
  const liveIds = new Set(Object.keys(live))
  const removed = Object.entries(committed)
    .filter(([id, entry]) => !liveIds.has(id) && !liveNames.has(entry.name))
    .map(([id, entry]) => ({ id, name: entry.name }))
  const sortBy = <T>(entries: T[], label: (entry: T) => string): T[] =>
    [...entries].sort((a, b) => label(a).localeCompare(label(b)))
  return {
    added: sortBy(added, (entry) => entry.name),
    changed: sortBy(changed, (entry) => entry.name),
    renamed: sortBy(renamed, (entry) => entry.from),
    removed: sortBy(removed, (entry) => entry.name),
    unmapped: [...state.unmapped].sort(),
    unreadable: [...unreadable].sort(),
  }
}

export function tokenDriftCount(drift: TokenDrift): number {
  return (
    drift.added.length +
    drift.changed.length +
    drift.renamed.length +
    drift.removed.length +
    drift.unmapped.length +
    drift.unreadable.length
  )
}

const describeValue = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value ?? null)

/** The run's report: one count line, then one line per variable that moved. */
export function formatTokenDrift(drift: TokenDrift): string[] {
  if (!tokenDriftCount(drift))
    return ["token drift: none — the variables match the committed manifest"]
  const counts = [
    ["added", drift.added.length],
    ["changed", drift.changed.length],
    ["renamed", drift.renamed.length],
    ["removed", drift.removed.length],
  ]
    .filter(([, count]) => count)
    .map(([label, count]) => `${count} ${label}`)
    .join(", ")
  const lines = [`token drift: ${counts}`]
  for (const entry of drift.added)
    lines.push(`  added ${entry.name} (${entry.id}) = ${describeValue(entry.value)}`)
  for (const change of drift.changed)
    lines.push(
      `  changed ${change.name}: ${describeValue(change.from)} -> ${describeValue(change.to)}`,
    )
  for (const rename of drift.renamed)
    lines.push(`  renamed ${rename.from} -> ${rename.to} (${rename.id})`)
  for (const entry of drift.removed) lines.push(`  removed ${entry.name} (${entry.id})`)
  if (drift.unmapped.length) lines.push(`  unmapped: ${drift.unmapped.join(", ")}`)
  if (drift.unreadable.length) lines.push(`  unreadable: ${drift.unreadable.join(", ")}`)
  return lines
}
