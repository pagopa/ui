import assert from "node:assert/strict"
import { test } from "node:test"

import { checkImportLayers } from "../../src/checks/import-layers.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

function check(files) {
  const tree = fixtureTree(files)
  try {
    return checkImportLayers(workspaceAt(tree.root))
  } finally {
    tree.dispose()
  }
}

const hasProblem = (result, pattern) => assert.match(result.problems.join("\n"), pattern)

test("library imports cannot consume catalog data through an alias", () => {
  hasProblem(
    check({
      "src/components/primitives/control.tsx": 'import { fileKey } from "@/catalog/figma/file"',
      "src/catalog/figma/file.ts": 'export const fileKey = "fixture"',
    }),
    /library code must not import/,
  )
})

test("inline TypeScript import types cannot bypass the library boundary", () => {
  hasProblem(
    check({
      "src/components/primitives/control.tsx":
        'export type Source = import("@/catalog/figma/file").FileKey',
      "src/catalog/figma/file.ts": 'export type FileKey = "fixture"',
    }),
    /library code must not import/,
  )
})

test("primitives cannot import a family through a relative re-export", () => {
  hasProblem(
    check({
      "src/components/primitives/control.tsx": "export { Field } from '../inputs/field'",
      "src/components/inputs/field.tsx": "export const Field = () => null",
    }),
    /primitives.*inputs/,
  )
})

test("dynamic imports cannot bring the demo layer into the library", () => {
  const result = check({
    "src/components/inputs/control.tsx": 'export const load = () => import("../templates")',
    "src/components/templates/demo.tsx": "export const Demo = () => null",
  })
  hasProblem(result, /imports removed layer "src\/components\/templates"/)
  hasProblem(result, /removed layer must not exist/)
})

test("the retired screens layer cannot be restored", () => {
  hasProblem(
    check({ "src/components/screens/demo.tsx": "export const Demo = () => null" }),
    /removed layer must not exist/,
  )
})

test("removed layers cannot be restored through relative barrel imports", () => {
  hasProblem(
    check({
      "src/components/inputs/control.tsx": 'import { Legacy } from "../atoms"',
      "src/components/atoms/index.ts": "export const Legacy = () => null",
    }),
    /imports removed layer/,
  )
})

test("cycles between otherwise allowed families are rejected", () => {
  hasProblem(
    check({
      "src/components/inputs/control.tsx": 'export { Notice } from "@/components/feedback"',
      "src/components/feedback/index.ts": 'export { Control } from "../inputs/control"',
    }),
    /dependency cycle.*inputs\/control\.tsx.*feedback\/index\.ts/,
  )
})

test("a helper cannot hide a forbidden library-to-catalog dependency", () => {
  hasProblem(
    check({
      "src/components/primitives/control.tsx": 'export { fileKey } from "@/shared/control"',
      "src/shared/control.ts": 'export { fileKey } from "@/catalog/figma/file"',
      "src/catalog/figma/file.ts": 'export const fileKey = "fixture"',
    }),
    /library code must not import.*catalog/,
  )
})

test("CommonJS imports cannot bypass the demo boundary", () => {
  const result = check({
    "src/components/inputs/control.tsx": 'const Demo = require("../templates"); export { Demo }',
    "src/components/templates/demo.tsx": "export const Demo = () => null",
  })
  hasProblem(result, /imports removed layer "src\/components\/templates"/)
  hasProblem(result, /removed layer must not exist/)
})

test("legitimate composition and type-only relationships remain allowed", () => {
  assert.deepEqual(
    check({
      "src/components/primitives/control.tsx": "export const Control = () => null",
      "src/components/inputs/index.ts":
        'export { Control } from "../primitives/control"; import type { Notice } from "../feedback"',
      "src/components/feedback/index.ts":
        'export type Notice = {}; import type { Control } from "../inputs"',
      "src/lib/demo.ts": 'export { Control } from "../components/inputs"',
    }).problems,
    [],
  )
})

test("the retired templates layer cannot be restored", () => {
  hasProblem(
    check({
      "src/components/templates/demo.tsx": 'export { Control } from "../inputs"',
      "src/components/inputs/control.tsx": "export const Control = () => null",
    }),
    /removed layer must not exist/,
  )
})

test("comments and strings are not mistaken for dependencies", () => {
  assert.deepEqual(
    check({
      "src/components/primitives/control.tsx":
        '// import { Demo } from "@/components/screens"\nexport const text = \'from "@/catalog/figma/file"\'',
    }).problems,
    [],
  )
})

test("the configured cn engine is the only entry point for class merging", () => {
  hasProblem(
    check({
      "src/components/primitives/control.tsx":
        'import { cn } from "cn"\nexport const Control = () => cn("px-2")',
    }),
    /import the configured cn from "@\/lib\/cn"/,
  )
  hasProblem(
    check({
      "src/components/inputs/control.tsx":
        'import { createCn } from "cn/config"\nexport const Control = createCn()',
    }),
    /import the configured cn from "@\/lib\/cn"/,
  )
  assert.deepEqual(
    check({
      "src/lib/cn.ts": 'import { createCn } from "cn/config"\nexport const cn = createCn()',
      "src/components/primitives/control.tsx":
        'import { cn } from "@/lib/cn"\nexport const Control = () => cn("px-2")',
    }).problems,
    [],
  )
})

test("third-party runtimes stay inside the primitives layer", () => {
  for (const specifier of ["@base-ui/react/checkbox", "react-day-picker", "lucide-react"]) {
    hasProblem(
      check({
        "src/components/inputs/control.tsx": `import { Marker } from "${specifier}"\nexport const Control = () => Marker`,
      }),
      /only the primitives layer may import/,
    )
  }
  assert.deepEqual(
    check({
      "src/components/primitives/control.tsx":
        'import { Checkbox } from "@base-ui/react/checkbox"\nexport const Control = () => Checkbox',
    }).problems,
    [],
  )
  hasProblem(
    check({
      "src/components/templates/demo.tsx":
        'import { X } from "lucide-react"\nexport const Demo = () => X',
    }),
    /removed layer must not exist/,
  )
})

test("computed imports fail instead of silently escaping enforcement", () => {
  hasProblem(
    check({
      "src/components/primitives/control.tsx": "export const load = (path: string) => import(path)",
    }),
    /literal module path/,
  )
})

test("check layers prints the import-layer report name and verdict", async () => {
  const tree = fixtureTree({
    "src/components/primitives/control.tsx": 'import { fileKey } from "@/catalog/figma/file"',
  })
  try {
    const result = await runCli(["check", "layers"], { root: tree.root })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /^import layers: 1 problem\(s\) — \d+ modules/m)
    assert.match(result.stderr, /library code must not import/)
  } finally {
    tree.dispose()
  }
})
