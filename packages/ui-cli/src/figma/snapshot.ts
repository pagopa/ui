import fs from "node:fs"
import { z } from "zod"

import { fingerprint } from "../lib/hash.ts"
import { artworkPath } from "../lib/paths.ts"
import { isSchema, parseSchema } from "../lib/validate.ts"
import { parseSource } from "../lib/source-modules.ts"
import {
  DependencySchema,
  InventoryNodeSchema,
  PropertySchema,
  type BulkRule,
  type InventoryNode,
  type Property,
  type Registry,
} from "../schemas/catalogue.ts"
import { NodeIdSchema } from "../schemas/common.ts"
import { loadDevicePolicy, variantDevice } from "./devices.ts"
import type { DevicePolicy } from "../schemas/devices.ts"

const AnyRecordSchema = z.record(z.string(), z.unknown())
type AnyRecord = z.infer<typeof AnyRecordSchema>

function asRecord(value: unknown, label: string): AnyRecord {
  return parseSchema(AnyRecordSchema, value, label)
}

const BoundingBoxSchema = z.looseObject({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
})

const RawDocumentSchema = z.looseObject({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  absoluteBoundingBox: BoundingBoxSchema.optional(),
  absoluteRenderBounds: BoundingBoxSchema.optional(),
  relativeTransform: z.array(z.array(z.number())).optional(),
  componentPropertyDefinitions: z.record(z.string(), z.unknown()).optional(),
  children: z
    .array(
      z.looseObject({
        id: z.string(),
        name: z.string().optional(),
        type: z.string(),
        absoluteBoundingBox: BoundingBoxSchema.optional(),
      }),
    )
    .optional(),
})

const RawPropertySchema = z.looseObject({
  key: z.string().optional(),
  type: z.string(),
  defaultValue: z.unknown().optional(),
  variantOptions: z.array(z.string()).optional(),
})

const RawContainingFrameSchema = z.looseObject({
  pageId: z.string().optional(),
  page_id: z.string().optional(),
  pageName: z.string().optional(),
})

const RawDependencySchema = z.looseObject({
  external: z.boolean(),
  nodeId: z.string().optional(),
  assetKey: z.string().optional(),
})

const RawNodeSchema = z.looseObject({
  nodeId: z.string().optional(),
  node_id: z.string().optional(),
  name: z.string(),
  type: z.string(),
  pageName: z.string().optional(),
  pageId: z.string().optional(),
  assetKey: z.string().optional(),
  key: z.string().optional(),
  sources: z.array(z.string()).optional(),
  properties: z.record(z.string(), RawPropertySchema).optional(),
  document: RawDocumentSchema.optional(),
  containing_frame: RawContainingFrameSchema.optional(),
  dependencies: z.array(RawDependencySchema).optional(),
  designFingerprint: z.string().nullable().optional(),
})

const RestComponentSchema = z.looseObject({
  componentSetId: z.string().optional(),
  key: z.string().optional(),
  remote: z.boolean().optional(),
})

const RestNodeRecordSchema = z.looseObject({
  document: RawDocumentSchema.optional(),
  components: z.record(z.string(), RestComponentSchema).optional(),
  componentSets: z.record(z.string(), RestComponentSchema).optional(),
})

const PublishedNodeSchema = z.looseObject({
  node_id: z.string(),
  key: z.string().optional(),
  name: z.string(),
  type: z.string().optional(),
  sources: z.array(z.string()).optional(),
  containing_frame: RawContainingFrameSchema.optional(),
})

const RestExportSchema = z.looseObject({
  meta: z.looseObject({
    components: z.array(PublishedNodeSchema),
    component_sets: z.array(PublishedNodeSchema),
  }),
  nodes: z.record(z.string(), RestNodeRecordSchema).optional(),
})

const InventoryExportSchema = z.looseObject({
  components: z.array(z.unknown()),
})

const LiveExportSchema = z.union([z.array(z.unknown()), RestExportSchema, InventoryExportSchema])

type RestExport = z.infer<typeof RestExportSchema>
type InventoryExport = z.infer<typeof InventoryExportSchema>

const isRestExport = (value: unknown): value is RestExport => isSchema(RestExportSchema, value)
const isInventoryExport = (value: unknown): value is InventoryExport =>
  isSchema(InventoryExportSchema, value)

