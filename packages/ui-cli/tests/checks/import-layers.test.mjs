import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

function check(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-layers-"))
  try {
    for (const [file, source] of Object.entries(files)) {
      const target = path.join(root, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, source)
    }
    return spawnSync(process.execPath, [script, "check", "layers"], {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnv(root),
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("library imports cannot consume catalog data through an alias", () => {
  const result = check({
    "src/components/primitives/control.tsx": 'import { fileKey } from "@/catalog/figma/file"',
    "src/catalog/figma/file.ts": 'export const fileKey = "fixture"',
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /library code must not import/)
})

test("inline TypeScript import types cannot bypass the library boundary", () => {
  const result = check({
    "src/components/primitives/control.tsx":
      'export type Source = import("@/catalog/figma/file").FileKey',
    "src/catalog/figma/file.ts": 'export type FileKey = "fixture"',
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /library code must not import/)
})

test("primitives cannot import a family through a relative re-export", () => {
  const result = check({
    "src/components/primitives/control.tsx": "export { Field } from '../inputs/field'",
    "src/components/inputs/field.tsx": "export const Field = () => null",
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /primitives.*inputs/)
})

test("dynamic imports cannot bring the demo layer into the library", () => {
  const result = check({
    "src/components/inputs/control.tsx": 'export const load = () => import("../templates")',
    "src/components/templates/demo.tsx": "export const Demo = () => null",
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /imports removed layer "src\/components\/templates"/)
  assert.match(result.stderr, /removed layer must not exist/)
})

test("the retired screens layer cannot be restored", () => {
  const result = check({
    "src/components/screens/demo.tsx": "export const Demo = () => null",
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /removed layer must not exist/)
})

test("removed layers cannot be restored through relative barrel imports", () => {
  const result = check({
    "src/components/inputs/control.tsx": 'import { Legacy } from "../atoms"',
    "src/components/atoms/index.ts": "export const Legacy = () => null",
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /imports removed layer/)
})

test("cycles between otherwise allowed families are rejected", () => {
  const result = check({
    "src/components/inputs/control.tsx": 'export { Notice } from "@/components/feedback"',
    "src/components/feedback/index.ts": 'export { Control } from "../inputs/control"',
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /dependency cycle.*inputs\/control\.tsx.*feedback\/index\.ts/)
})

test("a helper cannot hide a forbidden library-to-catalog dependency", () => {
  const result = check({
    "src/components/primitives/control.tsx": 'export { fileKey } from "@/shared/control"',
    "src/shared/control.ts": 'export { fileKey } from "@/catalog/figma/file"',
    "src/catalog/figma/file.ts": 'export const fileKey = "fixture"',
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /library code must not import.*catalog/)
})

test("CommonJS imports cannot bypass the demo boundary", () => {
  const result = check({
    "src/components/inputs/control.tsx": 'const Demo = require("../templates"); export { Demo }',
    "src/components/templates/demo.tsx": "export const Demo = () => null",
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /imports removed layer "src\/components\/templates"/)
  assert.match(result.stderr, /removed layer must not exist/)
})

test("legitimate composition and type-only relationships remain allowed", () => {
  const result = check({
    "src/components/primitives/control.tsx": "export const Control = () => null",
    "src/components/inputs/index.ts":
      'export { Control } from "../primitives/control"; import type { Notice } from "../feedback"',
    "src/components/feedback/index.ts":
      'export type Notice = {}; import type { Control } from "../inputs"',
    "src/lib/demo.ts": 'export { Control } from "../components/inputs"',
  })
  assert.equal(result.status, 0, result.stderr)
})

test("the retired templates layer cannot be restored", () => {
  const result = check({
    "src/components/templates/demo.tsx": 'export { Control } from "../inputs"',
    "src/components/inputs/control.tsx": "export const Control = () => null",
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /removed layer must not exist/)
})

test("comments and strings are not mistaken for dependencies", () => {
  const result = check({
    "src/components/primitives/control.tsx":
      '// import { Demo } from "@/components/screens"\nexport const text = \'from "@/catalog/figma/file"\'',
  })
  assert.equal(result.status, 0, result.stderr)
})

test("the configured cn engine is the only entry point for class merging", () => {
  const direct = check({
    "src/components/primitives/control.tsx":
      'import { cn } from "cn"\nexport const Control = () => cn("px-2")',
  })
  assert.equal(direct.status, 1)
  assert.match(direct.stderr, /import the configured cn from "@\/lib\/cn"/)
  const subpath = check({
    "src/components/inputs/control.tsx":
      'import { createCn } from "cn/config"\nexport const Control = createCn()',
  })
  assert.equal(subpath.status, 1)
  assert.match(subpath.stderr, /import the configured cn from "@\/lib\/cn"/)
  const wrapper = check({
    "src/lib/cn.ts": 'import { createCn } from "cn/config"\nexport const cn = createCn()',
    "src/components/primitives/control.tsx":
      'import { cn } from "@/lib/cn"\nexport const Control = () => cn("px-2")',
  })
  assert.equal(wrapper.status, 0, wrapper.stderr)
})

test("third-party runtimes stay inside the primitives layer", () => {
  for (const specifier of ["@base-ui/react/checkbox", "react-day-picker", "lucide-react"]) {
    const result = check({
      "src/components/inputs/control.tsx": `import { Marker } from "${specifier}"\nexport const Control = () => Marker`,
    })
    assert.equal(result.status, 1, specifier)
    assert.match(result.stderr, /only the primitives layer may import/)
  }
  const allowed = check({
    "src/components/primitives/control.tsx":
      'import { Checkbox } from "@base-ui/react/checkbox"\nexport const Control = () => Checkbox',
  })
  assert.equal(allowed.status, 0, allowed.stderr)
  const retired = check({
    "src/components/templates/demo.tsx":
      'import { X } from "lucide-react"\nexport const Demo = () => X',
  })
  assert.equal(retired.status, 1)
  assert.match(retired.stderr, /removed layer must not exist/)
})

test("computed imports fail instead of silently escaping enforcement", () => {
  const result = check({
    "src/components/primitives/control.tsx": "export const load = (path: string) => import(path)",
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /literal module path/)
})
