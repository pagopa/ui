// The slot contract on the public surface: every public component stamps its
// root with `data-slot="<its kebab name>"` (a `-` suffix is allowed for the
// root of an anatomy, as `avatar-pair` does).
//
// The stamp is a behaviour hook, not a test convenience: `src/index.css` keys
// its focus, forced-colours and reduced-motion overrides on
// `:where([data-slot], [data-pagopa-ui-portal-root])`, so a root without one
// silently escapes them, and a consumer's selector stops working the day the
// markup around it changes. The gate reads `src/pagopa-ui.ts`, follows each
// export to the module that declares it, and judges the expression it renders.
import fs from "node:fs"

import { z } from "zod"

import type { Workspace } from "../adapters/workspace.ts"
import { asNode, isFunctionNode, nodes, walkOwn, type Ast } from "../lib/ast.ts"
import { readJson } from "../lib/json.ts"
import { createSourceModules } from "../lib/source-modules.ts"
import { parseSchema } from "../lib/validate.ts"
import { DataSlotExceptionsSchema, type DataSlotRule } from "../schemas/checks.ts"
import { report, type CheckReport } from "./report.ts"

const ENTRY = "src/pagopa-ui.ts"
const EXCEPTIONS = "src/data-slot-exceptions.json"
const MAX_DEPTH = 8
// Only source under the package is readable: a package identity (`@x/y#Name`)
// re-exported through the entry declares nothing this gate can judge.
const SOURCE = /^src\/.+\.tsx?$/

// The slot names an attribute spells. `data-slot="x"` is one; a conditional
// whose branches are both literals (`secondary ? "a" : "b"`) is the anatomy
// `Avatar` renders, so both count. Anything else is computed at runtime and
// cannot be verified here.
function literalStrings(value: Ast): string[] | null {
  const names = new Set<string>()
  function visit(node: Ast): boolean {
    switch (node.type) {
      case "Literal":
        if (typeof node.value !== "string") return false
        names.add(node.value)
        return true
      case "JSXExpressionContainer": {
        const expression = asNode(node.expression)
        return expression ? visit(expression) : false
      }
      case "ConditionalExpression": {
        const consequent = asNode(node.consequent)
        const alternate = asNode(node.alternate)
        return consequent && alternate ? visit(consequent) && visit(alternate) : false
      }
      case "LogicalExpression": {
        const left = asNode(node.left)
        const right = asNode(node.right)
        return left && right ? visit(left) && visit(right) : false
      }
      case "ParenthesizedExpression":
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "TSNonNullExpression":
      case "TSInstantiationExpression": {
        const expression = asNode(node.expression)
        return expression ? visit(expression) : false
      }
      default:
        return false
    }
  }
  return visit(value) ? [...names] : null
}

const keyName = (key: unknown): string | null => {
  const candidate = asNode(key)
  if (!candidate) return null
  if (typeof candidate.name === "string") return candidate.name
  if (typeof candidate.value === "string") return candidate.value
  return null
}

const SLOT_ATTRIBUTE = "data-slot"

interface Slots {
  readonly names: string[]
  computed: boolean
}

const noSlots = (): Slots => ({ names: [], computed: false })

// The `data-slot` an element, or an object of props, spells. A value that is
// not a literal cannot be verified, so it is recorded as computed.
function addSlot(value: unknown, into: Slots): void {
  const node = asNode(value)
  const literals = node ? literalStrings(node) : null
  if (!literals) {
    into.computed = true
    return
  }
  for (const literal of literals) if (!into.names.includes(literal)) into.names.push(literal)
}

// Every slot the rendered root spells, wherever the anatomy puts it: the
// component's own stamp or the ones its parts carry. The stamp is matched by
// its exact name, so a `-` suffixed part never stands in for the root.
function collectSlots(
  node: Ast,
  reader: { resolve: (name: string) => Ast | null },
  into: Slots,
  depth = 0,
): void {
  if (depth > MAX_DEPTH) return
  const named =
    node.type === "JSXAttribute"
      ? keyName(node.name)
      : node.type === "Property"
        ? keyName(node.key)
        : null
  if (named === SLOT_ATTRIBUTE) addSlot(asNode(node.value), into)
  if (node.type === "CallExpression" || node.type === "NewExpression") {
    // `useRender({ props: … })` and `createElement`: the stamp travels in a
    // props object, which may itself live in a constant.
    for (const argument of nodes(node.arguments))
      absorb(into, propsStamp(argument, reader, depth + 1))
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "type" || key === "start" || key === "end") continue
    const child = asNode(value)
    if (child) collectSlots(child, reader, into, depth + 1)
    else for (const entry of nodes(value)) collectSlots(entry, reader, into, depth + 1)
  }
}