export function fileKeyFromSource(): string {
  const file = "src/catalog/figma/file.ts"
  const declarations = parseSource(file).program.body.flatMap((statement) =>
    statement.type === "ExportNamedDeclaration" &&
    statement.declaration?.type === "VariableDeclaration"
      ? statement.declaration.declarations
      : [],
  )
  const initializer = declarations.find(
    (declaration) =>
      declaration.id.type === "Identifier" && declaration.id.name === "FIGMA_FILE_KEY",
  )?.init
  if (
    initializer?.type !== "Literal" ||
    typeof initializer.value !== "string" ||
    !initializer.value
  ) {
    throw new Error(`${file} must export a literal FIGMA_FILE_KEY`)
  }
  return initializer.value
}

const CatalogueManifestSchema = z.looseObject({
  fileKey: z.string(),
  entries: z.record(z.string(), z.unknown()),
})

export function catalogueIndex(registry: Registry): {
  byNode: Map<string, BulkRule>
  manifests: Map<string, z.infer<typeof CatalogueManifestSchema>>
} {
  const byNode = new Map<string, BulkRule>()
  const manifests = new Map<string, z.infer<typeof CatalogueManifestSchema>>()
  const fileKey = fileKeyFromSource()
  function own(id: string, rule: BulkRule): void {
    const previous = byNode.get(id)
    if (previous && previous !== rule) {
      throw new Error(`Duplicate catalogue ownership for ${id}`)
    }
    byNode.set(id, rule)
  }
  for (const rule of registry.bulkRules ?? []) {
    if (!rule.namesExport) continue
    if (!rule.assetManifest) {
      throw new Error(`${rule.pageId}: namesExport requires a node-keyed assetManifest`)
    }
    // A first artwork export may not have a manifest yet.
    const file = artworkPath(rule.assetManifest)
    if (!fs.existsSync(file)) continue
    const manifest = parseSchema(
      CatalogueManifestSchema,
      JSON.parse(fs.readFileSync(file, "utf8")),
      rule.assetManifest,
    )
    if (manifest.fileKey !== fileKey) {
      throw new Error(`${rule.assetManifest}: invalid file key or catalogue entries`)
    }
    manifests.set(rule.pageId, manifest)
    for (const id of Object.keys(manifest.entries)) own(id, rule)
  }
  for (const [id, entry] of Object.entries(registry.entries ?? {})) {
    const catalogue = {
      PagoPAIcon: "figmaIconNames",
      PagoPAPictogram: "figmaPictogramNames",
    }[entry.target?.export ?? ""]
    if (!catalogue) continue
    const rule = registry.bulkRules?.find((item) => item.namesExport === catalogue)
    if (rule) own(id, rule)
  }
  return { byNode, manifests }
}

function designEvidence(document: unknown): unknown {
  const value = asRecord(document, "invalid Figma document")
  const box = value.absoluteBoundingBox
  const boxRecord =
    box && typeof box === "object" ? asRecord(box, "invalid bounding box") : undefined
  const origin = boxRecord ? { x: Number(boxRecord.x), y: Number(boxRecord.y) } : { x: 0, y: 0 }
  function visit(item: unknown, key?: string, root = false): unknown {
    if (Array.isArray(item)) return item.map((child) => visit(child))
    if (!item || typeof item !== "object") return item
    if (key === "absoluteBoundingBox" || key === "absoluteRenderBounds") {
      const bounds = asRecord(item, `invalid ${key}`)
      return { ...bounds, x: Number(bounds.x) - origin.x, y: Number(bounds.y) - origin.y }
    }
    return Object.fromEntries(
      Object.entries(item)
        .filter(
          ([name]) => !["id", "name", "locked", "componentPropertyDefinitions"].includes(name),
        )
        .map(([name, child]) => {
          if (root && name === "relativeTransform" && Array.isArray(child)) {
            return [
              name,
              parseSchema(z.array(z.array(z.number())), child, "invalid relativeTransform").map(
                (row) => [row[0], row[1], 0],
              ),
            ]
          }
          return [name, visit(child, name)]
        }),
    )
  }
  return visit(document, undefined, true)
}

function restDependencies(
  record: z.infer<typeof RestNodeRecordSchema> | undefined,
  knownIds: Set<string>,
): Array<z.infer<typeof DependencySchema>> {
  if (!record?.document) throw new Error("REST export contains a missing node document")
  const dependencies = new Map<string, z.infer<typeof DependencySchema>>()
  function visit(nodeValue: unknown): void {
    const node = asRecord(nodeValue, "invalid REST node")
    if (node.type === "INSTANCE") {
      const componentId = String(node.componentId ?? "")
      const master = record?.components?.[componentId]
      if (!master) throw new Error(`REST export cannot resolve master ${componentId}`)
      const identity = master.componentSetId ?? componentId
      const metadata = record?.componentSets?.[identity] ?? master
      const dependency: z.infer<typeof DependencySchema> =
        metadata.remote === true || !knownIds.has(identity)
          ? { external: true, assetKey: metadata.key ?? "" }
          : { external: false, nodeId: identity }
      dependencies.set(JSON.stringify(dependency), dependency)
      return
    }
    const children = Array.isArray(node.children) ? node.children : []
    for (const child of children) visit(child)
  }
  visit(record.document)
  return [...dependencies.values()]
}

