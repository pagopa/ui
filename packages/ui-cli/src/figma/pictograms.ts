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
import { assertStandaloneSvg, assertSvgDimensions, pruneOrphanSvgs } from "./artwork/svg.ts"
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
  const registry = readRegistry(workspace.root)
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

// The identifier and the file name of one pictogram module, derived from its
// published name so the catalogue and the per-pictogram imports agree.
function pictogramSlug(name: string): { fileName: string; identifier: string } {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean)
  if (!words.length) throw new Error(`Pictogram name ${JSON.stringify(name)} has no word`)
  const normalise = (word: string): string =>
    /^[A-Z0-9]{2,}$/.test(word) ? word.toLowerCase() : word[0].toLowerCase() + word.slice(1)
  const [first, ...rest] = words
  const identifier =
    normalise(first) + rest.map((w) => w[0].toUpperCase() + normalise(w).slice(1)).join("")
  const fileName = identifier.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
  return { fileName, identifier }
}

export type GeneratedModule = { file: string; source: string }

// One module per pictogram so a consumer that imports a single illustration
// never reaches the whole set; the registry re-exports them by public name.
export function pictogramModules(entries: Record<string, PictogramManifestEntry>): {
  types: GeneratedModule
  registry: GeneratedModule
  pictograms: GeneratedModule[]
} {
  const identifiers = new Map<string, string>()
  const imports: string[] = []
  const declarations: string[] = []
  const byName: string[] = []
  const pictograms: GeneratedModule[] = []
  for (const [id, entry] of Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))) {
    const { fileName, identifier } = pictogramSlug(entry.name)
    const collision = identifiers.get(identifier)
    if (collision)
      throw new Error(
        `Pictograms ${JSON.stringify(collision)} and ${JSON.stringify(entry.name)} share the module ${fileName}`,
      )
    identifiers.set(identifier, entry.name)
    const fileImports: string[] = []
    const variants: string[] = []
    for (const background of ["light", "dark"] as const) {
      const variant = entry[background]
      const variable = `asset_${variant.nodeId.replace(":", "_")}`
      const specifier = `../../../assets/figma-pictograms/${variant.file}?no-inline`
      fileImports.push(`import ${variable} from ${JSON.stringify(specifier)}`)
      variants.push(
        `${background}: { nodeId: ${JSON.stringify(variant.nodeId)}, url: ${variable} }`,
      )
    }
    pictograms.push({
      file: `pictograms/${fileName}.ts`,
      source: `// Generated by packages/ui-cli/src/figma/pictograms.ts; pictogram ${JSON.stringify(entry.name)}.\n${fileImports.join("\n")}\nimport type { PictogramAsset } from "../pictogram-asset"\n\nexport const ${identifier}: PictogramAsset = {\n  name: ${JSON.stringify(entry.name)},\n  ${variants.join(",\n  ")},\n}\n`,
    })
    imports.push(`import { ${identifier} } from "./pictograms/${fileName}"`)
    declarations.push(`${JSON.stringify(id)}: ${identifier}`)
    byName.push(`${propertyKey(entry.name)}: ${identifier}`)
  }
  byName.sort()
  return {
    types: {
      file: "pictogram-asset.ts",
      source:
        '// Generated by packages/ui-cli/src/figma/pictograms.ts; the shape every pictogram module publishes.\nimport type { FigmaPictogramName } from "./figma-inventory"\n\nexport type PictogramAsset = {\n  name: FigmaPictogramName\n  light: { nodeId: string; url: string }\n  dark: { nodeId: string; url: string }\n}\n',
    },
    registry: {
      file: "pictogram-assets.ts",
      source: `// Generated by packages/ui-cli/src/figma/pictograms.ts; identity is the Figma nodeId.\n${imports.join("\n")}\nimport type { PictogramAsset } from "./pictogram-asset"\nimport type { FigmaPictogramName } from "./figma-inventory"\n\nexport type { PictogramAsset }\n\nexport const pictogramAssets: Record<string, PictogramAsset> = {\n  ${declarations.join(",\n  ")},\n}\n\n/** Public-name index of the node-keyed catalogue; exhaustive by construction. */\nexport const pictogramAssetsByName = {\n  ${byName.join(",\n  ")},\n} as const satisfies Record<FigmaPictogramName, PictogramAsset>\n`,
    },
    pictograms,
  }
}

// A pictogram module left behind by a renamed or retired illustration would
// keep importing artwork the manifest no longer owns.
function stalePictogramModules(directory: string, pictograms: GeneratedModule[]): string[] {
  const folder = path.join(directory, "pictograms")
  if (!fs.existsSync(folder)) return []
  const expected = new Set(pictograms.map((module) => path.basename(module.file)))
  return fs
    .readdirSync(folder)
    .filter((file) => file.endsWith(".ts") && !expected.has(file))
    .map((file) => `pictograms/${file}`)
    .sort()
}

function publishPictograms(
  context: PictogramContext,
  mode: PictogramMode,
  manifest: PictogramManifest,
  assets: Map<string, string>,
): void {
  const { sourceFile, output } = context
  const modules = pictogramModules(manifest.entries)
  const directory = path.dirname(sourceFile)
  const expected = [modules.types, modules.registry, ...modules.pictograms]
  const generated = (module: GeneratedModule): string => path.join(directory, module.file)
  if (mode === "check") {
    for (const module of expected)
      assertGeneratedModule(
        generated(module),
        module.source,
        `Generated pictogram module ${module.file}`,
      )
    for (const stale of stalePictogramModules(directory, modules.pictograms))
      throw new Error(`Generated pictogram module ${stale} has no manifest entry; run --write`)
  } else {
    fs.mkdirSync(output, { recursive: true })
    const written = new Set<string>()
    for (const entry of Object.values(manifest.entries)) {
      for (const background of ["light", "dark"] as const) {
        const variant = entry[background]
        const art = assets.get(variant.nodeId)
        if (!art) throw new Error(`Missing pictogram artwork for ${variant.nodeId}`)
        fs.writeFileSync(path.join(output, variant.file), art)
        written.add(variant.file)
      }
    }
    pruneOrphanSvgs(output, written)
    writeManifest(path.join(output, "manifest.json"), manifest)
    if (mode === "write") {
      for (const module of expected) {
        fs.mkdirSync(path.dirname(generated(module)), { recursive: true })
        fs.writeFileSync(generated(module), module.source)
      }
      for (const stale of stalePictogramModules(directory, modules.pictograms))
        fs.rmSync(path.join(directory, stale))
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
