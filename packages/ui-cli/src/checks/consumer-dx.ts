// Consumer DX contract for the public surface: a consumer writes the page, so
// every public component must meet the contract a native element meets.
//
// The gate reads `src/pagopa-ui.ts` and judges every component it publishes:
// `ref` and `className` declared and applied, standard attributes passed
// through to the element, and a props type the consumer can import. The
// components whose props declare a controlled prop and its change callback also
// own state, so they owe controlled and uncontrolled parity too. A component
// that cannot meet the contract yet is waived by name in
// `src/consumer-dx-exceptions.json`, with the reason.
import fs from "node:fs"

import { z } from "zod"

import type { Workspace } from "../adapters/workspace.ts"
import { readJson } from "../lib/json.ts"
import { createSourceModules } from "../lib/source-modules.ts"
import { parseSchema } from "../lib/validate.ts"
import {
  CONSUMER_DX_RULES,
  ConsumerDxExceptionsSchema,
  type ConsumerDxRule,
} from "../schemas/checks.ts"
import { report, type CheckReport } from "./report.ts"

const ENTRY = "src/pagopa-ui.ts"
const EXCEPTIONS = "src/consumer-dx-exceptions.json"
const MAX_DEPTH = 12

const knownRule = (rule: string): rule is ConsumerDxRule =>
  CONSUMER_DX_RULES.some((known) => known === rule)

// A state pair is a prop, its change callback and the default that makes the
// component uncontrolled. A component that declares the first two owns state;
// the default is what the contract adds.
const STATE_PAIRS: ReadonlyArray<{ control: string; change: string }> = [
  { control: "open", change: "onOpenChange" },
  { control: "value", change: "onValueChange" },
  { control: "checked", change: "onCheckedChange" },
  { control: "selected", change: "onSelectedChange" },
  { control: "expanded", change: "onExpandedChange" },
]

// The host types a props type inherits its element contract from. `ref` is
// absent from the `WithoutRef` and attribute-only variants by definition, so
// only the DOM props and the package's own `ElementProps` carry it.
const HOST_TYPES: Readonly<Record<string, { className: boolean; ref: boolean }>> = {
  ComponentProps: { className: true, ref: true },
  ComponentPropsWithRef: { className: true, ref: true },
  ComponentPropsWithoutRef: { className: true, ref: false },
  DetailedHTMLProps: { className: true, ref: true },
  HTMLProps: { className: true, ref: true },
  AllHTMLAttributes: { className: true, ref: false },
  HTMLAttributes: { className: true, ref: false },
  SVGProps: { className: true, ref: true },
  ElementProps: { className: true, ref: true },
}

// An oxc node without its union: the walk reads by `type` and by the keys a node
// kind carries, so the checker stays a reader of shapes, not of one union.
interface Ast {
  type: string
  start: number
  end: number
  [key: string]: unknown
}

const isNode = (value: unknown): value is Ast =>
  typeof value === "object" && value !== null && typeof Reflect.get(value, "type") === "string"

const asNode = (value: unknown): Ast | null => (isNode(value) ? value : null)

// The string a slot holds, as on a module specifier's `source.value`.
const asText = (value: unknown): string | null => (typeof value === "string" ? value : null)

// The last segment of a spelled name: `React.ComponentProps` reads `ComponentProps`.
const leafOf = (name: string): string => name.split(".").at(-1) ?? name

const nodes = (value: unknown): Ast[] =>
  Array.isArray(value) ? value.map(asNode).filter((entry): entry is Ast => entry !== null) : []

function walk(node: Ast, visit: (node: Ast) => void): void {
  visit(node)
  for (const [key, value] of Object.entries(node)) {
    if (key === "type" || key === "start" || key === "end") continue
    const child = asNode(value)
    if (child) walk(child, visit)
    else for (const entry of nodes(value)) walk(entry, visit)
  }
}

// The key a member or a pattern property is named with.
function keyName(key: unknown): string | null {
  const candidate = asNode(key)
  if (!candidate) return null
  if (typeof candidate.name === "string") return candidate.name
  if (typeof candidate.value === "string") return candidate.value
  return null
}

