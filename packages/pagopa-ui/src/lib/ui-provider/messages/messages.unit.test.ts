import fc from "fast-check"
import { expect, test } from "vitest"

import { enMessages, itMessages } from "./index"

type Message = string | ((argument: unknown) => string)

interface Leaf {
  path: string
  value: Message
}

interface CallableLeaf extends Leaf {
  value: (argument: unknown) => string
}

function isMessage(value: unknown): value is Message {
  return typeof value === "string" || typeof value === "function"
}

// Every rendering the dictionary offers, flattened to the addresses a
// component asks for: `table.sortLabel`, `chip.removeLabel`.
function leaves(node: unknown, path = ""): Leaf[] {
  if (isMessage(node)) return [{ path, value: node }]
  if (typeof node !== "object" || node === null) return []
  return Object.entries(node).flatMap(([key, value]) =>
    leaves(value, path ? `${path}.${key}` : key),
  )
}

function isCallable(leaf: Leaf): leaf is CallableLeaf {
  return typeof leaf.value === "function"
}

const italian = leaves(itMessages)
const english = leaves(enMessages)

test("every message of one locale exists in the other", () => {
  const addresses = (dictionary: Leaf[]) => dictionary.map((leaf) => leaf.path).sort()
  expect(addresses(english)).toEqual(addresses(italian))
})

test("a locale names the same callables as the other", () => {
  const kinds = (dictionary: Leaf[]) =>
    new Map(dictionary.map((leaf) => [leaf.path, typeof leaf.value]))
  expect(kinds(english)).toEqual(kinds(italian))
})

test("every message renders something", () => {
  const empty = [...italian, ...english].filter(
    (leaf) => typeof leaf.value === "string" && leaf.value.trim() === "",
  )
  expect(empty.map((leaf) => leaf.path)).toEqual([])
})

// A stand-in for any value a component hands a message: property access, calls
// and textual coercion all resolve to the same string, so a message that
// renders its argument renders this one.
function standIn(primitive: string): unknown {
  const proxy: unknown = new Proxy(() => proxy, {
    get: (_target, key) => {
      if (key === Symbol.toPrimitive || key === "toString") return () => primitive
      return proxy
    },
    apply: () => proxy,
  })
  return proxy
}

const ECHO = "\u0000"

// A message that echoes the value it is handed must echo exactly that value:
// the failure this catches is a dictionary or a component that renders a
// fixed label for every input, the shape the hardcoded "Elimina" fallback had.
// A lookup message maps a documented key to copy instead of echoing it, so it
// is out of scope by its own behaviour, not by a list: the probe decides.
const ECHOING = italian
  .filter((leaf): leaf is CallableLeaf => isCallable(leaf) && leaf.value.length === 1)
  .filter((leaf) => {
    const probe = `${ECHO}probe`
    return leaf.value(standIn(probe)).includes(probe)
  })
  .map((leaf) => leaf.value)

// The rendering must carry the argument unchanged and must not leak the string
// form a component would produce by accident: `NaN`, `[object Object]`, or an
// unevaluated template.
const LEAKED = /NaN|\[object Object\]|\$\{/

test("the echoed argument reaches the rendered message unchanged", () => {
  expect(ECHOING.length).toBeGreaterThan(0)
  fc.assert(
    fc.property(fc.string(), fc.string(), (left, right) => {
      if (left === right) return
      for (const message of ECHOING) {
        const rendered = message(standIn(`${ECHO}${right}`))
        expect(rendered).toContain(`${ECHO}${right}`)
        expect(rendered).not.toMatch(LEAKED)
      }
    }),
    { numRuns: 25 },
  )
})
