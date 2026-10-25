import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

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

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-client-directives-"))
  for (const [file, source] of Object.entries(files)) {
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, source)
  }
  return {
    root,
    run: (...args) =>
      spawnSync(process.execPath, [script, "check", "client-directives", ...args], {
        cwd: root,
        encoding: "utf8",
        env: fixtureEnv(root),
      }),
  }
}

test("fails on a hook without the directive and names the trigger", () => {
  const { root, run } = fixture({ "src/components/counter.tsx": HOOK })
  try {
    const result = run()
    assert.equal(result.status, 1)
    assert.match(result.stdout, /missing: src\/components\/counter\.tsx \(hook\)/)
    assert.match(result.stderr, /1 client module\(s\) without "use client"/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("reports a context, an event handler and a client dependency", () => {
  const { root, run } = fixture({
    "src/components/field-context.tsx": CONTEXT,
    "src/components/action.tsx": HANDLER,
    "src/components/menu.tsx": DEPENDENCY,
  })
  try {
    const result = run()
    assert.equal(result.status, 1)
    assert.match(result.stdout, /field-context\.tsx \(createContext\)/)
    assert.match(result.stdout, /action\.tsx \(event handler\)/)
    assert.match(result.stdout, /menu\.tsx \(client dependency\)/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a pure component and a barrel are not client modules", () => {
  const { root, run } = fixture({
    "src/components/line.tsx": PURE,
    "src/components/index.ts": BARREL,
  })
  try {
    const result = run()
    assert.equal(result.status, 0, result.stderr)
    assert.doesNotMatch(result.stdout, /missing:/)
    assert.match(result.stdout, /0 client module\(s\), 0 missing, 0 unneeded — OK/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("an unneeded directive is a warning, and --report exits 0 with both lists", () => {
  const { root, run } = fixture({
    "src/components/line.tsx": UNNEEDED,
    "src/components/counter.tsx": HOOK,
  })
  try {
    const failing = run()
    assert.equal(failing.status, 1)
    assert.match(failing.stdout, /unneeded: src\/components\/line\.tsx/)
    assert.match(failing.stderr, /1 unneeded directive\(s\)/)

    const report = run("--report")
    assert.equal(report.status, 0, report.stderr)
    assert.match(report.stdout, /missing: src\/components\/counter\.tsx/)
    assert.match(report.stdout, /unneeded: src\/components\/line\.tsx/)
    assert.match(report.stdout, /1 client module\(s\), 1 missing, 1 unneeded/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a trigger quoted in a comment does not count", () => {
  const { root, run } = fixture({ "src/components/line.tsx": COMMENT })
  try {
    const result = run()
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /0 client module\(s\)/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("skips test and story files", () => {
  const { root, run } = fixture({
    "src/components/counter.tsx": HOOK,
    "src/components/counter.test.tsx": HOOK,
    "src/components/counter.unit.test.tsx": HOOK,
    "src/components/counter.stories.tsx": HOOK,
  })
  try {
    const result = run()
    assert.equal(result.status, 1)
    assert.equal((result.stdout.match(/^missing: /gm) ?? []).length, 1)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