// A type reference spelled as a name, a namespace path or a member access:
// `Omit`, `React.ComponentProps`, `AccordionPrimitive.Root.Props`.
function qualifiedName(value: unknown): string | null {
  const candidate = asNode(value)
  if (!candidate) return null
  if (candidate.type === "Identifier" && typeof candidate.name === "string") return candidate.name
  const [left, right] =
    candidate.type === "TSQualifiedName"
      ? [candidate.left, candidate.right]
      : candidate.type === "MemberExpression"
        ? [candidate.object, candidate.property]
        : [null, null]
  const head = qualifiedName(left)
  const tail = qualifiedName(right)
  return head && tail ? `${head}.${tail}` : null
}

const defaultOf = (control: string): string =>
  `default${control[0]?.toUpperCase() ?? ""}${control.slice(1)}`

// The name a component keeps the props it does not destructure under.
function restName(parameter: Ast | null): string | null {
  if (parameter?.type !== "ObjectPattern") return null
  for (const property of nodes(parameter.properties)) {
    if (property.type !== "RestElement") continue
    const argument = asNode(property.argument)
    if (argument?.type === "Identifier" && typeof argument.name === "string") return argument.name
  }
  return null
}

// The names a component takes out of its props, which no longer travel inside
// the rest object it spreads onto the element, and the name that object has.
// A component reads them either straight in its signature or from the props
// parameter it destructures further down.
function propsShape(
  parameter: Ast | null,
  body: Ast,
): { destructured: Set<string>; rest: string | null } {
  const fromPattern = (pattern: Ast): { destructured: Set<string>; rest: string | null } => {
    const destructured = new Set<string>()
    for (const property of nodes(pattern.properties)) {
      if (property.type === "RestElement") continue
      const name = keyName(property.key)
      if (name) destructured.add(name)
    }
    return { destructured, rest: restName(pattern) }
  }

  if (parameter?.type === "ObjectPattern") return fromPattern(parameter)
  const parameterName = parameter?.type === "Identifier" ? parameter.name : null
  if (typeof parameterName !== "string") return { destructured: new Set(), rest: null }

  let found: { destructured: Set<string>; rest: string | null } = {
    destructured: new Set(),
    rest: parameterName,
  }
  walk(body, (node) => {
    if (node.type !== "VariableDeclarator") return
    const id = asNode(node.id)
    const init = asNode(node.init)
    if (id?.type !== "ObjectPattern" || init?.type !== "Identifier") return
    if (init.name !== parameterName) return
    found = fromPattern(id)
  })
  return found
}

// Whether a node hands the rest object on: to a JSX element, into an object
// built for `useRender` or `mergeProps`, or as a call argument. Reading it in
// place — `const { children, ...elementProps } = props` — does not count,
// because the element may still never see what was read.
function handsOn(node: Ast, rest: string): boolean {
  const names = (value: unknown): boolean => {
    const candidate = asNode(value)
    return candidate?.type === "Identifier" && candidate.name === rest
  }
  if (node.type === "JSXSpreadAttribute") return names(node.argument)
  if (node.type === "SpreadElement") return names(node.argument)
  if (node.type === "CallExpression") return nodes(node.arguments).some(names)
  return false
}

interface Module {
  readonly types: Map<string, Ast>
  readonly functions: Map<string, Ast>
  readonly imports: Map<string, { name: string; from: string }>
  readonly exportedLocals: Set<string>
  readonly all: string[]
  readonly named: Array<{
    exported: string
    local: string | null
    from: string | null
    type: boolean
  }>
}

interface Capabilities {
  className: boolean
  ref: boolean
  attributes: boolean
  readonly declared: Set<string>
  unresolved: string | null
}

const noCapabilities = (): Capabilities => ({
  className: false,
  ref: false,
  attributes: false,
  declared: new Set<string>(),
  unresolved: null,
})

function merge(into: Capabilities, from: Capabilities): void {
  into.className ||= from.className
  into.ref ||= from.ref
  into.attributes ||= from.attributes
  into.unresolved ??= from.unresolved
  for (const name of from.declared) into.declared.add(name)
}

type Exceptions = z.infer<typeof ConsumerDxExceptionsSchema>

