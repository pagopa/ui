// Makes the emitted `.d.ts` files consumable: alias-free ESM, with the types of
// the bundled workspace packages inlined so the packed artifact stays standalone.
import fs from "node:fs"
import path from "node:path"

import type { Workspace } from "../adapters/workspace.ts"
import { createSourceModules } from "../lib/source-modules.ts"

// A bundled package is not a dependency of the published artifact: its
// declarations travel inside `dist/types/<folder>`.
type BundledTypes = { folder: string; types: string }

export function prepareTypes(workspace: Workspace): string {
  const { parseSource, sourceDependencies } = createSourceModules(workspace)
  const BUNDLED: Record<string, BundledTypes> = {
    "pagopa-ui-artwork": {
      folder: "artwork",
      types: path.join(workspace.artworkRoot, "dist/types"),
    },
    "pagopa-ui-tokens": { folder: "tokens", types: path.join(workspace.tokensRoot, "dist/types") },
  }
  const root = path.join(workspace.root, "dist/types")

  // The artwork and the tokens are bundled into the library at build time, so
  // their declarations must travel in the tarball: copy them under
  // `dist/types/<folder>` and let the rewrite below point the specifier there.
  const bundled = new Map<string, string>()
  for (const [name, entry] of Object.entries(BUNDLED)) {
    const types = path.resolve(entry.types)
    if (!fs.existsSync(path.join(types, "index.d.ts"))) {
      throw new Error(`missing ${types}/index.d.ts — run "pnpm nx run ${name}:build"`)
    }
    const target = path.join(root, entry.folder)
    fs.rmSync(target, { recursive: true, force: true })
    fs.cpSync(types, target, { recursive: true })
    bundled.set(name, target)
  }

  const files = fs
    .readdirSync(root, { recursive: true })
    .filter((file): file is string => typeof file === "string" && file.endsWith(".d.ts"))
  for (const relative of files) {
    const file = path.join(root, relative)
    let source = fs.readFileSync(file, "utf8")
    const edits = new Map<number, { end: number; value: string }>()
    for (const request of sourceDependencies(file, parseSource(file))) {
      const packageRoot = bundled.get(request.specifier)
      if (
        !packageRoot &&
        !request.specifier.startsWith(".") &&
        !request.specifier.startsWith("@/")
      ) {
        continue
      }
      const target = packageRoot
        ? path.join(packageRoot, "index.d.ts")
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
  return `library declarations OK: ${files.length} alias-free ESM modules, ${Object.keys(BUNDLED).length} bundled packages inlined`
}
