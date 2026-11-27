import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { test } from "node:test"

import { checkUtilityPrefix } from "../../src/checks/utility-prefix.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

// The oracle is the library's own stylesheet, so a fixture never restates the
// theme: the gate asks the compiler that ships the utilities.
const ENTRY = path.resolve(import.meta.dirname, "../../../pagopa-ui/src/library.css")

const LEAKED = `export function Chip({ active }: { active: boolean }) {
  return <span className={cn("pui:inline-flex", active && "items-center")} />
}
`
const INDIRECT = `const frameClass = ratio === "square" ? "aspect-square" : "aspect-video"

export function Frame() {
  return <img className={cn("pui:w-full", frameClass)} />
}
`
const LIBRARY_ONLY = `export function Card() {
  return <div className={cn("pui:rounded-lg", "bg-accent")} />
}
`
// The map is the shape `popper.tsx` uses: a `Record` read with a runtime key,
// so the entry the class comes from is only reachable through the map.
const CLASS_MAP = `const toneRing: Record<Tone, string> = {
  info: "ring-info-border",
  error: "ring-error-border",
}

const alignment: Record<Align, string> = {
  center: "justify-center",
  left: "pui:justify-start",
}

export function Popper({ tone }: { tone: Tone }) {
  return <div className={cn("pui:rounded-lg", toneRing[tone], alignment["center"])} />
}
`
// `outline` is both a `cva` variant and a utility: in the options of a variant
// API it names the variant, so it is not a class position.
const VARIANT_OPTIONS = `export function Action({ image }: { image: boolean }) {
  const actionVariant = image ? "outline" : "pui:ghost"
  return <button className={cn(buttonVariants({ variant: actionVariant }), "pui:h-full")} />
}
`
// A marker names a group, a hand-written rule belongs to the entry, and an
// invented token compiles to nothing: none of them is a utility. A theme
// utility is: `shimmer` is one, so spelling it bare is a problem.
const MARKERS = `export function Row() {
  return <div className={cn("pui:flex", "group/alert", "pagopa-icon", "compact")} />
}
`
const PREFIXED = `export function Row({ mono }: { mono: boolean }) {
  return (
    <div className={cn("pui:flex pui:items-center", mono && "pui:font-mono")}>
      <span className="pui:sr-only">Azione</span>
    </div>
  )
}
`

function check(files, options = { sources: ["src"], entry: ENTRY }) {
  const tree = fixtureTree(files)
  try {
    return checkUtilityPrefix(workspaceAt(tree.root), options)
  } finally {
    tree.dispose()
  }
}

test("a bare utility in a class position is a problem and names its file and line", async () => {
  const result = await check({ "src/components/chip.tsx": LEAKED })
  assert.deepEqual(result.problems, [
    'src/components/chip.tsx:2: unprefixed utility "items-center" (write "pui:items-center")',
  ])
  assert.match(result.summary, /^1 file\(s\), 1 class token\(s\) without the prefix$/)
})

test("a class list held in a variable is a class position too", async () => {
  const result = await check({ "src/components/frame.tsx": INDIRECT })
  assert.deepEqual(result.problems, [
    'src/components/frame.tsx:1: unprefixed utility "aspect-square" (write "pui:aspect-square")',
    'src/components/frame.tsx:1: unprefixed utility "aspect-video" (write "pui:aspect-video")',
  ])
})

test("a class map read through a member expression is a class position too", async () => {
  const result = await check({ "src/components/popper.tsx": CLASS_MAP })
  assert.deepEqual(result.problems, [
    'src/components/popper.tsx:2: unprefixed utility "ring-info-border" (write "pui:ring-info-border")',
    'src/components/popper.tsx:3: unprefixed utility "ring-error-border" (write "pui:ring-error-border")',
    'src/components/popper.tsx:7: unprefixed utility "justify-center" (write "pui:justify-center")',
  ])
})

test("a variant API's options name a variant, not a class", async () => {
  const result = await check({ "src/components/card.tsx": VARIANT_OPTIONS })
  assert.deepEqual(result.problems, [])
})

test("the utilities are the library's, not a default theme's", async () => {
  const result = await check({ "src/components/card.tsx": LIBRARY_ONLY })
  assert.deepEqual(result.problems, [
    'src/components/card.tsx:2: unprefixed utility "bg-accent" (write "pui:bg-accent")',
  ])
})

test("a marker, a hand-written class and an invented token are not utilities", async () => {
  const result = await check({ "src/components/row.tsx": MARKERS })
  assert.deepEqual(result.problems, [])
  assert.match(result.summary, /^1 file\(s\), 3 class token\(s\) without the prefix$/)
})

test("a fully prefixed tree passes, and stories are scanned by default", async () => {
  const clean = await check(
    { "src/components/row.tsx": PREFIXED },
    { sources: ["src"], entry: ENTRY },
  )
  assert.deepEqual(clean.problems, [])

  const tree = fixtureTree({
    "src/components/row.tsx": PREFIXED,
    "apps/storybook/src/Row.stories.tsx": `export const Grid = {
  render: () => <div className="grid" />,
}
`,
  })
  try {
    const result = await checkUtilityPrefix(workspaceAt(tree.root), { entry: ENTRY })
    assert.deepEqual(result.problems, [
      'apps/storybook/src/Row.stories.tsx:2: unprefixed utility "grid" (write "pui:grid")',
    ])
  } finally {
    tree.dispose()
  }
})

test("check utility-prefix prints the problems and exits 1", async () => {
  const tree = fixtureTree({ "src/components/chip.tsx": LEAKED })
  const resolve = createRequire(
    path.resolve(import.meta.dirname, "../../../pagopa-ui/package.json"),
  )
  const tailwind = path.dirname(path.dirname(resolve.resolve("tailwindcss")))
  const node = path.dirname(path.dirname(path.dirname(resolve.resolve("@tailwindcss/node"))))
  try {
    // A fixture that carries its own compiler input: the default theme is
    // enough to prove the wiring, and the library's theme is the domain tests'.
    fs.mkdirSync(path.join(tree.root, "node_modules"), { recursive: true })
    fs.symlinkSync(tailwind, path.join(tree.root, "node_modules", "tailwindcss"), "dir")
    fs.symlinkSync(node, path.join(tree.root, "node_modules", "@tailwindcss"), "dir")
    tree.write({
      "src/library.css": '@custom-variant pui (&);\n@import "tailwindcss";\n',
    })
    const failing = await runCli(["check", "utility-prefix"], { root: tree.root })
    assert.equal(failing.status, 1)
    assert.match(
      failing.stderr,
      /^ {2}src\/components\/chip\.tsx:2: unprefixed utility "items-center" \(write "pui:items-center"\)$/m,
    )

    tree.write({ "src/components/chip.tsx": PREFIXED })
    const passing = await runCli(["check", "utility-prefix"], { root: tree.root })
    assert.equal(passing.status, 0)
    assert.match(passing.stdout, /^utility prefix: OK — 1 file\(s\), 0 class token\(s\)/m)
  } finally {
    tree.dispose()
  }
})