const PropertyGuidSchema = z.looseObject({
  guid: z.looseObject({
    sessionID: z.number().int(),
    localID: z.number().int(),
  }),
})

function propertyDefault(value: unknown): unknown {
  const parsed = PropertyGuidSchema.safeParse(value)
  if (parsed.success) return `${parsed.data.guid.sessionID}:${parsed.data.guid.localID}`
  return value
}

// The device vocabulary is committed data. It is loaded once per process; a
// fixture that pins its own policy passes it explicitly to `normalizeNode`.
let devicePolicyCache: DevicePolicy | null = null

export function defaultDevicePolicyCached(): DevicePolicy {
  if (!devicePolicyCache) devicePolicyCache = loadDevicePolicy()
  return devicePolicyCache
}

function boxOf(
  node: z.infer<typeof RawDocumentSchema>,
): { width: number; height: number } | undefined {
  const box = node.absoluteBoundingBox
  if (!box || !Number.isFinite(box.width) || !Number.isFinite(box.height)) return undefined
  return { width: Math.round(box.width), height: Math.round(box.height) }
}

function variantRecords(
  raw: z.infer<typeof RawNodeSchema>,
  properties: Record<string, Property>,
  policy: DevicePolicy,
): InventoryNode["variants"] {
  if (raw.type !== "COMPONENT_SET") return undefined
  const children = (raw.document?.children ?? []).filter((child) => child?.id)
  if (!children.length) return undefined
  return children
    .map((child) => ({
      nodeId: child.id,
      name: child.name ?? child.id,
      device: variantDevice(policy, { properties }, child.name ?? child.id).device,
      box: boxOf(child),
      designFingerprint: fingerprint(designEvidence(child)),
    }))
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId, undefined, { numeric: true }))
}

export function normalizeNode(
  rawValue: unknown,
  { policy = defaultDevicePolicyCached() }: { policy?: DevicePolicy } = {},
): InventoryNode {
  const raw = parseSchema(RawNodeSchema, rawValue, "invalid Figma node")
  const nodeId = raw.nodeId ?? raw.node_id
  const pageName = raw.pageName ?? raw.containing_frame?.pageName ?? ""
  const pageId = raw.pageId ?? raw.containing_frame?.pageId ?? raw.containing_frame?.page_id ?? ""
  if (
    !nodeId ||
    !NodeIdSchema.safeParse(nodeId).success ||
    !/^\d+:\d+$/.test(pageId) ||
    typeof pageName !== "string"
  ) {
    throw new Error(`invalid Figma identity or page for node ${nodeId ?? "(missing)"}`)
  }
  if (!["COMPONENT", "COMPONENT_SET"].includes(raw.type)) {
    throw new Error(`invalid Figma type for node ${nodeId}`)
  }
  const definitions = raw.properties ?? raw.document?.componentPropertyDefinitions ?? {}
  const properties: Record<string, unknown> = {}
  for (const [name, definition] of Object.entries(definitions)) {
    const parsed = RawPropertySchema.parse(definition)
    const key = parsed.key ?? name
    properties[key] = {
      type: parsed.type,
      ...(parsed.defaultValue !== undefined
        ? { defaultValue: propertyDefault(parsed.defaultValue) }
        : {}),
      ...(parsed.variantOptions ? { variantOptions: [...parsed.variantOptions].sort() } : {}),
    }
  }
  const dependencies = (raw.dependencies ?? [])
    .map((dependency) => {
      if (
        typeof dependency.external !== "boolean" ||
        (dependency.external
          ? typeof dependency.assetKey !== "string" || !dependency.assetKey.trim()
          : !/^\d+:\d+$/.test(dependency.nodeId ?? ""))
      ) {
        throw new Error(`invalid dependency on node ${nodeId}`)
      }
      return {
        external: dependency.external,
        ...(dependency.external
          ? { assetKey: dependency.assetKey }
          : { nodeId: dependency.nodeId }),
      }
    })
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))

  const normalizedProperties = Object.fromEntries(
    Object.entries(properties).map(([key, property]) => [
      key,
      parseSchema(PropertySchema, property, `invalid property ${key} on node ${nodeId}`),
    ]),
  )
  const normalizedDependencies = parseSchema(
    z.array(DependencySchema),
    dependencies,
    `invalid dependency on node ${nodeId}`,
  )
  const type = parseSchema(
    z.enum(["COMPONENT", "COMPONENT_SET"]),
    raw.type,
    `invalid Figma type for node ${nodeId}`,
  )
  const variants = variantRecords(raw, normalizedProperties, policy)
  const designFingerprint = raw.document
    ? fingerprint(designEvidence(raw.document))
    : (raw.designFingerprint ?? null)
  return parseSchema(
    InventoryNodeSchema,
    {
      nodeId,
      name: raw.name,
      type,
      pageId,
      pageName,
      ...((raw.assetKey ?? raw.key) ? { assetKey: raw.assetKey ?? raw.key } : {}),
      sources: raw.sources ?? ["mcp"],
      properties: normalizedProperties,
      dependencies: normalizedDependencies,
      ...(variants ? { variants } : {}),
      contractFingerprint: fingerprint({
        type,
        properties: normalizedProperties,
        dependencies: normalizedDependencies,
      }),
      designFingerprint,
    },
    `invalid Figma node ${nodeId}`,
  )
}