function readExceptions(workspace: Workspace): Exceptions {
  const file = workspace.path(EXCEPTIONS)
  if (!fs.existsSync(file)) return { schemaVersion: 1, exceptions: [] }
  return parseSchema(ConsumerDxExceptionsSchema, readJson(file), EXCEPTIONS)
}

// The declarations the surface is read through: a module index per file, and
// the type resolution an import carries across modules.
function createReader(workspace: Workspace) {
  const sources = createSourceModules(workspace)
  const modules = new Map<string, Module>()

  function module(file: string): Module {
    const cached = modules.get(file)
    if (cached) return cached
    const parsed = sources.parseSource(file)
    const index: Module = {
      types: new Map(),
      functions: new Map(),
      imports: new Map(),
      exportedLocals: new Set(),
      all: [],
      named: [],
    }
    for (const statement of nodes(asNode(parsed.program)?.body)) {
      const declaration = asNode(statement.declaration)
      // `export interface X`, `interface X` and `function X` index the same way.
      const declared =
        declaration ??
        (statement.type === "FunctionDeclaration" || statement.type.startsWith("TS")
          ? statement
          : null)
      const declaredName = keyName(declared?.id)
      if (
        declared?.type === "TSInterfaceDeclaration" ||
        declared?.type === "TSTypeAliasDeclaration"
      ) {
        if (declaredName) index.types.set(declaredName, declared)
      }
      if (declared?.type === "FunctionDeclaration" && declaredName) {
        index.functions.set(declaredName, declared)
      }
      // A variable declaration holds its declarators, exported or not:
      // `export const A = …, B = …` wraps them, a bare `const Field = …` does not.
      // A component can be that binding — `const Field = (props) => …` carries its
      // own parameters and body, so it indexes as a function too, or every arrow
      // component escapes the contract.
      const variable = asNode(statement.type === "VariableDeclaration" ? statement : declared)
      if (variable?.type === "VariableDeclaration") {
        for (const declarator of nodes(variable.declarations)) {
          const name = keyName(declarator.id)
          if (!name) continue
          if (declaration) index.exportedLocals.add(name)
          const value = asNode(declarator.init)
          if (value?.type === "ArrowFunctionExpression" || value?.type === "FunctionExpression") {
            index.functions.set(name, value)
          }
        }
      }
      if (declaration && declaredName) index.exportedLocals.add(declaredName)
      if (statement.type === "ImportDeclaration") {
        const from = asText(asNode(statement.source)?.value)
        if (!from) continue
        for (const specifier of nodes(statement.specifiers)) {
          const local = keyName(specifier.local)
          if (local)
            index.imports.set(local, { name: keyName(specifier.imported) ?? "default", from })
        }
      }
      if (statement.type === "ExportAllDeclaration") {
        const from = asText(asNode(statement.source)?.value)
        if (from) index.all.push(from)
      }
      if (statement.type === "ExportNamedDeclaration") {
        const from = asText(asNode(statement.source)?.value)
        for (const specifier of nodes(statement.specifiers)) {
          const exported = keyName(specifier.exported)
          const local = keyName(specifier.local)
          if (!exported) continue
          index.named.push({ exported, local, from, type: specifier.exportKind === "type" })
          if (!from && local) index.exportedLocals.add(local)
        }
      }
    }
    modules.set(file, index)
    return index
  }

  // The declaration a type name stands for, following the imports that carry it
  // across modules.
  function declarationOf(
    file: string,
    name: string,
    depth = 0,
  ): { file: string; declaration: Ast } | null {
    if (depth > MAX_DEPTH) return null
    const current = module(file)
    const declared = current.types.get(name)
    if (declared) return { file, declaration: declared }
    const imported = current.imports.get(name)
    if (!imported) return null
    const target = sources.resolveSource(imported.from, file)
    return target ? declarationOf(target, imported.name, depth + 1) : null
  }

  // The props type a component value is declared with, so a type that reads
  // `React.ComponentProps<typeof Switch>` inherits `Switch`'s own contract.
  function propsDeclarationOf(
    file: string,
    name: string,
    depth = 0,
  ): { file: string; declaration: Ast } | null {
    if (depth > MAX_DEPTH) return null
    const current = module(file)
    const declared = current.functions.get(name)
    if (declared) {
      const parameter = asNode(nodes(declared.params)[0])
      const annotation = asNode(asNode(parameter?.typeAnnotation)?.typeAnnotation)
      if (annotation?.type !== "TSTypeReference") return null
      const leaf = qualifiedName(annotation.typeName)?.split(".").pop()
      return leaf ? declarationOf(file, leaf, depth + 1) : null
    }
    const imported = current.imports.get(name)
    if (!imported) return null
    const target = sources.resolveSource(imported.from, file)
    return target ? propsDeclarationOf(target, imported.name, depth + 1) : null
  }

  function inheritType(file: string, value: unknown, into: Capabilities, depth: number): void {
    if (depth > MAX_DEPTH) return
    const type = asNode(value)
    if (!type) return
    if (type.type === "TSParenthesizedType") {
      inheritType(file, type.typeAnnotation, into, depth + 1)
      return
    }
    if (type.type === "TSIntersectionType" || type.type === "TSUnionType") {
      for (const branch of nodes(type.types)) inheritType(file, branch, into, depth + 1)
      return
    }
    if (type.type === "TSTypeLiteral") {
      for (const member of nodes(type.members)) {
        const name = keyName(member.key)
        if (name) into.declared.add(name)
      }
      return
    }
    if (type.type === "TSTypeReference") {
      inheritReference(file, type.typeName, type.typeArguments, into, depth + 1)
    }
  }

  function inheritReference(
    file: string,
    typeName: unknown,
    typeArguments: unknown,
    into: Capabilities,
    depth: number,
  ): void {
    if (depth > MAX_DEPTH) return
    const name = qualifiedName(typeName)
    if (!name) return
    const segments = name.split(".")
    const leaf = leafOf(name)
    const args = nodes(asNode(typeArguments)?.params)

    const host = HOST_TYPES[leaf]
    if (host && (segments.length === 1 || segments[0] === "React")) {
      into.className ||= host.className
      into.ref ||= host.ref
      into.attributes = true
      const argument = asNode(args[0])
      if (argument?.type === "TSTypeQuery") {
        const target = qualifiedName(argument.exprName)?.split(".").pop()
        const props = target ? propsDeclarationOf(file, target, depth + 1) : null
        if (props) inheritDeclaration(props.file, props.declaration, into, depth + 1)
        else into.unresolved ??= `${name}<typeof ${target ?? "?"}>`
      }
      return
    }

    // `Omit` subtracts what a host type grants, so a props type that omits
    // `className` and re-declares it still carries it.
    if (leaf === "Omit" && segments.length === 1) {
      const inner = noCapabilities()
      inheritType(file, args[0], inner, depth + 1)
      const omitted = new Set<string>()
      const collect = (argument: Ast | null): void => {
        if (!argument) return
        if (argument.type === "TSUnionType") {
          for (const branch of nodes(argument.types)) collect(branch)
          return
        }
        const value = asNode(argument.literal)?.value
        if (typeof value === "string") omitted.add(value)
      }
      for (const argument of args.slice(1)) collect(argument)
      if (omitted.has("className")) inner.className = false
      if (omitted.has("ref")) inner.ref = false
      for (const name of omitted) inner.declared.delete(name)
      merge(into, inner)
      return
    }

    if (segments.length === 1) {
      const declared = declarationOf(file, name, depth + 1)
      if (declared) {
        inheritDeclaration(declared.file, declared.declaration, into, depth + 1)
        return
      }
    }
    into.unresolved ??= name
  }

  function inheritDeclaration(
    file: string,
    value: unknown,
    into: Capabilities,
    depth: number,
  ): void {
    const declared = asNode(value)
    if (!declared || depth > MAX_DEPTH) return
    if (declared.type === "TSInterfaceDeclaration") {
      for (const member of nodes(asNode(declared.body)?.body)) {
        const name = keyName(member.key)
        if (name) into.declared.add(name)
      }
      for (const heritage of nodes(declared.extends)) {
        inheritReference(file, heritage.expression, heritage.typeArguments, into, depth + 1)
      }
      return
    }
    if (declared.type === "TSTypeAliasDeclaration") {
      inheritType(file, declared.typeAnnotation, into, depth + 1)
    }
  }

  function capabilitiesOf(file: string, declared: Ast): Capabilities {
    const capabilities = noCapabilities()
    inheritDeclaration(file, declared, capabilities, 0)
    if (capabilities.declared.has("className")) capabilities.className = true
    if (capabilities.declared.has("ref")) capabilities.ref = true
    return capabilities
  }

  // The public runtime surface: every export reachable from the entry barrel.
  function surface(): Map<string, { file: string; local: string }> {
    const publicNames = new Map<string, { file: string; local: string }>()
    const visited = new Set<string>()
    const walkBarrel = (file: string): void => {
      if (visited.has(file)) return
      visited.add(file)
      const current = module(file)
      for (const specifier of current.all) {
        const target = sources.resolveSource(specifier, file)
        if (target) walkBarrel(target)
      }
      for (const entry of current.named) {
        if (entry.type || !entry.local) continue
        if (!entry.from) {
          publicNames.set(entry.exported, { file, local: entry.local })
          continue
        }
        const target = sources.resolveSource(entry.from, file)
        if (target) publicNames.set(entry.exported, { file: target, local: entry.local })
      }
    }
    walkBarrel(ENTRY)
    return publicNames
  }

  // The names the entry barrel exports, keyed by the module that declares them:
  // a consumer writes `import type { DialogProps } from "@pagopa/ui"`, so a type
  // its own module exports and the barrel drops is still a type nobody can name.
  // Inline `export interface`/`export type` count too — real ESM exports them
  // through a star re-export, even though no specifier spells the name out.
  let publicTypes: Set<string> | null = null
  function publicTypeNames(): Set<string> {
    if (publicTypes) return publicTypes
    const names = new Set<string>()
    const visited = new Set<string>()
    const walkBarrel = (file: string): void => {
      if (visited.has(file)) return
      visited.add(file)
      const current = module(file)
      for (const specifier of current.all) {
        const target = sources.resolveSource(specifier, file)
        if (target) walkBarrel(target)
      }
      for (const local of current.exportedLocals) names.add(`${file}\u0000${local}`)
      for (const entry of current.named) {
        if (!entry.local) continue
        const target = entry.from ? sources.resolveSource(entry.from, file) : file
        if (target) names.add(`${target}\u0000${entry.local}`)
      }
    }
    walkBarrel(ENTRY)
    publicTypes = names
    return names
  }

  return { module, surface, publicTypeNames, capabilitiesOf, declarationOf }
}

