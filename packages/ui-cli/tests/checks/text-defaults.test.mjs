import assert from "node:assert/strict"
import { test } from "node:test"

import { checkTextDefaults } from "../../src/checks/text-defaults.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

const COMPONENT = `function Card({
  title = "Titolo predefinito",
  pageLabel = (page) => \`Pagina \${page}\`,
  className = "p-4",
  pointer = "center",
  variant = "default",
}) {
  return null
}
`

function check(files, options) {
  const tree = fixtureTree(files)
  try {
    return checkTextDefaults(workspaceAt(tree.root), options)
  } finally {
    tree.dispose()
  }
}

test("reports string and function defaults and ignores non-text props", () => {
  const result = check({ "src/components/card/card.tsx": COMPONENT })
  assert.deepEqual(result.details, [
    "src/components/card/card.tsx:2 title",
    "src/components/card/card.tsx:3 pageLabel",
  ])
  assert.match(result.summary, /^2 literal default\(s\) in 1 file\(s\)$/)
  assert.deepEqual(result.problems, [])
})

test("--max fails above the ceiling and passes at it", () => {
  const files = { "src/components/card/card.tsx": COMPONENT }
  assert.match(check(files, { max: 1 }).problems[0], /2 literal default\(s\), the ceiling is 1/)
  assert.deepEqual(check(files, { max: 2 }).problems, [])
})

test("templates and test files are skipped", () => {
  const result = check({
    "src/components/templates/demo.tsx": COMPONENT,
    "src/components/card/card.test.tsx": COMPONENT,
    "src/components/card/card.unit.test.tsx": COMPONENT,
  })
  assert.deepEqual(result.problems, [])
  assert.match(result.summary, /^0 literal default\(s\)/)
})

const TERNARY = `function Tag({
  status,
  label = status === "valid" ? "EVENTO RETTIFICATO" : "EVENTO NON VALIDO",
  shape = status === "valid" ? "round" : "square",
}) {
  return null
}
`

test("reports a literal hidden behind a conditional", () => {
  const result = check({ "src/components/tag/tag.tsx": TERNARY }, { max: 0 })
  assert.match(result.problems[0], /1 literal default/)
  assert.deepEqual(result.details, ["src/components/tag/tag.tsx:3 label"])
})

test("a conditional of identifiers alone is not text", () => {
  const result = check(
    {
      "src/components/tag/tag.tsx": `function Tag({\n  shape = status === "valid" ? "round" : "square",\n}) { return null }\n`,
    },
    { max: 0 },
  )
  assert.deepEqual(result.problems, [])
  assert.equal(result.summary, "0 literal default(s), the ceiling is 0")
})

const ATTRIBUTES = `function Chip({ label }) {
  return <span>
    <button aria-label={\`Elimina \${label}\`} className="p-4" />
    <input placeholder="Cerca qui" />
  </span>
}
`

test("reports copy in JSX attributes that paint or announce", () => {
  const result = check({ "src/components/chip/chip.tsx": ATTRIBUTES }, { max: 0 })
  assert.deepEqual(result.details, [
    "src/components/chip/chip.tsx:3 aria-label",
    "src/components/chip/chip.tsx:4 placeholder",
  ])
  assert.equal(result.problems.length, 1)
})

test("a literal that guards a type or reads a key is not copy", () => {
  assert.deepEqual(
    check(
      {
        "src/components/chip/chip.tsx": `function Chip({ children, props, t }) {\n  return <span>\n    <button aria-label={typeof children === "string" ? t.sortLabel(children) : undefined} />\n    <span aria-label={props["aria-label"]} />\n    <span aria-label={\`\${props.count}%\`} />\n  </span>\n}\n`,
      },
      { max: 0 },
    ).problems,
    [],
  )
})

const OBJECT_DEFAULT = `function Table({
  emptyState = { title: "Nessun risultato" },
  pagination = { show: true },
}) {
  return null
}
`

test("reports copy carried by an object-literal default", () => {
  const result = check({ "src/components/table/table.tsx": OBJECT_DEFAULT }, { max: 0 })
  assert.deepEqual(result.details, ["src/components/table/table.tsx:2 emptyState.title"])
})

test("check text-defaults --max prints the verdict and rejects non-numeric limits", async () => {
  const tree = fixtureTree({ "src/components/card/card.tsx": COMPONENT })
  try {
    const accepted = await runCli(["check", "text-defaults", "--max", "2"], { root: tree.root })
    assert.equal(accepted.status, 0)
    assert.match(accepted.stdout, /^text defaults: OK — 2 literal default\(s\), the ceiling is 2$/m)
    const invalid = await runCli(["check", "text-defaults", "--max", "x"], { root: tree.root })
    assert.equal(invalid.status, 2)
    assert.match(invalid.stderr, /--max must be an integer/)
  } finally {
    tree.dispose()
  }
})
