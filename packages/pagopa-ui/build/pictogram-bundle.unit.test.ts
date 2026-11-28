import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { build } from "vite"
import { expect, test } from "vitest"

import manifest from "../package.json" with { type: "json" }

// The library ships one module per pictogram, so a component that draws a
// single illustration must not reach the rest of the catalogue. This bundles a
// consumer of the component and reads what came out, because the seam lives in
// the module graph rather than in any single file.
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const ARTWORK = path.join(ROOT, "../artwork/src/assets/figma-pictograms")
const externals = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies })

interface Pictograms {
  entries: Record<string, { name: string; light: { file: string }; dark: { file: string } }>
}

const pictograms: Pictograms = JSON.parse(
  fs.readFileSync(path.join(ARTWORK, "manifest.json"), "utf8"),
)

function filesOf(name: string): string[] {
  const entry = Object.values(pictograms.entries).find((candidate) => candidate.name === name)
  if (!entry) throw new Error(`The pictogram manifest has no ${name}`)
  return [entry.light.file, entry.dark.file]
}

async function bundle(consumer: string): Promise<string[]> {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    root: ROOT,
    resolve: { alias: { "@": path.join(ROOT, "src") } },
    // The library is authored in the automatic JSX runtime; the closest
    // tsconfig owns no `jsx` setting, so the transform is stated here.
    esbuild: { jsx: "automatic" },
    plugins: [
      {
        name: "consumer",
        resolveId: (id) => (id === "virtual:consumer" ? `\0${id}` : null),
        load: (id) => (id === "\0virtual:consumer" ? consumer : null),
      },
    ],
    build: {
      write: false,
      minify: false,
      rollupOptions: {
        input: { consumer: "virtual:consumer" },
        external: (id) => externals.some((name) => id === name || id.startsWith(`${name}/`)),
        output: { format: "es" },
      },
    },
  })
  const output = Array.isArray(result) ? result[0].output : "output" in result ? result.output : []
  return output
    .filter((emitted) => emitted.fileName.endsWith(".svg"))
    .map((emitted) => emitted.fileName.replace(/^.*\//, ""))
}

const stem = (file: string): string => file.slice(0, -".svg".length)

// Hashed asset names keep the source stem first, so a stem identifies its file.
function drewPictograms(assets: string[], files: string[]): boolean {
  return files.every((file) => assets.some((asset) => asset.startsWith(`${stem(file)}-`)))
}

test("a component that draws one pictogram does not bundle the catalogue", async () => {
  const assets = await bundle(
    'import { Table } from "@/components/data-display/table"\nexport { Table }\n',
  )
  expect(assets).toHaveLength(2)
  expect(drewPictograms(assets, filesOf("Message"))).toBe(true)
})

test("the name-indexed pictogram component still carries every illustration", async () => {
  const assets = await bundle(
    'import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"\nexport { PagoPAPictogram }\n',
  )
  expect(assets.length).toBeGreaterThan(Object.keys(pictograms.entries).length)
})
