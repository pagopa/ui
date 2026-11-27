import fs from "node:fs"
import path from "node:path"
import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import { output, type ParityOutput } from "./output.ts"
import { formatSpecTree, loadExport, nodeSpec, sourceNode, variantsOf } from "./source.ts"

export type SourceOptions = {
  nodeId: string
  input?: string
  depth?: number
  compact?: boolean
  json?: boolean
  png?: string | boolean
}

/** The eight bytes every PNG starts with; anything else is not the artwork asked for. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function isPng(buffer: Buffer): boolean {
  return buffer.subarray(0, PNG_SIGNATURE.length).equals(Buffer.from(PNG_SIGNATURE))
}

export async function readSource(
  workspace: Workspace,
  options: SourceOptions,
  images?: (key: string, version: string, ids: string[]) => Promise<Map<string, Buffer>>,
): Promise<ParityOutput> {
  const project = loadExport(workspace, options.input)
  const err = [`source: ${project.file} (${project.origin})`]
  const node = sourceNode(project, options.nodeId.replace("-", ":"))
  if (!node) return output(2, [], [...err, `${options.nodeId} is not in the pinned export`])
  if (options.png) {
    if (!images) throw new UsageError("--png needs a Figma image adapter")
    const file = workspace.path(
      typeof options.png === "string"
        ? options.png
        : `.figma/parity/source/${node.id.replace(":", "-")}.png`,
    )
    const { fileKey } = project.raw
    const version = project.version
    if (!fileKey || !version)
      throw new UsageError("--png needs the pinned export's fileKey and version")
    const buffer = (await images(fileKey, version, [node.id])).get(node.id)
    if (!buffer) throw new UsageError(`Figma rendered no PNG for ${node.id}`)
    if (!isPng(buffer)) throw new UsageError(`Figma answered ${node.id} without a PNG payload`)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, buffer)
    err.push(`png: ${file} (version ${version})`)
  }
  const spec = nodeSpec(node, { depth: options.depth ?? 2 })
  const variants = variantsOf(node)
  const variantLines = variants.map((item) => `  variant ${item.nodeId} ${item.name}`)
  const out = options.compact
    ? [...formatSpecTree(spec), ...variantLines]
    : options.json
      ? [JSON.stringify({ spec, variants }, null, 2)]
      : [JSON.stringify(spec, null, 2), ...variantLines]
  return output(0, out, err, { spec, variants })
}
