import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { sha256 } from "../lib/hash.ts"
import type { Workspace } from "../adapters/workspace.ts"
import { report, type CheckReport } from "../checks/report.ts"
import { readJson } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import {
  PictogramManifestSchema,
  type PictogramManifest,
  type PictogramManifestEntry,
} from "../schemas/artwork.ts"
import { committedFile, readRegistry } from "../records/committed.ts"
import { resolveProvenance } from "./asset-provenance.ts"
import { requireBulkRule, selectRuleNodes } from "./artwork/catalogue.ts"
import { assertGeneratedModule, propertyKey } from "./artwork/generate-module.ts"
import { assertPinnedManifest, readManifest, writeManifest } from "./artwork/manifest.ts"
import { assertStandaloneSvg, assertSvgDimensions } from "./artwork/svg.ts"
import { fetchFigmaImages } from "./rest.ts"
import { normalizeLive } from "./snapshot.ts"
import { figmaToken, type KeychainRunner } from "../adapters/figma-token.ts"

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

const backgrounds: Record<string, "light" | "dark"> = {
  "Background=Light": "light",
  "Background=Default": "light",
  "Background=Dark": "dark",
}

export interface PictogramOptions {
  input?: string
}

export async function checkPictograms(
  workspace: Workspace,
  options: PictogramOptions = {},
): Promise<CheckReport> {
  try {
    return report("pictograms", await runPictograms(workspace, "check", options.input))
  } catch (error) {
    return report("pictograms", "published pictogram identities and artwork must agree", [
      messageOf(error),
    ])
  }
}

export async function updatePictograms(workspace: Workspace, input: string): Promise<string> {
  return runPictograms(workspace, "write", input)
}