function absorb(into: Slots, from: Slots): void {
  for (const name of from.names) if (!into.names.includes(name)) into.names.push(name)
  into.computed ||= from.computed
}

// `{ … } as const`, `{ … } satisfies X`, `({ … })`: the value sits under the
// type-level wrapper, so the reader looks through it.
const VALUE_WRAPPERS = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSTypeAssertion",
  "TSNonNullExpression",
  "ParenthesizedExpression",
])

function unwrapped(node: Ast): Ast {
  let current = node
  while (VALUE_WRAPPERS.has(current.type)) {
    const inner = asNode(current.expression)
    if (!inner) break
    current = inner
  }
  return current
}

function propsStamp(
  unresolved: Ast,
  reader: { resolve: (name: string) => Ast | null },
  depth: number,
): Slots {
  const slots = noSlots()
  if (depth > MAX_DEPTH) return slots
  const node = unwrapped(unresolved)
  switch (node.type) {
    case "ObjectExpression":
      for (const property of nodes(node.properties)) {
        if (property.type === "SpreadElement") {
          const argument = asNode(property.argument)
          if (argument) absorb(slots, propsStamp(argument, reader, depth + 1))
          continue
        }
        if (keyName(property.key) === SLOT_ATTRIBUTE) {
          addSlot(property.value, slots)
          continue
        }
        // `useRender({ props: renderProps })`: the stamp is one level in.
        const value = asNode(property.value)
        if (value) absorb(slots, propsStamp(value, reader, depth + 1))
      }
      return slots
    case "Identifier": {
      const name = typeof node.name === "string" ? node.name : null
      const target = name ? reader.resolve(name) : null
      return target ? propsStamp(target, reader, depth + 1) : slots
    }
    case "ConditionalExpression": {
      const consequent = asNode(node.consequent)
      const alternate = asNode(node.alternate)
      if (consequent) absorb(slots, propsStamp(consequent, reader, depth + 1))
      if (alternate) absorb(slots, propsStamp(alternate, reader, depth + 1))
      return slots
    }
    case "LogicalExpression": {
      const left = asNode(node.left)
      const right = asNode(node.right)
      if (left) absorb(slots, propsStamp(left, reader, depth + 1))
      if (right) absorb(slots, propsStamp(right, reader, depth + 1))
      return slots
    }
    case "CallExpression": {
      // `mergeProps({ … }, props)` keeps the literal in its first argument.
      for (const argument of nodes(node.arguments)) {
        absorb(slots, propsStamp(argument, reader, depth + 1))
      }
      return slots
    }
    case "JSXExpressionContainer": {
      const expression = asNode(node.expression)
      return expression ? propsStamp(expression, reader, depth + 1) : slots
    }
    default:
      return slots
  }
}

type Rendering =
  | { readonly kind: "nothing" }
  | { readonly kind: "unreadable"; readonly reason: string }
  | { readonly kind: "element"; readonly slots: Slots }

const NOTHING: Rendering = { kind: "nothing" }
const unreadable = (reason: string): Rendering => ({ kind: "unreadable", reason })

// The kebab-case a component's slot is named with: `PagoPAIcon` reads
// `pago-pa-icon`, `MicroEvent` reads `micro-event`.
function kebab(name: string): string {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
}

// The stamp is the component's own kebab name and nothing else: `card-header`
// is a part of `Card`, so a part never stands in for the component's root.
const owns = (expected: string) => (name: string) => name === expected

// The `const`s declared inside a component body: a rendering built in a local
// (`const line = <Separator … />; return line`) is still the root it returns.
function bodyConstants(functionNode: Ast): Map<string, Ast> {
  const index = new Map<string, Ast>()
  walkOwn(functionNode, (node) => {
    if (node.type !== "VariableDeclarator") return
    const name = keyName(node.id)
    const init = asNode(node.init)
    if (name && init) index.set(name, init)
  })
  return index
}

interface Component {
  readonly name: string
  readonly file: string
  readonly functionNode: Ast
}

// The declarations a file holds by local name, so `return row` resolves.
type Locals = Map<string, Ast>

