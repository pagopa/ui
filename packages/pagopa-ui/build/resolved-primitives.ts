import type { Plugin } from "vite"

/**
 * The Figma primitive layer is the build-time input the `--pui-*` contract is
 * generated from, not part of the published CSS (ADR-0013 RD2, retired by its
 * §5 trigger once every reference resolves). The library build reads the
 * primitives, substitutes each `var(--figma-*)` with the literal it names and
 * drops the declarations, so the shipped stylesheet carries one namespace: the
 * `--pui-*`, `--text-*`, `--radius-*` and `--shadow-*` names a host reads and
 * overrides. Nothing named `--figma-*` reaches a consumer.
 */
const DECLARATION = /(--figma-[a-z0-9-]+)\s*:\s*([^;{}]+)/g
const REFERENCE = /var\(\s*(--figma-[a-z0-9-]+)\s*(?:,[^()]*)?\)/g
const PRIMITIVE_NAME = /--figma-/

export function resolvePrimitives(source: string, file = "stylesheet"): string {
  const declared = new Map<string, string>()
  for (const match of source.matchAll(DECLARATION)) {
    const [, name, value] = match
    if (name && value && !declared.has(name)) declared.set(name, value.trim())
  }

  const resolved = new Map<string, string>()
  const resolve = (name: string, seen: string[]): string => {
    const cached = resolved.get(name)
    if (cached !== undefined) return cached
    const value = declared.get(name)
    if (value === undefined) throw new Error(`${file}: ${name} is referenced but never declared`)
    if (seen.includes(name))
      throw new Error(`${file}: ${[...seen, name].join(" → ")} is a circular primitive reference`)
    const literal = value.replace(REFERENCE, (_, reference: string) =>
      resolve(reference, [...seen, name]),
    )
    resolved.set(name, literal)
    return literal
  }

  const substituted = source.replace(REFERENCE, (_, name: string) => resolve(name, []))
  const stripped = substituted.replace(/--figma-[a-z0-9-]+\s*:\s*[^;{}]*(?:;|(?=\}))/g, "")
  if (PRIMITIVE_NAME.test(stripped)) {
    throw new Error(`${file}: the Figma primitive layer survived resolution`)
  }
  return stripped
}

export function resolvedPrimitives(): Plugin {
  return {
    name: "pagopa-ui:resolved-primitives",
    apply: "build",
    // After `vite:css-post`, which is where the library stylesheet becomes an asset.
    enforce: "post",
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== "asset" || !asset.fileName.endsWith(".css")) continue
        const source =
          typeof asset.source === "string"
            ? asset.source
            : Buffer.from(asset.source).toString("utf8")
        if (!PRIMITIVE_NAME.test(source)) continue
        asset.source = resolvePrimitives(source, asset.fileName)
      }
    },
  }
}
