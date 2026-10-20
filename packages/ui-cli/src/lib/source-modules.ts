import fs from "node:fs"
import path from "node:path"
import { parseSync, Visitor, type Node } from "oxc-parser"
import { z } from "zod"

import { isSchema } from "./validate.ts"

import { absolutePath, fileIdentity } from "./paths.ts"

// Source identities are package-relative paths (`src/…`) for the design system
// and workspace-relative paths (`apps/…`) for the stories; `absolutePath` reads
// each against its base, so a story in the app resolves the package modules it
// imports.
const absolute = absolutePath

const NodeSchema = z.looseObject({ type: z.string() })

function isNode(value: unknown): value is Node {
  return isSchema(NodeSchema, value)
}

function propertyKeyName(key: unknown): string | undefined {
  if (!key || typeof key !== "object") return undefined
  if ("name" in key && typeof key.name === "string") return key.name
  if ("value" in key && typeof key.value === "string") return key.value
  return undefined
}

export function parseSource(file: string): ReturnType<typeof parseSync> {
  const parsed = parseSync(file, fs.readFileSync(absolute(file), "utf8"))
  if (parsed.errors.length) {
    throw new Error(`${file}: ${parsed.errors.map((error) => error.message).join("; ")}`)
  }
  return parsed
}

export function sourcePath(specifier: string, fromFile: string): string | null {
  if (specifier.startsWith("@/")) return path.normalize(path.join("src", specifier.slice(2)))
  if (specifier.startsWith(".")) return path.normalize(path.join(path.dirname(fromFile), specifier))
  return null
}

export function resolveSource(specifier: string, fromFile: string): string | null {
  const target = sourcePath(specifier, fromFile)
  if (!target) return null
  const candidates = [
    target,
    ...[".ts", ".tsx", ".js", ".jsx", ".json"].map((extension) => target + extension),
    ...["index.ts", "index.tsx", "index.js", "index.jsx"].map((name) => path.join(target, name)),
  ]
  const resolved = candidates.find((candidate) => {
    const target = absolute(candidate)
    return fs.existsSync(target) && fs.statSync(target).isFile()
  })
  return resolved ? fileIdentity(absolute(resolved)) : null
}

export function sourceDependencies(
  file: string,
  parsed: ReturnType<typeof parseSync>,
): Array<{ specifier: string; start: number; end: number; runtime: boolean }> {
  const dependencies = [
    ...parsed.module.staticImports.map((item) => ({
      specifier: item.moduleRequest.value,
      start: item.moduleRequest.start,
      end: item.moduleRequest.end,
      runtime: !item.entries.length || item.entries.some((entry) => !entry.isType),
    })),
    ...parsed.module.staticExports.flatMap((item) =>
      item.entries.flatMap((entry) =>
        entry.moduleRequest
          ? [
              {
                specifier: entry.moduleRequest.value,
                start: entry.moduleRequest.start,
                end: entry.moduleRequest.end,
                runtime: !entry.isType,
              },
            ]
          : [],
      ),
    ),
  ]
  function addLiteral(node: unknown, runtime = true): void {
    if (!isNode(node) || node.type !== "Literal" || typeof node.value !== "string") {
      throw new Error(`${file}: dynamic imports must have a literal module path`)
    }
    const start = typeof node.start === "number" ? node.start : 0
    const end = typeof node.end === "number" ? node.end : 0
    dependencies.push({ specifier: node.value, start, end, runtime })
  }
  new Visitor({
    ImportExpression(node) {
      addLiteral(node.source)
    },
    CallExpression(node) {
      if (node.callee.type === "Identifier" && node.callee.name === "require") {
        addLiteral(node.arguments[0])
      }
    },
    TSExternalModuleReference(node) {
      addLiteral(node.expression)
    },
    TSImportType(node) {
      addLiteral(node.source, false)
    },
  }).visit(parsed.program)
  return dependencies
}

type ExpressionWrapper = Node & { expression: Node }

function isExpressionWrapper(node: Node): node is ExpressionWrapper {
  return (
    ["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression"].includes(node.type) &&
    "expression" in node &&
    isNode(node.expression)
  )
}

function expression(node: Node | null | undefined): Node | null | undefined {
  if (!node) return node
  return isExpressionWrapper(node) ? expression(node.expression) : node
}

const exportCache = new Map<string, Map<string, string>>()

// The Storybook `title` of a story file: the `title` property of the meta
// object behind the default export, resolved through its local binding (and the
// `satisfies Meta<…>` wrapper). Used by the story taxonomy contract.
export function storyTitle(file: string): string | undefined {
  const program = parseSource(file).program
  const bindings = new Map<string, Node | null | undefined>()
  let meta: Node | null | undefined
  for (const statement of program.body) {
    const declaration = expression("declaration" in statement ? statement.declaration : statement)
    if (declaration?.type === "VariableDeclaration") {
      for (const variable of declaration.declarations) {
        if (variable.id?.type === "Identifier") bindings.set(variable.id.name, variable.init)
      }
    }
    if (statement.type === "ExportDefaultDeclaration") meta = declaration
  }
  let node = meta
  while (node?.type === "Identifier" && bindings.has(node.name))
    node = expression(bindings.get(node.name))
  if (node?.type !== "ObjectExpression") return undefined
  const property = node.properties.find(
    (item) => item.type === "Property" && propertyKeyName(item.key) === "title",
  )
  return property?.type === "Property" && isNode(property.value) && "value" in property.value
    ? String(property.value.value)
    : undefined
}