export function normalizeLive(
  rawValue: unknown,
  options: { policy?: DevicePolicy } = {},
): InventoryNode[] {
  const raw = parseSchema(LiveExportSchema, rawValue, "unrecognized live export shape")
  let list: unknown[]
  if (Array.isArray(raw)) list = raw
  else if (isRestExport(raw)) {
    list = [
      ...raw.meta.components.map((node) => ({
        ...node,
        type: "COMPONENT",
        sources: node.sources ?? ["rest"],
      })),
      ...raw.meta.component_sets.map((node) => ({
        ...node,
        type: "COMPONENT_SET",
        sources: node.sources ?? ["rest"],
      })),
    ]
    const knownIds = new Set(
      list.map((node) => parseSchema(PublishedNodeSchema, node, "invalid published node").node_id),
    )
    list = list.map((node) => {
      const published = parseSchema(PublishedNodeSchema, node, "invalid published node")
      return {
        ...published,
        document: raw.nodes?.[published.node_id]?.document,
        dependencies: restDependencies(raw.nodes?.[published.node_id], knownIds),
      }
    })
  } else if (isInventoryExport(raw)) list = raw.components
  else throw new Error("unrecognized live export shape")
  const seen = new Set<string>()
  const components: InventoryNode[] = []
  for (const item of list) {
    const node = normalizeNode(item, options)
    if (seen.has(node.nodeId)) throw new Error(`duplicate Figma nodeId ${node.nodeId}`)
    seen.add(node.nodeId)
    components.push(node)
  }
  for (const node of components) {
    for (const dependency of node.dependencies ?? []) {
      if (!dependency.external && !seen.has(dependency.nodeId)) {
        throw new Error(`unknown dependency ${dependency.nodeId} on node ${node.nodeId}`)
      }
    }
  }
  return components.sort((a, b) => a.nodeId.localeCompare(b.nodeId, undefined, { numeric: true }))
}

export type VariantChange = {
  nodeId: string
  device: string | null | undefined
  class: "added" | "design" | "renamed" | "device" | "removed"
}

function variantDelta(old: InventoryNode | undefined, node: InventoryNode): VariantChange[] {
  if (!(node.variants ?? []).length) return []
  const changes: VariantChange[] = []
  const before = new Map((old?.variants ?? []).map((variant) => [variant.nodeId, variant]))
  const after = new Map((node.variants ?? []).map((variant) => [variant.nodeId, variant]))
  for (const [nodeId, variant] of after) {
    const previous = before.get(nodeId)
    if (!previous) {
      changes.push({ nodeId, device: variant.device, class: "added" })
    } else if (previous.designFingerprint !== variant.designFingerprint) {
      changes.push({ nodeId, device: variant.device, class: "design" })
    } else if (previous.name !== variant.name) {
      changes.push({ nodeId, device: variant.device, class: "renamed" })
    } else if (previous.device !== variant.device) {
      changes.push({ nodeId, device: variant.device, class: "device" })
    }
  }
  for (const [nodeId, variant] of before) {
    if (!after.has(nodeId)) changes.push({ nodeId, device: variant.device, class: "removed" })
  }
  return changes
}

