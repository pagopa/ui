import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { sha256 } from "../lib/hash.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { report, type CheckReport } from "../checks/report.ts"
import { readJson } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import { IconManifestSchema, type IconManifestEntry } from "../schemas/artwork.ts"
import { RegistrySchema, type LocalAsset, type Registry } from "../schemas/catalogue.ts"
import { resolveProvenance } from "./asset-provenance.ts"
import { requireBulkRule, selectRuleNodes } from "./artwork/catalogue.ts"
import { assertGeneratedModule, propertyKey } from "./artwork/generate-module.ts"
import { assertPinnedManifest, readManifest, writeManifest } from "./artwork/manifest.ts"
import { assertRenderedPixels, assertStandaloneSvg, xmlEscape as xml } from "./artwork/svg.ts"
import { normalizeLive } from "./snapshot.ts"

const SnapshotSchema = z.looseObject({
  fileKey: z.string(),
  version: z.string().optional(),
  nodes: z
    .record(
      z.string(),
      z.looseObject({
        document: z
          .looseObject({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            children: z
              .array(z.looseObject({ id: z.string(), name: z.string(), type: z.string() }))
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
})

function number(value: unknown, label: string, minimum = -Infinity, maximum = Infinity): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`Invalid ${label}`)
  }
  return value
}

type SvgPaint = {
  visible?: boolean
  type?: string
  blendMode?: string
  color?: { r: number; g: number; b: number; a?: number }
  opacity?: number
}
type SvgShape = { windingRule?: string; path?: string }
type SvgNode = {
  id: string
  type: string
  name?: string
  visible?: boolean
  isMask?: boolean
  maskType?: string
  size?: { x: number; y: number }
  relativeTransform?: number[][]
  opacity?: number
  children?: SvgNode[]
  fills?: SvgPaint[]
  strokes?: SvgPaint[]
  strokeAlign?: string
  fillGeometry?: SvgShape[]
  strokeGeometry?: SvgShape[]
  effects?: Array<{ visible?: boolean }>
  blendMode?: string
  clipsContent?: boolean
  cornerRadius?: number
  rectangleCornerRadii?: number[]
}

const SvgPaintSchema = z.looseObject({
  visible: z.boolean().optional(),
  type: z.string().optional(),
  blendMode: z.string().optional(),
  color: z
    .looseObject({ r: z.number(), g: z.number(), b: z.number(), a: z.number().optional() })
    .optional(),
  opacity: z.number().optional(),
})
const SvgShapeSchema = z.looseObject({
  windingRule: z.string().optional(),
  path: z.string().optional(),
})
const SvgNodeSchema: z.ZodType<SvgNode> = z.lazy(() =>
  z.looseObject({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    visible: z.boolean().optional(),
    isMask: z.boolean().optional(),
    maskType: z.string().optional(),
    size: z.looseObject({ x: z.number(), y: z.number() }).optional(),
    relativeTransform: z.array(z.array(z.number())).optional(),
    opacity: z.number().optional(),
    children: z.array(SvgNodeSchema).optional(),
    fills: z.array(SvgPaintSchema).optional(),
    strokes: z.array(SvgPaintSchema).optional(),
    strokeAlign: z.string().optional(),
    fillGeometry: z.array(SvgShapeSchema).optional(),
    strokeGeometry: z.array(SvgShapeSchema).optional(),
    effects: z.array(z.looseObject({ visible: z.boolean().optional() })).optional(),
    blendMode: z.string().optional(),
    clipsContent: z.boolean().optional(),
    cornerRadius: z.number().optional(),
    rectangleCornerRadii: z.array(z.number()).optional(),
  }),
)

class SvgRenderer {
  paths = 0
  definitionId = 0
  readonly definitions: string[] = []

  paint(
    node: SvgNode,
    geometry: SvgShape[] | undefined,
    paints: SvgPaint[] | undefined,
    alphaMask = false,
  ): string {
    const visible = (paints ?? []).filter((item) => item.visible !== false)
    if (!visible.length) return ""
    if (
      visible.length !== 1 ||
      visible[0].type !== "SOLID" ||
      (visible[0].blendMode && visible[0].blendMode !== "NORMAL")
    )
      throw new Error(`Unsupported paint on ${node.id}`)
    if (!geometry?.length) throw new Error(`Missing source geometry on ${node.id}`)
    const item = visible[0]
    const color = item.color
    if (!color) throw new Error(`Missing paint color on ${node.id}`)
    const fill =
      "#" +
      ["r", "g", "b"]
        .map((channel) =>
          Math.round(
            number(
              channel === "r" ? color.r : channel === "g" ? color.g : color.b,
              `paint channel on ${node.id}`,
              0,
              1,
            ) * 255,
          )
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    const opacity =
      number(item.opacity ?? 1, `paint opacity on ${node.id}`, 0, 1) *
      number(color.a ?? 1, `paint alpha on ${node.id}`, 0, 1)
    return geometry
      .map((shape) => {
        if (
          typeof shape.windingRule !== "string" ||
          !["NONZERO", "EVENODD"].includes(shape.windingRule) ||
          typeof shape.path !== "string" ||
          !shape.path.trim()
        )
          throw new Error(`Invalid source path on ${node.id}`)
        if (!alphaMask) this.paths += 1
        return `<path d="${xml(shape.path)}" fill="${alphaMask ? "#ffffff" : fill}" fill-opacity="${opacity}" fill-rule="${shape.windingRule === "EVENODD" ? "evenodd" : "nonzero"}"/>`
      })
      .join("")
  }

  children(node: SvgNode, alphaMask: boolean): string {
    if (node.type === "BOOLEAN_OPERATION") {
      if (!node.fillGeometry?.length && !node.strokeGeometry?.length)
        throw new Error(`Missing flattened Boolean geometry on ${node.id}`)
      return ""
    }
    const visible = (node.children ?? []).filter((child) => child.visible !== false)
    const masks = visible.filter((child) => child.isMask)
    if (!masks.length) return visible.map((child) => this.render(child, false, alphaMask)).join("")
    if (alphaMask || masks.length !== 1 || masks[0].maskType !== "ALPHA")
      throw new Error(`Unsupported source mask on ${node.id}`)
    const mask = masks[0]
    const index = visible.indexOf(mask)
    const id = `mask_${this.definitionId++}`
    const width = number(node.size?.x, `mask width on ${node.id}`, Number.MIN_VALUE)
    const height = number(node.size?.y, `mask height on ${node.id}`, Number.MIN_VALUE)
    this.definitions.push(
      `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" style="mask-type:alpha">${this.render(mask, false, true)}</mask>`,
    )
    const before = visible
      .slice(0, index)
      .map((child) => this.render(child))
      .join("")
    const masked = visible
      .slice(index + 1)
      .map((child) => this.render(child))
      .join("")
    return `${before}<g mask="url(#${id})">${masked}</g>`
  }

  clip(node: SvgNode, content: string): string {
    if (!node.clipsContent) return content
    const id = `clip_${this.definitionId++}`
    let shape: string
    if (node.fillGeometry?.length) {
      shape = this.paint(
        node,
        node.fillGeometry,
        [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
        true,
      )
    } else {
      if (node.cornerRadius || (node.rectangleCornerRadii ?? []).some((radius) => radius))
        throw new Error(`Missing rounded clipping geometry on ${node.id}`)
      const width = number(node.size?.x, `clip width on ${node.id}`, Number.MIN_VALUE)
      const height = number(node.size?.y, `clip height on ${node.id}`, Number.MIN_VALUE)
      shape = `<rect width="${width}" height="${height}"/>`
    }
    this.definitions.push(`<clipPath id="${id}">${shape}</clipPath>`)
    return `<g clip-path="url(#${id})">${content}</g>`
  }

  render(node: SvgNode, root = false, alphaMask = false): string {
    if (node.visible === false) return ""
    const supported = [
      "COMPONENT",
      "VECTOR",
      "RECTANGLE",
      "BOOLEAN_OPERATION",
      "FRAME",
      "GROUP",
      "INSTANCE",
    ]
    if (
      !supported.includes(node.type) ||
      (node.isMask && !alphaMask) ||
      (node.effects ?? []).some((effect) => effect.visible !== false) ||
      (node.blendMode && !["NORMAL", "PASS_THROUGH"].includes(node.blendMode))
    ) {
      throw new Error(`Unsupported source node ${node.id}: ${node.type}`)
    }
    const transform = node.relativeTransform
    if (
      !Array.isArray(transform) ||
      transform.length !== 2 ||
      transform.some((row) => !Array.isArray(row) || row.length !== 3)
    ) {
      throw new Error(`Missing source transform on ${node.id}`)
    }
    const [a, c, x, b, d, y] = transform
      .flat()
      .map((value) => number(value, `transform on ${node.id}`))
    const opacity = number(node.opacity ?? 1, `node opacity on ${node.id}`, 0, 1)
    let stroke = this.paint(node, node.strokeGeometry, node.strokes, alphaMask)
    if (stroke && node.strokeAlign === "INSIDE" && node.fillGeometry?.length) {
      const id = `clip_${this.definitionId++}`
      const fill = this.paint(
        node,
        node.fillGeometry,
        [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
        true,
      )
      this.definitions.push(`<clipPath id="${id}">${fill}</clipPath>`)
      stroke = `<g clip-path="url(#${id})">${stroke}</g>`
    }
    const fill = this.paint(node, node.fillGeometry, node.fills, alphaMask)
    return `<g transform="matrix(${a} ${b} ${c} ${d} ${root ? 0 : x} ${root ? 0 : y})" opacity="${opacity}">${fill}${stroke}${this.clip(node, this.children(node, alphaMask))}</g>`
  }

  document(document: SvgNode): string {
    const width = number(document.size?.x, `width on ${document.id}`, Number.MIN_VALUE)
    const height = number(document.size?.y, `height on ${document.id}`, Number.MIN_VALUE)
    const content = this.render(document, true)
    if (!this.paths) throw new Error(`Icon ${document.id} has no source artwork`)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">${this.definitions.length ? `<defs>${this.definitions.join("")}</defs>` : ""}${content}</svg>\n`
  }
}

function svg(value: unknown): string {
  return new SvgRenderer().document(parseSchema(SvgNodeSchema, value, "source document"))
}

function localAssets(registry: Registry): Record<string, LocalAsset> {
  const policies: Record<string, LocalAsset> = {}
  for (const [id, entry] of Object.entries(registry.entries)) {
    if (!entry.localAsset) continue
    if (
      !/^\d+:\d+$/.test(id) ||
      entry.target?.export !== "PagoPAIcon" ||
      !["image", "mask"].includes(entry.localAsset.rendering)
    ) {
      throw new Error(`Invalid local icon policy for ${id}`)
    }
    policies[id] = entry.localAsset
  }
  if (!Object.keys(policies).length) throw new Error("No local icon asset policies in the registry")
  return policies
}

export interface IconOptions {
  input?: string
}

export async function checkIcons(
  workspace: Workspace,
  options: IconOptions = {},
): Promise<CheckReport> {
  try {
    const result = await runIcons(workspace, "check", options.input)
    return report("icons", result)
  } catch (error) {
    return report("icons", "published icon identities and artwork must agree", [messageOf(error)])
  }
}

export async function updateIcons(workspace: Workspace, input: string): Promise<string> {
  return runIcons(workspace, "write", input)
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function figmaFileKey(workspace: Workspace): string {
  const file = fs.readFileSync(workspace.path("src/catalog/figma/file.ts"), "utf8")
  const match = file.match(/FIGMA_FILE_KEY\s*=\s*["']([^"']+)["']/)
  if (!match?.[1]) throw new Error("src/catalog/figma/file.ts must export a literal FIGMA_FILE_KEY")
  return match[1]
}

type IconContext = {
  fileKey: string
  snapshot: z.infer<typeof SnapshotSchema>
  nodes: ReturnType<typeof normalizeLive>
  policies: Record<string, LocalAsset>
  provenanceByNode: Map<string, IconManifestEntry["provenance"]>
  directory: string
  sourceFile: string
  manifestFile: string
  previousManifest: z.infer<typeof IconManifestSchema> | undefined
}

function loadIconContext(workspace: Workspace, input?: string): IconContext {
  const fileKey = figmaFileKey(workspace)
  const snapshot = parseSchema(
    SnapshotSchema,
    readJson(input ?? workspace.path("src/catalog/figma/inventory.json")),
    "icon snapshot",
  )
  if (
    snapshot.fileKey !== fileKey ||
    ((snapshot.nodes || snapshot.version !== undefined) &&
      (typeof snapshot.version !== "string" || !snapshot.version))
  ) {
    throw new Error(
      "Local icons require the configured Figma file and a pinned version for full source exports",
    )
  }
  const registry = parseSchema(
    RegistrySchema,
    readJson(workspace.path("src/catalog/figma/registry.json")),
    "registry",
  )
  const policies = localAssets(registry)
  const rule = requireBulkRule(registry, "figmaIconNames", "Local icons")
  if (!/^\d+:\d+$/.test(rule.pageId))
    throw new Error("Local icons require one identity-keyed catalogue page rule")
  const provenanceByNode = resolveProvenance(rule, new Set(Object.keys(policies)))
  const nodes = selectRuleNodes(registry, rule, normalizeLive(snapshot, { workspace }), workspace)
  if (
    !nodes.length ||
    nodes
      .map((node) => node.nodeId)
      .sort()
      .join() !== Object.keys(policies).sort().join()
  ) {
    throw new Error("Every published icon identity must have a local source asset policy")
  }
  const directory = path.join(workspace.artworkRoot, "src/assets/figma-icons")
  const sourceFile = path.join(workspace.artworkRoot, "src/components/icons/icon-assets.ts")
  const manifestFile = path.join(directory, "manifest.json")
  const previousManifest = readManifest(manifestFile, IconManifestSchema)
  assertPinnedManifest(previousManifest, fileKey, "Local icon provenance")
  return {
    fileKey,
    snapshot,
    nodes,
    policies,
    provenanceByNode,
    directory,
    sourceFile,
    manifestFile,
    previousManifest,
  }
}

function expectedIconEntry(
  context: IconContext,
  mode: "write" | "check",
  node: ReturnType<typeof normalizeLive>[number],
  rendered: Map<string, string>,
  publicNames: Set<string>,
): IconManifestEntry {
  const policy = context.policies[node.nodeId]
  if (!policy) throw new Error(`Invalid local icon policy for ${node.nodeId}`)
  const aliases = policy.aliases ?? {}
  const defaultVariantNodeId = policy.defaultVariantNodeId ?? node.nodeId
  if (
    !node.designFingerprint ||
    !/^\d+:\d+$/.test(defaultVariantNodeId) ||
    Object.entries(aliases).some(
      ([name, id]) => !/^[a-z][a-z0-9-]*$/.test(name) || !/^\d+:\d+$/.test(id),
    )
  ) {
    throw new Error(`Invalid local icon variant policy for ${node.nodeId}`)
  }
  const variantIds = [...new Set([defaultVariantNodeId, ...Object.values(aliases)])].sort()
  const document = context.snapshot.nodes?.[node.nodeId]?.document
  if (mode === "write" && !document) throw new Error(`Missing full source document ${node.nodeId}`)
  if (document) renderIconVariants(node, document, variantIds, defaultVariantNodeId, rendered)
  const name = context.previousManifest?.entries[node.nodeId]?.name ?? node.name
  if (!name.trim() || publicNames.has(name))
    throw new Error(`Local icon ${node.nodeId} requires a unique public name`)
  publicNames.add(name)
  const provenance = context.provenanceByNode.get(node.nodeId)
  if (!provenance) throw new Error(`Missing provenance for local icon ${node.nodeId}`)
  if (!node.contractFingerprint)
    throw new Error(`Missing contract fingerprint for local icon ${node.nodeId}`)
  return {
    name,
    rendering: policy.rendering,
    kind: policy.rendering === "image" ? "logo" : "glyph",
    designFingerprint: node.designFingerprint,
    contractFingerprint: node.contractFingerprint,
    defaultVariantNodeId,
    aliases,
    provenance,
    variants: Object.fromEntries(
      variantIds.map((id) => [id, { nodeId: id, file: `${id.replace(":", "-")}.svg` }]),
    ),
  }
}

function renderIconVariants(
  node: ReturnType<typeof normalizeLive>[number],
  document: NonNullable<z.infer<typeof SnapshotSchema>["nodes"]>[string]["document"],
  variantIds: string[],
  defaultVariantNodeId: string,
  rendered: Map<string, string>,
): void {
  if (!document) return
  const variants = document.type === "COMPONENT_SET" ? (document.children ?? []) : [document]
  if (
    !variants.length ||
    variants.some((variant) => variant.type !== "COMPONENT") ||
    variants
      .map((variant) => variant.id)
      .sort()
      .join() !== variantIds.join()
  ) {
    const published = variants.map((variant) => `${variant.name} (${variant.id})`).sort()
    throw new Error(
      `Unsupported source variants for ${node.nodeId}: source publishes ${published.join(", ") || "none"}; review defaultVariantNodeId and aliases in the localAsset policy (expected ${variantIds.join(", ")})`,
    )
  }
  if (document.type === "COMPONENT_SET") {
    const defaults = Object.entries(node.properties ?? {}).filter(
      ([, property]) => property.type === "VARIANT",
    )
    const matches = variants.filter((variant) =>
      defaults.every(([key, property]) =>
        property.type === "VARIANT"
          ? variant.name.split(", ").includes(`${key}=${property.defaultValue}`)
          : false,
      ),
    )
    if (!defaults.length || matches.length !== 1 || matches[0]?.id !== defaultVariantNodeId) {
      throw new Error(`Local icon ${node.nodeId} must retain its source default variant identity`)
    }
  }
  for (const variant of variants) rendered.set(variant.id, svg(variant))
}

function expectedIconEntries(
  context: IconContext,
  mode: "write" | "check",
): { expected: Record<string, IconManifestEntry>; rendered: Map<string, string> } {
  const expected: Record<string, IconManifestEntry> = {}
  const rendered = new Map<string, string>()
  const publicNames = new Set<string>()
  for (const node of context.nodes) {
    expected[node.nodeId] = expectedIconEntry(context, mode, node, rendered, publicNames)
  }
  return { expected, rendered }
}

async function verifyIconSources(
  mode: "write" | "check",
  expected: Record<string, IconManifestEntry>,
  manifest: z.infer<typeof IconManifestSchema> | undefined,
  directory: string,
  rendered: Map<string, string>,
): Promise<void> {
  if (mode === "check") {
    if (!manifest)
      throw new Error(
        'Missing local icon asset manifest; run "ui-cli update icons --input <snapshot>"',
      )
    if (Object.keys(manifest.entries).sort().join() !== Object.keys(expected).sort().join()) {
      throw new Error("Local icon manifest identities do not match the registry")
    }
  }
  for (const [id, entry] of Object.entries(expected)) {
    verifyIconManifestEntry(id, entry, manifest)
    for (const [variantId, variant] of Object.entries(entry.variants)) {
      const source =
        mode === "check"
          ? fs.readFileSync(path.join(directory, variant.file), "utf8")
          : rendered.get(variantId)
      if (!source) throw new Error(`Missing local icon artwork for ${variantId}`)
      assertStandaloneSvg(source, variantId)
      verifyIconVariant(id, variantId, variant, source, manifest, rendered)
      await assertRenderedPixels(source, variantId)
      variant.sha256 = sha256(source)
    }
  }
}

function verifyIconManifestEntry(
  id: string,
  entry: IconManifestEntry,
  manifest: z.infer<typeof IconManifestSchema> | undefined,
): void {
  if (!manifest) return
  const actual = manifest.entries[id]
  if (!actual) throw new Error(`Local icon ${id} is missing from the manifest`)
  for (const key of [
    "name",
    "rendering",
    "kind",
    "designFingerprint",
    "contractFingerprint",
    "defaultVariantNodeId",
    "aliases",
    "provenance",
  ] as const) {
    if (JSON.stringify(actual[key]) !== JSON.stringify(entry[key]))
      throw new Error(`Stale local icon evidence for ${id}: ${key}`)
  }
  if (Object.keys(actual.variants).sort().join() !== Object.keys(entry.variants).sort().join()) {
    throw new Error(`Local icon ${id} has incomplete variant identities`)
  }
}

function verifyIconVariant(
  id: string,
  variantId: string,
  variant: IconManifestEntry["variants"][string],
  source: string,
  manifest: z.infer<typeof IconManifestSchema> | undefined,
  rendered: Map<string, string>,
): void {
  if (!manifest) return
  const actual = manifest.entries[id]?.variants[variantId]
  if (
    !actual ||
    actual.nodeId !== variantId ||
    actual.file !== variant.file ||
    actual.sha256 !== sha256(source)
  ) {
    throw new Error(`Local icon ${variantId} identity or checksum mismatch`)
  }
  if (rendered.has(variantId) && rendered.get(variantId) !== source) {
    throw new Error(`Local icon ${variantId} does not reproduce its pinned source geometry`)
  }
}

function generateIconModule(expected: Record<string, IconManifestEntry>): string {
  const imports: string[] = []
  const declarations: string[] = []
  const byName: string[] = []
  const variantsByType: string[] = []
  for (const [id, entry] of Object.entries(expected).sort(([a], [b]) => a.localeCompare(b))) {
    const variants: string[] = []
    for (const variant of Object.values(entry.variants)) {
      const variable = `asset_${variant.nodeId.replace(":", "_")}`
      imports.push(`import ${variable} from "../../assets/figma-icons/${variant.file}?no-inline"`)
      variants.push(
        `${JSON.stringify(variant.nodeId)}: { nodeId: ${JSON.stringify(variant.nodeId)}, url: ${variable} }`,
      )
    }
    const aliases = Object.entries(entry.aliases).map(
      ([name, nodeId]) => `${propertyKey(name)}: ${JSON.stringify(nodeId)}`,
    )
    declarations.push(
      `${JSON.stringify(id)}: { name: ${JSON.stringify(entry.name)}, rendering: ${JSON.stringify(entry.rendering)}, defaultVariantNodeId: ${JSON.stringify(entry.defaultVariantNodeId)}, aliases: { ${aliases.join(", ")} }, variants: { ${variants.join(", ")} } }`,
    )
    const names = Object.keys(entry.aliases).sort()
    byName.push(`${propertyKey(entry.name)}: iconAssets[${JSON.stringify(id)}]`)
    variantsByType.push(
      `  ${propertyKey(entry.name)}: ${names.length ? names.map((name) => JSON.stringify(name)).join(" | ") : "never"}`,
    )
  }
  byName.sort()
  variantsByType.sort()
  return `// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; keys are nodeIds.\n${imports.join("\n")}\nimport type { FigmaIconName } from "./figma-inventory"\n\nexport type IconAsset = {\n  name: FigmaIconName\n  rendering: "image" | "mask"\n  defaultVariantNodeId: string\n  aliases: Partial<Record<string, string>>\n  variants: Record<string, { nodeId: string; url: string }>\n}\n\nexport const iconAssets: Record<string, IconAsset> = {\n${declarations.join(",\n")}\n}\n\n/** Public-name index of the node-keyed catalogue; exhaustive by construction. */\nexport const iconAssetsByName = {\n${byName.join(",\n")}\n} as const satisfies Record<FigmaIconName, IconAsset>\n\n/** Variant aliases published by each icon (\`never\` when the identity has none). */\nexport type IconVariantsByName = {\n${variantsByType.join("\n")}\n}\n`
}

function writeIconFiles(
  context: IconContext,
  manifest: z.infer<typeof IconManifestSchema>,
  expected: Record<string, IconManifestEntry>,
  rendered: Map<string, string>,
  source: string,
): void {
  fs.mkdirSync(context.directory, { recursive: true })
  for (const entry of Object.values(expected)) {
    for (const variant of Object.values(entry.variants)) {
      const art = rendered.get(variant.nodeId)
      if (!art) throw new Error(`Missing rendered icon ${variant.nodeId}`)
      fs.writeFileSync(path.join(context.directory, variant.file), art)
    }
  }
  writeManifest(context.manifestFile, manifest)
  fs.mkdirSync(path.dirname(context.sourceFile), { recursive: true })
  fs.writeFileSync(context.sourceFile, source)
}

async function runIcons(
  workspace: Workspace,
  mode: "write" | "check",
  input?: string,
): Promise<string> {
  const context = loadIconContext(workspace, input)
  const { expected, rendered } = expectedIconEntries(context, mode)
  const manifest = mode === "check" ? context.previousManifest : undefined
  await verifyIconSources(mode, expected, manifest, context.directory, rendered)
  const outputManifest = manifest ?? {
    fileKey: context.fileKey,
    version: context.snapshot.version ?? "",
    entries: expected,
  }
  const source = generateIconModule(expected)
  if (mode === "check")
    assertGeneratedModule(context.sourceFile, source, "Generated local icon module")
  else writeIconFiles(context, outputManifest, expected, rendered, source)
  const variants = Object.values(expected).reduce(
    (count, entry) => count + Object.keys(entry.variants).length,
    0,
  )
  return `Local icons ${mode}: ${context.nodes.length} roots, ${variants} standalone SVG variants`
}

export { svg }