export function runtimeImports(file: string): Map<string, { module: string | null; name: string }> {
  const imports = new Map<string, { module: string | null; name: string }>()
  for (const statement of parseSource(file).program.body) {
    if (statement.type !== "ImportDeclaration" || statement.importKind === "type") continue
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportSpecifier" && specifier.importKind === "type") continue
      imports.set(specifier.local.name, {
        module: resolveSource(statement.source.value, file),
        name:
          specifier.type === "ImportNamespaceSpecifier"
            ? "*"
            : specifier.type === "ImportDefaultSpecifier"
              ? "default"
              : "name" in specifier.imported
                ? specifier.imported.name
                : specifier.imported.value,
      })
    }
  }
  return imports
}

export function runtimeExports(file: string): Map<string, string> {
  const cached = exportCache.get(file)
  if (cached) return cached
  const exports = new Map<string, string>()
  exportCache.set(file, exports)
  const imports = runtimeImports(file)
  function localIdentity(name: string): string | undefined {
    const imported = imports.get(name)
    return imported?.module ? runtimeExports(imported.module).get(imported.name) : `${file}#${name}`
  }
  for (const statement of parseSource(file).program.body) {
    if ("exportKind" in statement && statement.exportKind === "type") continue
    if (statement.type === "ExportAllDeclaration") {
      const target = resolveSource(statement.source.value, file)
      if (!target) throw new Error(`${file}: cannot resolve export ${statement.source.value}`)
      for (const [name, identity] of runtimeExports(target)) {
        if (name === "default") continue
        if (exports.has(name) && exports.get(name) !== identity) {
          throw new Error(`${file}: ambiguous runtime export ${name}`)
        }
        exports.set(name, identity)
      }
    }
    if (statement.type === "ExportDefaultDeclaration") {
      const declaration = expression(statement.declaration)
      if (!declaration) continue
      const identity =
        declaration.type === "Identifier"
          ? localIdentity(declaration.name)
          : `${file}#${"id" in declaration && isNode(declaration.id) && "name" in declaration.id ? String(declaration.id.name) : "default"}`
      if (identity) exports.set("default", identity)
    }
    if (statement.type !== "ExportNamedDeclaration") continue
    const declaration = statement.declaration
    if (declaration) {
      if (declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration") {
        if (!declaration.declare && declaration.id)
          exports.set(declaration.id.name, `${file}#${declaration.id.name}`)
      }
      if (declaration.type === "VariableDeclaration" && !declaration.declare) {
        for (const variable of declaration.declarations) {
          if (variable.id.type !== "Identifier")
            throw new Error(`${file}: destructured exports need explicit names`)
          const initializer = expression(variable.init)
          const identity =
            initializer?.type === "Identifier"
              ? localIdentity(initializer.name)
              : `${file}#${variable.id.name}`
          if (identity) exports.set(variable.id.name, identity)
        }
      }
    }
    for (const specifier of statement.specifiers) {
      if (specifier.exportKind === "type") continue
      const local =
        "name" in specifier.local ? String(specifier.local.name) : String(specifier.local.value)
      const name =
        "name" in specifier.exported
          ? String(specifier.exported.name)
          : String(specifier.exported.value)
      if (statement.source && typeof statement.source.value === "string") {
        const target = resolveSource(statement.source.value, file)
        if (target) {
          const identity = runtimeExports(target).get(local)
          if (identity) exports.set(name, identity)
        } else {
          // Package re-exports (e.g. the primitives icon seam): the identity is
          // the specifier itself; the package is not walked as source.
          exports.set(name, `${statement.source.value}#${local}`)
        }
      } else {
        const identity = localIdentity(local)
        if (identity) exports.set(name, identity)
      }
    }
  }
  return exports
}

