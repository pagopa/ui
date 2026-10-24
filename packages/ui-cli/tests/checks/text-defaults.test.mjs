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