export async function exportPictograms(
  workspace: Workspace,
  input: string,
  env: NodeJS.ProcessEnv,
  run?: KeychainRunner,
): Promise<string> {
  return runPictograms(workspace, "export", input, env, run)
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

type PictogramMode = "export" | "write" | "check"
type PictogramContext = ReturnType<typeof loadPictogramContext>

function loadPictogramContext(workspace: Workspace, mode: PictogramMode, input?: string) {
  const snapshot = parseSchema(
    SnapshotSchema,
    readJson(committedFile("inventory", workspace.root, input)),
    "pictogram snapshot",
  )
  const fileKey = figmaFileKey(workspace)
  if (
    snapshot.fileKey !== fileKey ||
    (mode !== "check" && (typeof snapshot.version !== "string" || !snapshot.version))
  ) {
    throw new Error(
      "Pictogram export requires a full snapshot of the configured Figma file and version",
    )
  }
  const registry = readRegistry(committedFile("registry", workspace.root))
  const rule = requireBulkRule(registry, "figmaPictogramNames", "Pictograms")
  const manifestFile = path.join(workspace.artworkRoot, "src/assets/figma-pictograms/manifest.json")
  const publishedManifest = readManifest(manifestFile, PictogramManifestSchema)
  assertPinnedManifest(publishedManifest, fileKey, "Pictogram provenance")

  const roots = selectRuleNodes(registry, rule, normalizeLive(snapshot, { workspace }), workspace)
  if (!roots.length) throw new Error("The snapshot contains no published pictogram identities")
  const provenanceByNode = resolveProvenance(rule, new Set(roots.map((root) => root.nodeId)))
  const directory =
    mode === "check"
      ? path.join(workspace.artworkRoot, "src/assets/figma-pictograms")
      : path.join(workspace.root, ".figma/pictograms")
  const output =
    mode === "export"
      ? path.join(workspace.root, ".figma/pictograms")
      : path.join(workspace.artworkRoot, "src/assets/figma-pictograms")
  const sourceFile = path.join(workspace.artworkRoot, "src/components/icons/pictogram-assets.ts")
  return {
    snapshot,
    fileKey,
    publishedManifest,
    roots,
    provenanceByNode,
    directory,
    output,
    sourceFile,
  }
}

function snapshotEntries(context: PictogramContext, mode: PictogramMode) {
  const { snapshot, publishedManifest, roots, provenanceByNode } = context
  const entries: Record<string, PictogramManifestEntry> = {}
  const ids: string[] = []
  for (const root of roots) {
    if (mode === "check" && !snapshot.nodes) continue
    const document = snapshot.nodes?.[root.nodeId]?.document
    const provenance = provenanceByNode.get(root.nodeId)
    if (!provenance) throw new Error(`Missing provenance for pictogram ${root.nodeId}`)
    if (!root.designFingerprint) {
      throw new Error(`Pictogram ${root.nodeId} requires complete design evidence`)
    }
    const entry: PictogramManifestEntry = {
      name: publishedManifest?.entries[root.nodeId]?.name ?? root.name,
      provenance,
      designFingerprint: root.designFingerprint,
      light: { nodeId: "", file: "" },
      dark: { nodeId: "", file: "" },
    }
    for (const variant of document?.children ?? []) {
      const background = backgrounds[variant.name]
      if (
        variant.type !== "COMPONENT" ||
        !background ||
        entry[background].nodeId ||
        !/^\d+:\d+$/.test(variant.id)
      ) {
        throw new Error(
          `Pictogram ${root.nodeId} has an unsupported or duplicate variant: ${variant.name}`,
        )
      }
      entry[background] = { nodeId: variant.id, file: `${variant.id.replace(":", "-")}.svg` }
      ids.push(variant.id)
    }
    if (!entry.light.nodeId || !entry.dark.nodeId) {
      throw new Error(`Pictogram ${root.nodeId} requires complete light and dark design evidence`)
    }
    entries[root.nodeId] = entry
  }
  return { entries, ids }
}

function loadPictogramAssets(
  context: PictogramContext,
  mode: "write" | "check",
  expectedEntries: Record<string, PictogramManifestEntry>,
  assets: Map<string, string>,
): PictogramManifest {
  const { directory, roots, publishedManifest, provenanceByNode } = context
  const manifest = parseSchema(
    PictogramManifestSchema,
    readJson(path.join(directory, "manifest.json")),
    path.join(directory, "manifest.json"),
  )
  if (Object.keys(manifest.entries).length !== roots.length) {
    throw new Error("The asset manifest does not cover every pictogram")
  }
  for (const root of roots) {
    const entry = manifest.entries[root.nodeId]
    if (!entry || entry.designFingerprint !== root.designFingerprint) {
      throw new Error(`Pictogram ${root.nodeId} asset evidence is stale`)
    }
    entry.name = publishedManifest?.entries[root.nodeId]?.name ?? entry.name
    const provenance = provenanceByNode.get(root.nodeId)
    if (
      mode === "check" &&
      JSON.stringify(entry.provenance ?? null) !== JSON.stringify(provenance ?? null)
    ) {
      throw new Error(`Pictogram ${root.nodeId} provenance evidence is stale`)
    }
    for (const background of ["light", "dark"] as const) {
      const variant = entry[background]
      if (
        !/^\d+:\d+$/.test(variant?.nodeId) ||
        variant.file !== `${variant.nodeId.replace(":", "-")}.svg`
      ) {
        throw new Error(`Pictogram ${root.nodeId} has an invalid asset identity or path`)
      }
      if (
        expectedEntries[root.nodeId] &&
        expectedEntries[root.nodeId][background].nodeId !== variant.nodeId
      ) {
        throw new Error(`Pictogram ${root.nodeId} has the wrong ${background} variant identity`)
      }
      const source = fs.readFileSync(path.join(directory, variant.file), "utf8")
      if (sha256(source) !== variant.sha256) {
        throw new Error(`Pictogram ${variant.nodeId} asset checksum does not match`)
      }
      assets.set(variant.nodeId, source)
    }
  }
  if (mode === "write") {
    for (const root of roots) {
      const entry = manifest.entries[root.nodeId]
      const provenance = provenanceByNode.get(root.nodeId)
      if (entry && provenance) entry.provenance = provenance
    }
  }
  return manifest
}

async function validatePictogramAssets(
  entries: Record<string, PictogramManifestEntry>,
  assets: Map<string, string>,
): Promise<void> {
  const publicNames = new Set<string>()
  for (const entry of Object.values(entries)) {
    if (!entry.name.trim() || publicNames.has(entry.name)) {
      throw new Error("Every pictogram identity requires a unique public name")
    }
    publicNames.add(entry.name)
    for (const background of ["light", "dark"] as const) {
      const variant = entry[background]
      const source = assets.get(variant.nodeId)
      if (!source) throw new Error(`Missing pictogram artwork for ${variant.nodeId}`)
      assertStandaloneSvg(source, variant.nodeId, { allowData: true })
      await assertSvgDimensions(source, variant.nodeId)
      variant.sha256 = sha256(source)
    }
  }
}

function pictogramModule(entries: Record<string, PictogramManifestEntry>): string {
  const imports: string[] = []
  const declarations: string[] = []
  const byName: string[] = []
  for (const [id, entry] of Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))) {
    const variants: string[] = []
    for (const background of ["light", "dark"] as const) {
      const variant = entry[background]
      const variable = `asset_${variant.nodeId.replace(":", "_")}`
      imports.push(
        `import ${variable} from "../../assets/figma-pictograms/${variant.file}?no-inline"`,
      )
      variants.push(`${background}: { nodeId: "${variant.nodeId}", url: ${variable} }`)
    }
    declarations.push(
      `${JSON.stringify(id)}: { name: ${JSON.stringify(entry.name)}, ${variants.join(", ")} }`,
    )
    byName.push(`${propertyKey(entry.name)}: pictogramAssets[${JSON.stringify(id)}]`)
  }
  byName.sort()
  return `// Generated by packages/ui-cli/src/figma/pictograms.ts; identity is the Figma nodeId.\n${imports.join("\n")}\nimport type { FigmaPictogramName } from "./figma-inventory"\n\nexport type PictogramAsset = {\n  name: FigmaPictogramName\n  light: { nodeId: string; url: string }\n  dark: { nodeId: string; url: string }\n}\n\nexport const pictogramAssets: Record<string, PictogramAsset> = {\n${declarations.join(",\n")}\n}\n\n/** Public-name index of the node-keyed catalogue; exhaustive by construction. */\nexport const pictogramAssetsByName = {\n${byName.join(",\n")}\n} as const satisfies Record<FigmaPictogramName, PictogramAsset>\n`
}

