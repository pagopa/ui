import { z } from "zod"

import { figmaToken } from "./token.ts"

const DocumentSchema = z.looseObject({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  children: z
    .array(z.looseObject({ id: z.string(), type: z.string(), name: z.string().optional() }))
    .optional(),
})

const NodeRecordSchema = z.looseObject({
  document: DocumentSchema.optional(),
  components: z.record(z.string(), z.unknown()).optional(),
  componentSets: z.record(z.string(), z.unknown()).optional(),
})

const ImagesResponseSchema = z.looseObject({
  images: z.record(z.string(), z.string().nullable()).optional(),
})

const NodeDocumentsResponseSchema = z.looseObject({
  fileKey: z.string().optional(),
  version: z.union([z.string(), z.number()]).optional(),
  nodes: z.record(z.string(), NodeRecordSchema).optional(),
})

const PublishedNodeSchema = z.looseObject({
  node_id: z.string(),
  key: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  containing_frame: z
    .looseObject({
      pageId: z.string().optional(),
      page_id: z.string().optional(),
      pageName: z.string().optional(),
    })
    .optional(),
})

const ComponentInventorySchema = z.looseObject({
  meta: z.looseObject({ components: z.array(PublishedNodeSchema) }),
})

const ComponentSetInventorySchema = z.looseObject({
  meta: z.looseObject({ component_sets: z.array(PublishedNodeSchema) }),
})

const FileHeaderSchema = z.looseObject({
  version: z.string(),
  lastModified: z.string().optional(),
})

const FileResponseSchema = z.looseObject({
  version: z.string(),
  lastModified: z.string().optional(),
  document: z.looseObject({
    children: z.array(z.looseObject({ id: z.string(), name: z.string() })),
  }),
})

const ApiResponseSchema = z.looseObject({
  error: z.unknown().optional(),
  err: z.unknown().optional(),
})

export type FigmaDocument = z.infer<typeof DocumentSchema>
export type PublishedNode = z.infer<typeof PublishedNodeSchema>
export type FigmaFileHeader = { version: string; lastModified?: string }

// The file header alone: the version pins a reading and `lastModified` says
// when the file last changed. One small call answers "is there anything to
// align?" without reading any node document.
export async function fetchFileHeader(fileKey: string): Promise<FigmaFileHeader> {
  const file = await get(`files/${fileKey}?depth=1`, FileHeaderSchema)
  if (typeof file.version !== "string" || !file.version) {
    throw new Error("Figma returned no file version")
  }
  return { version: file.version, lastModified: file.lastModified }
}

async function get<T>(endpoint: string, schema: z.ZodType<T>): Promise<T> {
  const token = figmaToken()
  const response = await fetch(`https://api.figma.com/v1/${endpoint}`, {
    method: "GET",
    headers: { "X-Figma-Token": token },
    signal: AbortSignal.timeout(90_000),
  })
  if (!response.ok) {
    const retry = response.headers.get("retry-after")
    throw new Error(
      `Figma GET ${endpoint}: HTTP ${response.status}${retry ? `; retry after ${retry} seconds` : ""}`,
    )
  }
  const data: unknown = await response.json()
  const api = ApiResponseSchema.parse(data)
  if (api.error || api.err) throw new Error(`Figma GET ${endpoint}: API error`)
  return schema.parse(data)
}

export async function fetchFigmaImages(
  fileKey: string,
  version: string,
  ids: string[],
): Promise<Map<string, string>> {
  const assets = new Map<string, string>()
  for (let start = 0; start < ids.length; start += 50) {
    const batch = ids.slice(start, start + 50)
    const query = new URLSearchParams({
      ids: batch.join(","),
      version,
      format: "svg",
      contents_only: "true",
      use_absolute_bounds: "true",
      svg_include_node_id: "true",
    })
    const data = await get(`images/${fileKey}?${query}`, ImagesResponseSchema)
    await Promise.all(
      batch.map(async (id) => {
        const url = data.images?.[id]
        if (typeof url !== "string" || new URL(url).protocol !== "https:") {
          throw new Error(`Figma could not render variant ${id}`)
        }
        const response = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(90_000),
        })
        if (!response.ok) throw new Error(`Figma asset ${id}: HTTP ${response.status}`)
        assets.set(id, await response.text())
      }),
    )
  }
  return assets
}

// The pinned PNG of each node, at scale 1: the review image of a parity case.
// The version is explicit, so the picture belongs to the same source pin as the
// numbers the case compares.
export async function fetchFigmaImagesPng(
  fileKey: string,
  version: string,
  ids: string[],
): Promise<Map<string, Buffer>> {
  const assets = new Map<string, Buffer>()
  for (let start = 0; start < ids.length; start += 50) {
    const batch = ids.slice(start, start + 50)
    const query = new URLSearchParams({
      ids: batch.join(","),
      version,
      format: "png",
      scale: "1",
    })
    const data = await get(`images/${fileKey}?${query}`, ImagesResponseSchema)
    await Promise.all(
      batch.map(async (id) => {
        const url = data.images?.[id]
        if (typeof url !== "string" || new URL(url).protocol !== "https:") {
          throw new Error(`Figma could not render node ${id} as PNG`)
        }
        const response = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(90_000),
        })
        if (!response.ok) throw new Error(`Figma asset ${id}: HTTP ${response.status}`)
        assets.set(id, Buffer.from(await response.arrayBuffer()))
      }),
    )
  }
  return assets
}

