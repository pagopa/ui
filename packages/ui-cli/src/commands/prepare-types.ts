// Makes the emitted `.d.ts` files consumable: alias-free ESM, with the types of
// the artwork package inlined so the packed artifact stays standalone.
import fs from "node:fs"
import path from "node:path"

import { enterRoot } from "../lib/paths.ts"
import { parseSource, sourceDependencies } from "../lib/source-modules.ts"

export function runPrepareTypes(): number {
  enterRoot()
  const root = path.resolve("dist/types")

  // The artwork is bundled into the library at build time, so its declarations
  // must travel in the tarball: copy them under `dist/types/artwork` and let the
  // rewrite below point `pagopa-ui-artwork` there.
  const artworkTypes = path.resolve(process.env.PAGOPA_UI_ARTWORK_TYPES ?? "../artwork/dist/types")
  if (!fs.existsSync(path.join(artworkTypes, "index.d.ts"))) {
    throw new Error(
      `missing ${artworkTypes}/index.d.ts — run "pnpm nx run pagopa-ui-artwork:build"`,
    )
  }
  const artworkRoot = path.join(root, "artwork")
  fs.rmSync(artworkRoot, { recursive: true, force: true })
  fs.cpSync(artworkTypes, artworkRoot, { recursive: true })

  const files = fs
    .readdirSync(root, { recursive: true })
    .filter((file): file is string => typeof file === "string" && file.endsWith(".d.ts"))
  for (const relative of files) {
    const file = path.join(root, relative)
    let source = fs.readFileSync(file, "utf8")
    const edits = new Map<number, { end: number; value: string }>()
    for (const request of sourceDependencies(file, parseSource(file))) {
      const packageType = request.specifier === "pagopa-ui-artwork"
      if (
        !packageType &&
        !request.specifier.startsWith(".") &&
        !request.specifier.startsWith("@/")
      ) {
        continue
      }
      const target = packageType
        ? path.join(artworkRoot, "index.d.ts")
        : request.specifier.startsWith("@/")
          ? path.join(root, request.specifier.slice(2))
          : path.resolve(path.dirname(file), request.specifier)
      const candidates = [
        target.endsWith(".d.ts") ? target : `${target.replace(/\.(?:jsx?|tsx?)$/, "")}.d.ts`,
        path.join(target, "index.d.ts"),
      ]
      const declaration = candidates.find(
        (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
      )
      if (!declaration || path.relative(root, declaration).startsWith(`..${path.sep}`)) {
        throw new Error(`${file}: cannot resolve emitted declaration ${request.specifier}`)
      }
      let specifier = path
        .relative(path.dirname(file), declaration)
        .replace(/\.d\.ts$/, ".js")
        .split(path.sep)
        .join("/")
      if (!specifier.startsWith(".")) specifier = `./${specifier}`
      edits.set(request.start, { end: request.end, value: JSON.stringify(specifier) })
    }
    for (const [start, edit] of [...edits].sort(([a], [b]) => b - a)) {
      source = source.slice(0, start) + edit.value + source.slice(edit.end)
    }
    fs.writeFileSync(file, source)
  }
  console.log(`library declarations OK: ${files.length} alias-free ESM modules, artwork inlined`)
  return 0
}