export function renderedStoryReferences(file: string): Map<string, Set<string>> {
  const program = parseSource(file).program
  const bindings = new Map<string, Node | null | undefined>()
  const stories = new Map<string, Node | null | undefined>()
  let meta: Node | null | undefined
  for (const statement of program.body) {
    const declaration = "declaration" in statement ? statement.declaration : statement
    if (!declaration) continue
    if (declaration.type === "FunctionDeclaration" && declaration.id)
      bindings.set(declaration.id.name, declaration)
    if (declaration.type === "VariableDeclaration") {
      for (const variable of declaration.declarations) {
        if (variable.id.type !== "Identifier") continue
        bindings.set(variable.id.name, variable.init)
        if (statement.type === "ExportNamedDeclaration")
          stories.set(variable.id.name, variable.init)
      }
    }
    if (statement.type === "ExportDefaultDeclaration") meta = declaration
  }
  function property(
    node: Node | null | undefined,
    key: string,
    visited = new Set<string>(),
  ): Node | undefined {
    const resolved = expression(node)
    if (resolved?.type === "Identifier") {
      if (visited.has(resolved.name)) return
      visited.add(resolved.name)
      return property(bindings.get(resolved.name), key, visited)
    }
    if (resolved?.type !== "ObjectExpression") return
    const found = resolved.properties.find(
      (item) => item.type === "Property" && propertyKeyName(item.key) === key,
    )
    return found?.type === "Property" ? found.value : undefined
  }
  const rendered = new Map<string, Set<string>>()
  for (const [name, story] of stories) {
    const names = new Set<string>()
    const visited = new Set<unknown>()
    function component(node: Node | null | undefined): void {
      const resolved = expression(node)
      if (resolved?.type === "Identifier" || resolved?.type === "JSXIdentifier") {
        names.add(resolved.name)
        visit(bindings.get(resolved.name))
      } else if (
        resolved?.type === "JSXMemberExpression" &&
        resolved.object.type === "JSXIdentifier"
      ) {
        names.add(`${resolved.object.name}.${resolved.property.name}`)
      }
    }
    function visit(node: unknown): void {
      if (!isNode(node) || visited.has(node)) return
      visited.add(node)
      if (node.type === "JSXOpeningElement") component(node.name)
      if (node.type === "Identifier" && bindings.has(node.name)) visit(bindings.get(node.name))
      if (
        node.type === "CallExpression" &&
        ((node.callee.type === "Identifier" && node.callee.name === "createElement") ||
          (node.callee.type === "MemberExpression" &&
            node.callee.property.type === "Identifier" &&
            node.callee.property.name === "createElement"))
      ) {
        component(node.arguments[0])
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit)
        else if (value && typeof value === "object") visit(value)
      }
    }
    const render = property(story, "render") ?? property(meta, "render")
    if (render) visit(render)
    else component(property(meta, "component"))
    visit(property(meta, "args"))
    visit(property(story, "args"))
    rendered.set(name, names)
  }
  return rendered
}

// The Figma node ids a story file shows in the Storybook Design panel: the
// meta-level `parameters.design` plus the exports that declare their own. Only
// `figmaEmbedUrl("node")` counts — a hardcoded URL or the bare `figmaNodeUrl`
// form falls back to an unframeable Figma app URL (the @storybook/addon-designs
// rewrite needs a path segment after the file key).
const DESIGN_NODE_PATTERN = /figmaEmbedUrl\(\s*"(\d+:\d+)"\s*\)/g

export function storyDesignNodes(file: string): {
  meta: Set<string>
  stories: Map<string, Set<string>>
} {
  const source = fs.readFileSync(absolute(file), "utf8")
  const program = parseSource(file).program
  const declarations = new Map<string, Node | null | undefined>()
  const stories = new Map<string, Node | null | undefined>()
  let defaultExport: Node | null | undefined
  for (const statement of program.body) {
    const declaration = "declaration" in statement ? statement.declaration : statement
    if (!declaration) continue
    if (declaration.type === "VariableDeclaration") {
      for (const variable of declaration.declarations) {
        if (variable.id.type !== "Identifier") continue
        declarations.set(variable.id.name, expression(variable.init))
        if (statement.type === "ExportNamedDeclaration") {
          stories.set(variable.id.name, expression(variable.init))
        }
      }
    }
    if (statement.type === "ExportDefaultDeclaration") defaultExport = expression(declaration)
  }
  function nodesOf(object: Node | null | undefined): Set<string> | null {
    if (object?.type !== "ObjectExpression") return null
    function property(target: Extract<Node, { type: "ObjectExpression" }>, key: string) {
      return target.properties.find(
        (item) => item.type === "Property" && propertyKeyName(item.key) === key,
      )
    }
    const parametersNode = property(object, "parameters")
    const parameters =
      parametersNode?.type === "Property" ? expression(parametersNode.value) : undefined
    if (parameters?.type !== "ObjectExpression") return null
    const design = property(parameters, "design")
    if (!design || design.type !== "Property") return null
    const ids = new Set<string>()
    for (const match of source.slice(design.start, design.end).matchAll(DESIGN_NODE_PATTERN)) {
      ids.add(match[1])
    }
    return ids
  }
  const meta =
    defaultExport?.type === "Identifier" ? declarations.get(defaultExport.name) : defaultExport
  const design = {
    meta: nodesOf(meta) ?? new Set<string>(),
    stories: new Map<string, Set<string>>(),
  }
  for (const [name, story] of stories) {
    const nodes = nodesOf(story)
    if (nodes) design.stories.set(name, nodes)
  }
  return design
}

export function renderedStoryExports(file: string): Map<string, Set<string>> {
  const imports = runtimeImports(file)
  const stories = new Map<string, Set<string>>()
  for (const [name, references] of renderedStoryReferences(file)) {
    const identities = new Set<string>()
    for (const reference of references) {
      const [local, member] = reference.split(".")
      const imported = imports.get(local)
      if (!imported?.module) continue
      const identity = runtimeExports(imported.module).get(
        imported.name === "*" ? member : imported.name,
      )
      if (identity) identities.add(identity)
    }
    stories.set(name, identities)
  }
  return stories
}