function publishPictograms(
  context: PictogramContext,
  mode: PictogramMode,
  manifest: PictogramManifest,
  assets: Map<string, string>,
): void {
  const { sourceFile, output } = context
  const source = pictogramModule(manifest.entries)
  if (mode === "check") {
    assertGeneratedModule(sourceFile, source, "Generated pictogram module")
  } else {
    fs.mkdirSync(output, { recursive: true })
    for (const entry of Object.values(manifest.entries)) {
      for (const background of ["light", "dark"] as const) {
        const variant = entry[background]
        const art = assets.get(variant.nodeId)
        if (!art) throw new Error(`Missing pictogram artwork for ${variant.nodeId}`)
        fs.writeFileSync(path.join(output, variant.file), art)
      }
    }
    writeManifest(path.join(output, "manifest.json"), manifest)
    if (mode === "write") {
      fs.mkdirSync(path.dirname(sourceFile), { recursive: true })
      fs.writeFileSync(sourceFile, source)
    }
  }
}

async function runPictograms(
  workspace: Workspace,
  mode: PictogramMode,
  input?: string,
  env?: NodeJS.ProcessEnv,
  run?: KeychainRunner,
): Promise<string> {
  if (mode !== "check" && !input)
    throw new Error(`ui-cli ${mode} pictograms needs --input <snapshot>`)
  const token = mode === "export" ? figmaToken(env ?? {}, run) : ""
  const context = loadPictogramContext(workspace, mode, input)
  const { entries, ids } = snapshotEntries(context, mode)
  const assets =
    mode === "export"
      ? await fetchFigmaImages(context.fileKey, context.snapshot.version ?? "", ids, token)
      : new Map<string, string>()
  const manifest =
    mode === "export"
      ? { fileKey: context.fileKey, version: context.snapshot.version ?? "", entries }
      : loadPictogramAssets(context, mode, entries, assets)
  await validatePictogramAssets(manifest.entries, assets)
  publishPictograms(context, mode, manifest, assets)
  return `Pictograms ${mode}: ${context.roots.length} roots, ${assets.size} individual SVG variants -> ${context.output}`
}