export type DeltaNode = InventoryNode & { change?: string }

export type SnapshotDelta = {
  added: DeltaNode[]
  removed: DeltaNode[]
  changed: DeltaNode[]
  changedVariants: VariantChange[]
  renamed: DeltaNode[]
  moved: DeltaNode[]
  baseline: DeltaNode[]
  affected: DeltaNode[]
}

export function compareSnapshots(
  previous: InventoryNode[],
  current: InventoryNode[],
): SnapshotDelta {
  const before = new Map(previous.map((node) => [node.nodeId, node]))
  const after = new Map(current.map((node) => [node.nodeId, node]))
  const delta: SnapshotDelta = {
    added: [],
    removed: [],
    changed: [],
    changedVariants: [],
    renamed: [],
    moved: [],
    baseline: [],
    affected: [],
  }
  for (const node of current) {
    const old = before.get(node.nodeId)
    if (!old) {
      delta.added.push(node)
      continue
    }
    if (old.name !== node.name || old.pageName !== node.pageName) delta.renamed.push(node)
    if (old.pageId !== node.pageId) delta.moved.push(node)
    delta.changedVariants.push(...variantDelta(old, node))
    const changes: string[] = []
    if (old.type !== node.type) changes.push("type")
    if (
      old.properties !== undefined &&
      normalizeNode(old).contractFingerprint !== node.contractFingerprint
    ) {
      changes.push("properties or dependencies")
    }
    if (old.designFingerprint && old.designFingerprint !== node.designFingerprint)
      changes.push("design")
    if (changes.length) delta.changed.push({ ...node, change: changes.join(" + ") })
    if (old.properties === undefined || (!old.designFingerprint && node.designFingerprint))
      delta.baseline.push(node)
  }
  delta.removed = previous.filter((node) => !after.has(node.nodeId))
  const reverse = new Map<string, Set<string>>()
  for (const node of [...previous, ...current]) {
    for (const dependency of node.dependencies ?? []) {
      if (dependency.external) continue
      let parents = reverse.get(dependency.nodeId)
      if (!parents) {
        parents = new Set()
        reverse.set(dependency.nodeId, parents)
      }
      parents.add(node.nodeId)
    }
  }
  const direct = new Set(
    [...delta.added, ...delta.changed, ...delta.removed].map((node) => node.nodeId),
  )
  const queue = [...direct]
  const seen = new Set(queue)
  for (const nodeId of queue) {
    for (const parent of reverse.get(nodeId) ?? []) {
      if (seen.has(parent)) continue
      seen.add(parent)
      queue.push(parent)
      const target = after.get(parent)
      if (target) delta.affected.push(target)
    }
  }
  return delta
}

export function implementationFingerprint(root: InventoryNode, nodes: InventoryNode[]): string {
  const byId = new Map(nodes.map((node) => [node.nodeId, node]))
  const sources = new Map<string, { nodeId: string; contract: string; design: string | null }>()
  function visit(node: InventoryNode): void {
    if (sources.has(node.nodeId)) return
    sources.set(node.nodeId, {
      nodeId: node.nodeId,
      contract: node.contractFingerprint ?? normalizeNode(node).contractFingerprint ?? "",
      design: node.designFingerprint ?? null,
    })
    for (const dependency of node.dependencies ?? []) {
      if (!dependency.external) {
        const target = byId.get(dependency.nodeId)
        if (!target) throw new Error(`Missing design dependency ${dependency.nodeId}`)
        visit(target)
      }
    }
  }
  visit(root)
  return fingerprint([...sources.values()].sort((a, b) => a.nodeId.localeCompare(b.nodeId)))
}

export function implementationOrder(nodes: InventoryNode[], selected: Set<string>): string[] {
  const byId = new Map(nodes.map((node) => [node.nodeId, node]))
  const ordered: string[] = []
  const visited = new Set<string>()
  const active = new Set<string>()
  function visit(id: string): void {
    if (!selected.has(id) || visited.has(id) || !byId.has(id)) return
    if (active.has(id)) throw new Error(`Figma dependency cycle at ${id}`)
    active.add(id)
    for (const dependency of byId.get(id)?.dependencies ?? []) {
      // Variants may compose other variants in the same published set.
      if (!dependency.external && dependency.nodeId !== id) visit(dependency.nodeId)
    }
    active.delete(id)
    visited.add(id)
    ordered.push(id)
  }
  for (const node of nodes) visit(node.nodeId)
  return ordered
}
