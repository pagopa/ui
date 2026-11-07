import assert from "node:assert/strict"
import { test } from "node:test"

import { checkClientDirectives } from "../../src/checks/client-directives.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

const HOOK = `import { useState } from "react"

export function Counter() {
  const [value] = useState(0)
  return value
}
`
const CONTEXT = `import { createContext } from "react"

export const FieldContext = createContext(null)
`
const HANDLER = `export function Action() {
  return <button onClick={() => undefined}>Azione</button>
}
`
const DEPENDENCY = `import { Button } from "@base-ui/react/button"

export function Action() {
  return <Button>Azione</Button>
}
`
const PURE = `export function Line({ label }: { label: string }) {
  return <span>{label}</span>
}
`
const BARREL = `export * from "./line"
export { Action } from "./action"
`
const UNNEEDED = `"use client"

export function Line({ label }: { label: string }) {
  return <span>{label}</span>
}
`
const COMMENT = `// A hook call such as useState(0) and an onClick= handler need no directive.
export function Line({ label }: { label: string }) {
  return <span>{label}</span>
}
`

function check(files, options) {
  const tree = fixtureTree(files)
  try {
    return checkClientDirectives(workspaceAt(tree.root), options)
  } finally {
    tree.dispose()
  }
}

test("a hook without the directive is a problem and names its trigger", () => {
  const result = check({ "src/components/counter.tsx": HOOK })
  assert.equal(result.problems.length, 1)
  assert.match(result.problems[0], /counter\.tsx: client module without "use client" \(hook\)/)
  assert.match(result.summary, /1 client module\(s\), 1 missing, 0 unneeded/)
})

test("a context, an event handler and a client dependency are classified", () => {
  const result = check({
    "src/components/field-context.tsx": CONTEXT,
    "src/components/action.tsx": HANDLER,
    "src/components/menu.tsx": DEPENDENCY,
  })
  assert.deepEqual(result.problems.map((problem) => problem.match(/\(([^)]+)\)/)?.[1]).sort(), [
    "client dependency",
    "createContext",
    "event handler",
  ])
})

test("a pure component and a barrel are not client modules", () => {
  const result = check({
    "src/components/line.tsx": PURE,
    "src/components/index.ts": BARREL,
  })
  assert.deepEqual(result.problems, [])
  assert.match(result.summary, /^0 client module\(s\), 0 missing, 0 unneeded$/)
})

test("an unneeded directive is a warning, and report mode lists both sets without failing", () => {
  const files = {
    "src/components/line.tsx": UNNEEDED,
    "src/components/counter.tsx": HOOK,
  }
  const failing = check(files)
  assert.equal(failing.problems.length, 1)
  assert.deepEqual(failing.warnings, ['src/components/line.tsx: unneeded "use client"'])
  const result = check(files, { report: true })
  assert.deepEqual(result.problems, [])
  assert.deepEqual(result.details, [
    "missing: src/components/counter.tsx (hook)",
    "unneeded: src/components/line.tsx",
  ])
  assert.match(result.summary, /1 client module\(s\), 1 missing, 1 unneeded/)
})

test("a trigger quoted in a comment does not count", () => {
  const result = check({ "src/components/line.tsx": COMMENT })
  assert.deepEqual(result.problems, [])
  assert.match(result.summary, /^0 client module/)
})

test("test and story files are skipped", () => {
  const result = check({
    "src/components/counter.tsx": HOOK,
    "src/components/counter.test.tsx": HOOK,
    "src/components/counter.unit.test.tsx": HOOK,
    "src/components/counter.stories.tsx": HOOK,
  })
  assert.equal(result.problems.length, 1)
  assert.match(result.problems[0], /^src\/components\/counter\.tsx:/)
})

test("check client-directives --report prints the inventory and exits successfully", async () => {
  const tree = fixtureTree({
    "src/components/counter.tsx": HOOK,
    "src/components/line.tsx": UNNEEDED,
  })
  try {
    const result = await runCli(["check", "client-directives", "--report"], { root: tree.root })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /^missing: src\/components\/counter\.tsx \(hook\)/m)
    assert.match(result.stdout, /^unneeded: src\/components\/line\.tsx$/m)
    assert.match(
      result.stdout,
      /^client directives: OK — 1 client module\(s\), 1 missing, 1 unneeded$/m,
    )
  } finally {
    tree.dispose()
  }
})