type Reader = ReturnType<typeof createReader>

interface Finding {
  readonly component: string
  readonly rule: ConsumerDxRule
  readonly problem: string
}

// The contract of one public component, defect by defect: every component a
// consumer renders owes them the props a native element takes.
export function componentFindings(
  component: { name: string; file: string; local: string },
  reader: Reader,
): { stateful: boolean; findings: Finding[] } {
  const current = reader.module(component.file)
  const declared = current.functions.get(component.local)
  if (!declared) return { stateful: false, findings: [] }
  const parameter = asNode(nodes(declared.params)[0])
  const annotation = asNode(asNode(parameter?.typeAnnotation)?.typeAnnotation)
  const body = asNode(declared.body) ?? declared

  const findings: Finding[] = []
  const add = (rule: ConsumerDxRule, message: string): void => {
    findings.push({
      component: component.name,
      rule,
      problem: `${component.file}: ${component.name}: ${message}`,
    })
  }

  const typeName =
    annotation?.type === "TSTypeReference" ? qualifiedName(annotation.typeName) : null
  const props =
    typeName && !typeName.includes(".") ? reader.declarationOf(component.file, typeName) : null

  if (!typeName || !props) {
    // Inline props cannot be inspected or imported, so the state a consumer
    // would drive is read from the signature instead.
    const { destructured } = propsShape(parameter, body)
    const stateful = STATE_PAIRS.some(
      (pair) => destructured.has(pair.control) && destructured.has(pair.change),
    )
    if (stateful) {
      add(
        "props type",
        `props are typed inline, so a consumer cannot name them; declare and export a ${component.name}Props type`,
      )
    }
    return { stateful, findings }
  }

  const capabilities = reader.capabilitiesOf(props.file, props.declaration)
  const propsOfComponent = capabilities.declared
  const stateful = STATE_PAIRS.some(
    (pair) => propsOfComponent.has(pair.control) && propsOfComponent.has(pair.change),
  )

  if (!reader.publicTypeNames().has(`${props.file}\u0000${typeName}`)) {
    add(
      "props type",
      `${typeName} is not exported from ${ENTRY}, so a consumer cannot type their wrapper`,
    )
  }

  const used = new Set<string>()
  // The object a component does not name again — `...props` — reaches the
  // element through `useRender` and `mergeProps` too, so the rest name counts
  // as applied wherever it is handed on.
  const { destructured, rest } = propsShape(parameter, body)
  let spreads = false
  walk(body, (node) => {
    // Only the rest object hands the element the props the component declares. An
    // array or object spread inside the body — `<List items={[...items]} />` —
    // carries nothing to the host element.
    if (rest && handsOn(node, rest)) spreads = true
    if (typeof node.name === "string") used.add(node.name)
  })
  // A prop the body destructured out of that object is no longer inside it, so
  // the spread cannot stand in for applying it: it has to be named again.
  const applied = (name: string): boolean => (destructured.has(name) ? used.has(name) : spreads)

  // A prop is controlled state only when the component takes its change
  // callback too: `value` alone is a form value, as on `Switch`.
  for (const pair of stateful ? STATE_PAIRS : []) {
    if (!propsOfComponent.has(pair.control) || !propsOfComponent.has(pair.change)) continue
    if (!propsOfComponent.has(defaultOf(pair.control))) {
      add("parity", `${pair.control} pairs with ${pair.change} but no ${defaultOf(pair.control)}`)
    }
  }

  if (!capabilities.className) add("className", `${typeName} has no className`)
  else if (!applied("className")) add("className", "className is declared but never applied")

  if (!capabilities.ref) add("ref", `${typeName} has no ref`)
  else if (!applied("ref")) add("ref", "ref is declared but never forwarded")

  if (!capabilities.attributes) {
    const inheritance = capabilities.unresolved
      ? `cannot resolve ${capabilities.unresolved}`
      : "extends no host type"
    add("attributes", `${typeName} ${inheritance}, so standard attributes do not reach the element`)
  }

  return { stateful, findings }
}

