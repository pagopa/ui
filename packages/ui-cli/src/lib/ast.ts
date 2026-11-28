// Reading a parsed TypeScript module without binding to one AST union: the
// checks walk by `type` and by the keys a node kind carries, so every one of
// them needs the same guard and the same walk.

// An oxc node without its union.
export interface Ast {
  type: string
  start: number
  end: number
  [key: string]: unknown
}

export const isNode = (value: unknown): value is Ast =>
  typeof value === "object" && value !== null && typeof Reflect.get(value, "type") === "string"

export const asNode = (value: unknown): Ast | null => (isNode(value) ? value : null)

export const nodes = (value: unknown): Ast[] =>
  Array.isArray(value) ? value.map(asNode).filter((entry): entry is Ast => entry !== null) : []

const FUNCTION_NODES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
])

/** Whether a node declares a function, in any of the three spellings source uses. */
export const isFunctionNode = (node: Ast): boolean => FUNCTION_NODES.has(node.type)

function descend(node: Ast, own: boolean, visit: (node: Ast) => void): void {
  visit(node)
  for (const [key, value] of Object.entries(node)) {
    if (key === "type" || key === "start" || key === "end") continue
    const child = asNode(value)
    if (child) {
      if (!own || !FUNCTION_NODES.has(child.type)) descend(child, own, visit)
      continue
    }
    for (const entry of nodes(value)) {
      if (!own || !FUNCTION_NODES.has(entry.type)) descend(entry, own, visit)
    }
  }
}

/** Every node under this one, this one included. */
export const walk = (node: Ast, visit: (node: Ast) => void): void => descend(node, false, visit)

/**
 * The same walk, but the node's own body: a return inside a callback is the
 * callback's, not the component's.
 */
export const walkOwn = (node: Ast, visit: (node: Ast) => void): void => descend(node, true, visit)

/** A 1-based line for a byte offset in the source. */
export const lineOf = (source: string, offset: number): number =>
  source.slice(0, offset).split("\n").length