function createComponentReader(workspace: Workspace) {
  const sources = createSourceModules(workspace)
  const locals = new Map<string, Locals>()

  function localsOf(file: string): Locals {
    const cached = locals.get(file)
    if (cached) return cached
    const index: Locals = new Map()
    locals.set(file, index)
    for (const statement of nodes(asNode(sources.parseSource(file).program)?.body)) {
      const declaration = asNode(statement.declaration) ?? statement
      if (declaration.type !== "VariableDeclaration") continue
      for (const declarator of nodes(declaration.declarations)) {
        const name = keyName(declarator.id)
        const init = asNode(declarator.init)
        if (name && init) index.set(name, init)
      }
    }
    return index
  }

  // The expression a name resolves to: a `const` of the rendering component's
  // own body, a module-level `const`, or a function whose body is the value.
  let bodyLocals = new Map<string, Ast>()

  function resolve(file: string, name: string, depth: number): Ast | null {
    if (depth > MAX_DEPTH) return null
    const init = bodyLocals.get(name) ?? localsOf(file).get(name)
    return init && !isFunctionNode(init) ? init : null
  }

  function componentOf(identity: string): Component | null {
    const separator = identity.lastIndexOf("#")
    if (separator < 0) return null
    const file = identity.slice(0, separator)
    const local = identity.slice(separator + 1)
    if (!SOURCE.test(file) || !fs.existsSync(workspace.path(file))) return null
    for (const statement of nodes(asNode(sources.parseSource(file).program)?.body)) {
      const declaration = asNode(statement.declaration) ?? statement
      if (declaration.type === "FunctionDeclaration" && keyName(declaration.id) === local) {
        return { name: local, file, functionNode: declaration }
      }
      if (declaration.type !== "VariableDeclaration") continue
      for (const declarator of nodes(declaration.declarations)) {
        if (keyName(declarator.id) !== local) continue
        const init = asNode(declarator.init)
        if (init && isFunctionNode(init)) {
          return { name: local, file, functionNode: init }
        }
      }
    }
    return null
  }

  // What the component renders: every return its own body carries, plus the
  // expression of an arrow that returns without a block.
  function renderings(component: Component): Rendering[] {
    bodyLocals = bodyConstants(component.functionNode)
    const roots: Ast[] = []
    walkOwn(component.functionNode, (node) => {
      if (node.type !== "ReturnStatement") return
      const argument = asNode(node.argument)
      if (argument) roots.push(argument)
    })
    if (component.functionNode.type !== "FunctionDeclaration") {
      const body = asNode(component.functionNode.body)
      if (body && body.type !== "BlockStatement") roots.push(body)
    }
    return roots.map((root) => rendered(root, component.file, 0))
  }

  function rendered(expression: Ast, file: string, depth: number): Rendering {
    if (depth > MAX_DEPTH) return unreadable("the rendered expression nests too deeply")
    switch (expression.type) {
      case "Literal":
        // A literal renders text or nothing, never an element to stamp.
        return NOTHING
      case "Identifier":
        if (expression.name === "undefined") return NOTHING
        return follow(expression, file, depth)
      case "NullLiteral":
      case "JSXEmptyExpression":
        return NOTHING
      case "ConditionalExpression": {
        const consequent = asNode(expression.consequent)
        const alternate = asNode(expression.alternate)
        if (!consequent || !alternate) return unreadable("a branch renders nothing readable")
        return merge([rendered(consequent, file, depth + 1), rendered(alternate, file, depth + 1)])
      }
      case "LogicalExpression": {
        const left = asNode(expression.left)
        const right = asNode(expression.right)
        if (!left || !right) return unreadable("an operand renders nothing readable")
        return merge([rendered(left, file, depth + 1), rendered(right, file, depth + 1)])
      }
      case "SequenceExpression": {
        const last = nodes(expression.expressions).at(-1)
        return last ? rendered(last, file, depth + 1) : unreadable("an empty sequence")
      }
      case "ParenthesizedExpression":
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "TSNonNullExpression":
      case "TSInstantiationExpression": {
        const inner = asNode(expression.expression)
        return inner ? rendered(inner, file, depth + 1) : unreadable("an empty wrapper")
      }
      case "ArrowFunctionExpression":
      case "FunctionExpression":
      case "FunctionDeclaration": {
        const body = asNode(expression.body)
        return body ? rendered(body, file, depth + 1) : unreadable("an empty function body")
      }
      case "BlockStatement":
        return unreadable("a block statement renders nothing")
      case "JSXFragment":
      case "JSXElement":
      case "CallExpression":
      case "NewExpression":
        return element(expression, { resolve: (name) => resolve(file, name, depth + 1) })
      default:
        return unreadable(`\`${expression.type}\` is not a rendering this gate can read`)
    }
  }

  function follow(expression: Ast, file: string, depth: number): Rendering {
    const name = typeof expression.name === "string" ? expression.name : null
    const target = name ? resolve(file, name, depth + 1) : null
    return target ? rendered(target, file, depth + 1) : unreadable("the rendering is a name")
  }

  return { surface: () => sources.runtimeExports(ENTRY), componentOf, renderings }
}

