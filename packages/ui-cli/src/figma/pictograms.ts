import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { sha256 } from "../lib/hash.ts"
import { readJson } from "../lib/json.ts"
import { artworkPath, enterRoot } from "../lib/paths.ts"
import { parseSchema } from "../lib/validate.ts"
import {
  PictogramManifestSchema,
  type PictogramManifest,
  type PictogramManifestEntry,
} from "../schemas/artwork.ts"
import { RegistrySchema } from "../schemas/catalogue.ts"
import { resolveProvenance } from "./asset-provenance.ts"
import { requireBulkRule, selectRuleNodes } from "./artwork/catalogue.ts"
import { assertGeneratedModule, propertyKey } from "./artwork/generate-module.ts"
import { assertPinnedManifest, readManifest, writeManifest } from "./artwork/manifest.ts"
import { assertStandaloneSvg, assertSvgDimensions } from "./artwork/svg.ts"
import { fetchFigmaImages } from "./rest.ts"
import { fileKeyFromSource, normalizeLive } from "./snapshot.ts"
import { requireFigmaToken } from "./token.ts"

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

export async function runPictograms(argv: string[] = process.argv.slice(2)): Promise<number> {
  enterRoot()
  const mode = argv[0]
  if (
    !["--export", "--write", "--check"].includes(mode ?? "") ||
    !(argv.length === 1 || (argv.length === 3 && argv[1] === "--input" && argv[2])) ||
    (mode !== "--check" && argv.length !== 3)
  ) {
    throw new Error(
      "Usage: ui-cli assets pictograms <--export|--write|--check> [--input <full REST snapshot>]",
    )
  }
  if (mode === "--export") requireFigmaToken()
  const snapshot = parseSchema(
    SnapshotSchema,
    readJson(argv[2] ?? "src/catalog/figma/inventory.json"),
    "pictogram snapshot",
  )
  const fileKey = fileKeyFromSource()
  if (
    snapshot.fileKey !== fileKey ||
    (mode !== "--check" && (typeof snapshot.version !== "string" || !snapshot.version))
  ) {
    throw new Error(
      "Pictogram export requires a full snapshot of the configured Figma file and version",
    )
  }
  const registry = parseSchema(
    RegistrySchema,
    readJson("src/catalog/figma/registry.json"),
    "registry",
  )
  const rule = requireBulkRule(registry, "figmaPictogramNames", "Pictograms")
  const manifestFile = artworkPath("src/assets/figma-pictograms/manifest.json")
  const publishedManifest = readManifest(manifestFile, PictogramManifestSchema)
  assertPinnedManifest(publishedManifest, fileKey, "Pictogram provenance")

  const roots = selectRuleNodes(registry, rule, normalizeLive(snapshot))
  if (!roots.length) throw new Error("The snapshot contains no published pictogram identities")
  const provenanceByNode = resolveProvenance(rule, new Set(roots.map((root) => root.nodeId)))

  let entries: Record<string, PictogramManifestEntry> = {}
  const ids: string[] = []
  for (const root of roots) {
    if (mode === "--check" && !snapshot.nodes) continue
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

  const directory =
    mode === "--check" ? artworkPath("src/assets/figma-pictograms") : ".figma/pictograms"
  const assets =
    mode === "--export" ? await fetchFigmaImages(fileKey, snapshot.version ?? "", ids) : new Map()

  let manifest: PictogramManifest | undefined
  if (mode !== "--export") {
    manifest = parseSchema(
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
        mode === "--check" &&
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
        if (entries[root.nodeId] && entries[root.nodeId][background].nodeId !== variant.nodeId) {
          throw new Error(`Pictogram ${root.nodeId} has the wrong ${background} variant identity`)
        }
        const source = fs.readFileSync(path.join(directory, variant.file), "utf8")
        if (sha256(source) !== variant.sha256) {
          throw new Error(`Pictogram ${variant.nodeId} asset checksum does not match`)
        }
        assets.set(variant.nodeId, source)
      }
    }
    entries = manifest.entries
    if (mode === "--write") {
      for (const root of roots) {
        const entry = entries[root.nodeId]
        const provenance = provenanceByNode.get(root.nodeId)
        if (entry && provenance) entry.provenance = provenance
      }
    }
  }

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

  const output =
    mode === "--export" ? ".figma/pictograms" : artworkPath("src/assets/figma-pictograms")
  manifest ??= { fileKey, version: snapshot.version ?? "", entries }

  const sourceFile = artworkPath("src/components/icons/pictogram-assets.ts")
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
  const source = `// Generated by packages/ui-cli/src/figma/pictograms.ts; identity is the Figma nodeId.\n${imports.join("\n")}\nimport type { FigmaPictogramName } from "./figma-inventory"\n\nexport type PictogramAsset = {\n  name: FigmaPictogramName\n  light: { nodeId: string; url: string }\n  dark: { nodeId: string; url: string }\n}\n\nexport const pictogramAssets: Record<string, PictogramAsset> = {\n${declarations.join(",\n")}\n}\n\n/** Public-name index of the node-keyed catalogue; exhaustive by construction. */\nexport const pictogramAssetsByName = {\n${byName.join(",\n")}\n} as const satisfies Record<FigmaPictogramName, PictogramAsset>\n`

  if (mode === "--check") {
    assertGeneratedModule(sourceFile, source, "Generated pictogram module")
  } else {
    fs.mkdirSync(output, { recursive: true })
    for (const entry of Object.values(entries)) {
      for (const background of ["light", "dark"] as const) {
        const variant = entry[background]
        const art = assets.get(variant.nodeId)
        if (!art) throw new Error(`Missing pictogram artwork for ${variant.nodeId}`)
        fs.writeFileSync(path.join(output, variant.file), art)
      }
    }
    writeManifest(path.join(output, "manifest.json"), manifest)
    if (mode === "--write") {
      fs.mkdirSync(path.dirname(sourceFile), { recursive: true })
      fs.writeFileSync(sourceFile, source)
    }
  }
  console.log(
    `Pictograms ${String(mode).slice(2)}: ${roots.length} roots, ${assets.size} individual SVG variants -> ${output}`,
  )
  return 0
}
