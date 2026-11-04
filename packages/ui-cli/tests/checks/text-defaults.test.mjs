import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

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

// Every test cleans up its fixture root in its own finally.
function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-text-defaults-"))
  for (const [file, source] of Object.entries(files)) {
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, source)
  }
  return {
    root,
    run: (...args) =>
      spawnSync(process.execPath, [script, "check", "text-defaults", ...args], {
        cwd: root,
        encoding: "utf8",
        env: fixtureEnv(root),
      }),
  }
}

test("reports string and function defaults and ignores a className", () => {
  const { root, run } = fixture({ "src/components/card/card.tsx": COMPONENT })
  try {
    const result = run()
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /src\/components\/card\/card\.tsx:2 title/)
    assert.match(result.stdout, /src\/components\/card\/card\.tsx:3 pageLabel/)
    assert.doesNotMatch(result.stdout, /className/)
    assert.doesNotMatch(result.stdout, /pointer/)
    assert.doesNotMatch(result.stdout, /variant/)
    assert.match(result.stdout, /2 literal default\(s\)/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("--max fails above the ceiling and passes at it", () => {
  const { root, run } = fixture({ "src/components/card/card.tsx": COMPONENT })
  try {
    assert.equal(run("--max", "1").status, 1)
    assert.equal(run("--max", "2").status, 0)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("skips templates and test files", () => {
  const { root, run } = fixture({
    "src/components/templates/demo.tsx": COMPONENT,
    "src/components/card/card.test.tsx": COMPONENT,
    "src/components/card/card.unit.test.tsx": COMPONENT,
  })
  try {
    const result = run()
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /0 literal default\(s\)/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
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
  const { root, run } = fixture({ "src/components/tag/tag.tsx": TERNARY })
  try {
    const result = run("--max", "0")
    assert.equal(result.status, 1, result.stdout)
    assert.match(result.stdout, /src\/components\/tag\/tag\.tsx:3 label/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a conditional of identifiers alone is not text", () => {
  const { root, run } = fixture({
    "src/components/tag/tag.tsx": `function Tag({
  shape = status === "valid" ? "round" : "square",
}) { return null }
`,
  })
  try {
    const result = run("--max", "0")
    assert.equal(result.status, 0, result.stdout)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

const ATTRIBUTES = `function Chip({ label }) {
  return <span>
    <button aria-label={\`Elimina \${label}\`} className="p-4" />
    <input placeholder="Cerca qui" />
  </span>
}
`

test("reports copy a JSX attribute paints or announces", () => {
  const { root, run } = fixture({ "src/components/chip/chip.tsx": ATTRIBUTES })
  try {
    const result = run("--max", "0")
    assert.equal(result.status, 1, result.stdout)
    assert.match(result.stdout, /src\/components\/chip\/chip\.tsx:3 aria-label/)
    assert.match(result.stdout, /src\/components\/chip\/chip\.tsx:4 placeholder/)
    assert.doesNotMatch(result.stdout, /className/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a literal that guards a type or reads a key is not copy", () => {
  const { root, run } = fixture({
    "src/components/chip/chip.tsx": `function Chip({ children, props, t }) {
  return <span>
    <button aria-label={typeof children === "string" ? t.sortLabel(children) : undefined} />
    <span aria-label={props["aria-label"]} />
    <span aria-label={\`\${props.count}%\`} />
  </span>
}
`,
  })
  try {
    const result = run("--max", "0")
    assert.equal(result.status, 0, result.stdout)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

const OBJECT_DEFAULT = `function Table({
  emptyState = { title: "Nessun risultato" },
  pagination = { show: true },
}) {
  return null
}
`

test("reports copy an object-literal default carries", () => {
  const { root, run } = fixture({ "src/components/table/table.tsx": OBJECT_DEFAULT })
  try {
    const result = run("--max", "0")
    assert.equal(result.status, 1, result.stdout)
    assert.match(result.stdout, /src\/components\/table\/table\.tsx:2 emptyState\.title/)
    assert.doesNotMatch(result.stdout, /pagination/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