export function checkConsumerDx(workspace: Workspace): CheckReport {
  const reader = createReader(workspace)
  const findings: Finding[] = []
  let stateful = 0
  for (const [name, component] of reader.surface()) {
    const result = componentFindings({ name, ...component }, reader)
    if (result.stateful) stateful += 1
    findings.push(...result.findings)
  }

  const errors: string[] = []
  const registered = new Map<string, string>()
  for (const exception of readExceptions(workspace).exceptions) {
    if (!knownRule(exception.rule)) {
      errors.push(
        `${EXCEPTIONS}: exception ${exception.component}|${exception.rule} names no rule (${CONSUMER_DX_RULES.join(", ")})`,
      )
      continue
    }
    const key = `${exception.component}|${exception.rule}`
    if (registered.has(key)) errors.push(`${EXCEPTIONS}: duplicate exception ${key}`)
    registered.set(key, exception.reason)
  }

  const problems: string[] = []
  const warnings: string[] = []
  const waived = new Set<string>()
  for (const finding of findings) {
    const key = `${finding.component}|${finding.rule}`
    const reason = registered.get(key)
    if (reason === undefined) {
      problems.push(finding.problem)
      continue
    }
    if (waived.has(key)) continue
    waived.add(key)
    warnings.push(`${finding.component}: ${finding.rule}: ${reason}`)
  }
  for (const key of registered.keys()) {
    if (!waived.has(key)) errors.push(`${EXCEPTIONS}: stale exception ${key}, the contract holds`)
  }

  return report(
    "consumer DX",
    `${stateful} stateful component(s), ${waived.size} exempt`,
    [...problems, ...errors],
    { warnings },
  )
}
