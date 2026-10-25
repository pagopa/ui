#!/usr/bin/env node
// Import layer contract (documented in
// .agents/skills/pagopa-ui-standards/references/definition-of-done.md).
// Run: `ui-cli check layers`.
import { walkFiles } from "../lib/fs.ts"
import { enterRoot } from "../lib/paths.ts"
import {
  parseSource,
  resolveSource,
  sourceDependencies,
  sourcePath,
} from "../lib/source-modules.ts"

const REMOVED_LAYERS = new Set([
  "atoms",
  "molecules",
  "organisms",
  "figma-primitives",
  "ui",
  "screens",
  "templates",
])
const LIBRARY_BOUNDARY = ["src/catalog"]
// Third-party runtimes are imported only from the primitives layer.
const THIRD_PARTY = ["@base-ui/react", "react-day-picker", "lucide-react"]
const FAMILIES = [
  "inputs",
  "navigation",
  "feedback",
  "content",
  "data-display",
  "composites",
  "overlays",
]
const LOWER_LAYERS = ["primitives", "icons", ...FAMILIES]

type Dependency = { target: string; runtime: boolean }

function category(file: string): string {
  const parts = file.split("/")
  if (parts[0] !== "src" || parts[1] !== "components") return "other"
  return parts[2] ?? "other"
}

function allowedLayers(): Map<string, Set<string>> {
  return new Map([
    ["primitives", new Set(["primitives", "icons"])],
    ["icons", new Set(["icons", "primitives"])],
    ...FAMILIES.map((family) => [family, new Set(LOWER_LAYERS)] as const),
  ])
}

export function runImportLayers(): number {
  const errors: string[] = []
  enterRoot()
  const allowed = allowedLayers()
  const graph = new Map<string, Dependency[]>()

  function checkTarget(file: string, target: string): void {
    const importer = category(file)
    if (importer === "other") return
    for (const boundary of LIBRARY_BOUNDARY) {
      if (target === boundary || target.startsWith(`${boundary}/`)) {
        errors.push(`${file}: library code must not import "${target}"`)
        return
      }
    }
    const targetCategory = category(target)
    if (targetCategory === "other") return
    if (REMOVED_LAYERS.has(targetCategory)) {
      errors.push(`${file}: imports removed layer "${target}"`)
    } else if (!allowed.get(importer)?.has(targetCategory)) {
      errors.push(`${file}: ${importer} must not import ${targetCategory} ("${target}")`)
    }
  }

  for (const file of walkFiles("src", (file) => /\.(ts|tsx)$/.test(file))) {
    if (REMOVED_LAYERS.has(category(file))) errors.push(`${file}: removed layer must not exist`)
    let dependencies
    try {
      dependencies = sourceDependencies(file, parseSource(file))
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
      continue
    }
    const edges: Dependency[] = []
    graph.set(file, edges)
    for (const { specifier, runtime } of dependencies) {
      if ((specifier === "cn" || specifier.startsWith("cn/")) && file !== "src/lib/cn.ts") {
        errors.push(`${file}: import the configured cn from "@/lib/cn" instead of "${specifier}"`)
      }
      const dependency = THIRD_PARTY.find(
        (name) => specifier === name || specifier.startsWith(`${name}/`),
      )
      if (dependency && file.startsWith("src/components/")) {
        const layer = category(file)
        if (layer !== "primitives") {
          errors.push(`${file}: only the primitives layer may import "${dependency}"`)
        }
      }
      const target = resolveSource(specifier, file) ?? sourcePath(specifier, file)
      if (target) edges.push({ target, runtime })
    }
  }

  for (const file of graph.keys()) {
    if (category(file) === "other") continue
    const reachable = new Set([file])
    function inspect(target: string): void {
      if (reachable.has(target)) return
      reachable.add(target)
      checkTarget(file, target)
      for (const edge of graph.get(target) ?? []) inspect(edge.target)
    }
    for (const edge of graph.get(file) ?? []) inspect(edge.target)
  }

  const visited = new Set<string>()
  const active: string[] = []
  function visit(file: string): void {
    const cycleStart = active.indexOf(file)
    if (cycleStart >= 0) {
      errors.push(`dependency cycle: ${[...active.slice(cycleStart), file].join(" -> ")}`)
      return
    }
    if (visited.has(file)) return
    active.push(file)
    for (const edge of graph.get(file) ?? []) {
      if (edge.runtime) visit(edge.target)
    }
    active.pop()
    visited.add(file)
  }
  for (const file of graph.keys()) visit(file)

  if (errors.length) {
    const violations = new Set(errors)
    console.error(`import layer violations (${violations.size}):`)
    for (const error of violations) console.error(`  ${error}`)
    return 1
  }
  console.log("import layers OK")
  return 0
}