function element(rendering: Ast, reader: { resolve: (name: string) => Ast | null }): Rendering {
  const slots = noSlots()
  const opening = rendering.type === "JSXElement" ? asNode(rendering.openingElement) : null
  for (const attribute of opening ? nodes(opening.attributes) : []) {
    if (attribute.type === "JSXSpreadAttribute") {
      const argument = asNode(attribute.argument)
      if (argument) absorb(slots, propsStamp(argument, reader, 0))
      continue
    }
    collectSlots(attribute, reader, slots)
  }
  // The root's own attributes are the contract. Only a wrapper that renders no
  // host element of its own - a Base UI root, a portal, a context provider -
  // pushes the anatomy down a level, and then the first stamped element inside
  // it is the root. A part is still never the root: it spells a different name
  // and the name is judged.
  if (slots.names.length === 0 && !slots.computed) {
    if (opening) for (const child of nodes(rendering.children)) collectSlots(child, reader, slots)
    // `useRender({ props: … })` and friends: the stamp lives in the props object
    // the call receives, so the call node carries the whole rendering.
    else collectSlots(rendering, reader, slots)
  }
  return { kind: "element", slots }
}

// A component with branches renders each of them, and the contract holds only
// when it holds for all: the slots accumulate, so one branch without the stamp
// leaves the count short rather than passing on its sibling.
function merge(renderings: Rendering[]): Rendering {
  const slots = noSlots()
  for (const rendering of renderings) {
    if (rendering.kind === "nothing") continue
    if (rendering.kind === "unreadable") return rendering
    for (const name of rendering.slots.names)
      if (!slots.names.includes(name)) slots.names.push(name)
    slots.computed ||= rendering.slots.computed
  }
  return slots.names.length || slots.computed ? { kind: "element", slots } : NOTHING
}

interface Finding {
  readonly component: string
  readonly rule: DataSlotRule
  readonly problem: string
}

function judge(component: Component, renderings: Rendering[]): Finding[] {
  const where = `${component.file.slice("src/".length)}: ${component.name}`
  const expected = kebab(component.name)
  const match = owns(expected)
  if (!renderings.length) {
    return [
      {
        component: component.name,
        rule: "root-slot",
        problem: `${where}: renders nothing, so it declares no root slot`,
      },
    ]
  }
  const findings: Finding[] = []
  for (const rendering of renderings) {
    if (rendering.kind === "nothing") continue
    if (rendering.kind === "unreadable") {
      findings.push({
        component: component.name,
        rule: "root-slot",
        problem: `${where}: the root is unreadable (${rendering.reason}), so the slot cannot be verified`,
      })
      continue
    }
    if (rendering.slots.names.some(match)) continue
    if (!rendering.slots.names.length && rendering.slots.computed) {
      findings.push({
        component: component.name,
        rule: "slot-name",
        problem: `${where}: the root slot is computed at runtime, so it cannot be read as "${expected}"`,
      })
      continue
    }
    const found = rendering.slots.names.length
      ? `the root slot is ${rendering.slots.names.map((name) => `"${name}"`).join(" / ")}, not "${expected}"`
      : `the root carries no ${SLOT_ATTRIBUTE}`
    findings.push({
      component: component.name,
      rule: rendering.slots.names.length ? "slot-name" : "root-slot",
      problem: `${where}: ${found}`,
    })
  }
  return findings
}

type Exceptions = z.infer<typeof DataSlotExceptionsSchema>

function readExceptions(workspace: Workspace): Exceptions {
  const file = workspace.path(EXCEPTIONS)
  if (!fs.existsSync(file)) return { schemaVersion: 1, exceptions: [] }
  return parseSchema(DataSlotExceptionsSchema, readJson(file), EXCEPTIONS)
}

export function checkDataSlots(workspace: Workspace): CheckReport {
  const reader = createComponentReader(workspace)
  const findings: Finding[] = []
  let components = 0
  for (const identity of reader.surface().values()) {
    const component = reader.componentOf(identity)
    if (!component) continue
    components += 1
    findings.push(...judge(component, reader.renderings(component)))
  }

  const errors: string[] = []
  const registered = new Map<string, string>()
  for (const exception of readExceptions(workspace).exceptions) {
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
    "data slots",
    `${components} public component(s), ${waived.size} exempt`,
    [...problems, ...errors],
    { warnings },
  )
}