export async function fetchFigmaNodeDocuments(
  fileKey: string,
  version: string,
  ids: string[],
): Promise<Map<string, FigmaDocument>> {
  if (typeof fileKey !== "string" || !fileKey.trim()) {
    throw new Error("Pinned Figma node reads require a file key")
  }
  if (typeof version !== "string" || !version.trim()) {
    throw new Error("Pinned Figma node reads require an explicit snapshot version")
  }
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !/^\d+:\d+$/.test(id))) {
    throw new Error("Pinned Figma node reads require valid node IDs")
  }

  const documents = new Map<string, FigmaDocument>()
  const selected = [...new Set(ids)]
  for (let start = 0; start < selected.length; start += 50) {
    const batch = selected.slice(start, start + 50)
    const query = new URLSearchParams({
      ids: batch.join(","),
      version,
      geometry: "paths",
    })
    const data = await get(
      `files/${encodeURIComponent(fileKey)}/nodes?${query}`,
      NodeDocumentsResponseSchema,
    )
    if (data.fileKey !== undefined && data.fileKey !== fileKey) {
      throw new Error(`Figma returned node documents for the wrong file`)
    }
    if (data.version !== undefined && String(data.version) !== version) {
      throw new Error(`Figma returned node documents for the wrong version`)
    }
    for (const id of batch) {
      const document = data.nodes?.[id]?.document
      if (!document) {
        throw new Error(`Figma node ${id} is missing at pinned version ${version}`)
      }
      if (document.id !== id) {
        throw new Error(
          `Figma returned node ${document.id ?? "(missing)"} for requested node ${id}`,
        )
      }
      if (typeof document.type !== "string" || typeof document.name !== "string") {
        throw new Error(`Figma node ${id} has an incomplete document at pinned version ${version}`)
      }
      documents.set(id, document)
    }
  }
  return documents
}

type McpNode = {
  nodeId: string
  name: string
  type: string
  assetKey?: string
  pageId: string
  pageName: string
}

export async function fetchFigmaSnapshot(fileKey: string, mcpNodes: McpNode[] = []) {
  const [componentData, setData, file] = await Promise.all([
    get(`files/${fileKey}/components`, ComponentInventorySchema),
    get(`files/${fileKey}/component_sets`, ComponentSetInventorySchema),
    get(`files/${fileKey}?depth=1`, FileResponseSchema),
  ])
  if (
    !Array.isArray(componentData.meta?.components) ||
    !Array.isArray(setData.meta?.component_sets) ||
    typeof file.version !== "string" ||
    !Array.isArray(file.document?.children)
  ) {
    throw new Error("Figma returned an incomplete published inventory or file version")
  }
  const pages = new Map(file.document.children.map((page) => [page.id, page.name]))
  const restIds = new Set(
    [...componentData.meta.components, ...setData.meta.component_sets].map((node) => node.node_id),
  )
  const mcpIds = new Set(mcpNodes.map((node) => node.nodeId))
  const mcpOnly = mcpNodes
    .filter((node) => !restIds.has(node.nodeId))
    .map((node) => ({
      node_id: node.nodeId,
      name: node.name,
      type: node.type,
      key: node.assetKey,
      containing_frame: { pageId: node.pageId, pageName: node.pageName },
    }))
  const sets = [
    ...setData.meta.component_sets,
    ...mcpOnly.filter((node) => node.type === "COMPONENT_SET"),
  ]
  const nodes: Record<string, z.infer<typeof NodeRecordSchema>> = {}
  async function fetchNodes(ids: string[]) {
    for (let start = 0; start < ids.length; start += 50) {
      const batch = ids.slice(start, start + 50)
      const query = new URLSearchParams({
        ids: batch.join(","),
        version: file.version,
        geometry: "paths",
      })
      const data = await get(`files/${fileKey}/nodes?${query}`, NodeDocumentsResponseSchema)
      for (const id of batch) {
        const record = data.nodes?.[id]
        if (!record?.document || record.document.id !== id) {
          throw new Error(
            `Figma node ${id} is missing at version ${file.version}; no snapshot was written`,
          )
        }
        nodes[id] = record
      }
    }
  }
  await fetchNodes(sets.map((node) => node.node_id))
  const variants = new Set(
    Object.values(nodes).flatMap((record) =>
      (record.document?.children ?? [])
        .filter((child) => child.type === "COMPONENT")
        .map((child) => child.id),
    ),
  )
  const components = [
    ...componentData.meta.components,
    ...mcpOnly.filter((node) => node.type === "COMPONENT"),
  ].filter((node) => !variants.has(node.node_id))
  await fetchNodes(components.map((node) => node.node_id))
  function publishedRecord(node: PublishedNode) {
    const pageId = node.containing_frame?.pageId ?? node.containing_frame?.page_id
    if (!pageId || !pages.has(pageId)) {
      throw new Error(`Figma node ${node.node_id} has no valid containing page`)
    }
    return {
      node_id: node.node_id,
      key: node.key,
      name: nodes[node.node_id]?.document?.name,
      containing_frame: { pageId, pageName: pages.get(pageId) },
      sources: [
        ...(mcpIds.has(node.node_id) ? ["mcp"] : []),
        ...(restIds.has(node.node_id) ? ["rest"] : []),
      ],
    }
  }
  return {
    fileKey,
    version: file.version,
    lastModified: file.lastModified,
    meta: {
      components: components.map(publishedRecord),
      component_sets: sets.map(publishedRecord),
    },
    nodes,
  }
}
