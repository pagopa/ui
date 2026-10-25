import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

const CSS = [
  ":root {",
  "  /* Color/Blue/Blue 100 */",
  "  --figma-color-blue-100: #ced8f9;",
  "  /* Foundations/z-50 */",
  "  --figma-z-50: 50;",
  "}",
  "",
].join("\n")

const INVENTORY = [
  "export const figmaTokens: FigmaToken[] = [",
  "  {",
  '    cssName: "--figma-color-blue-100",',
  "  },",
  "  {",
  '    cssName: "text-body",',
  "  },",
  "]",
  "",
].join("\n")

const CONTRACT = [
  "--figma-color-blue-100",
  "--figma-z-50",
  "js:--figma-color-blue-100",
  "js:text-body",
  "",
].join("\n")

// The tokens root is the fixture root here: it has no sibling `packages/tokens`
// manifest, so the check reads the generated files from the audited package.
function fixture(files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-public-tokens-"))
  const sources = {
    "src/tokens.generated.css": CSS,
    "src/figma-tokens.generated.ts": INVENTORY,
    "etc/tokens.txt": CONTRACT,
    ...files,
  }
  for (const [file, source] of Object.entries(sources)) {
    if (source === null) continue
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, source)
  }
  return {
    root,
    run: (...args) =>
      spawnSync(process.execPath, [script, "check", "public-tokens", ...args], {
        cwd: root,
        encoding: "utf8",
        env: fixtureEnv(root, { PAGOPA_UI_TOKENS_ROOT: root }),
      }),
    read: (file) => fs.readFileSync(path.join(root, file), "utf8"),
  }
}

test("identical lists pass", () => {
  const { root, run } = fixture()
  try {
    const result = run()
    assert.equal(result.status, 0, result.stderr)
    assert.match(
      result.stdout,
      /public tokens OK: 2 CSS names, 2 typed names, 4 in etc\/tokens\.txt/,
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a removed token fails as a breaking change", () => {
  const { root, run } = fixture({
    "etc/tokens.txt": CONTRACT.replace("--figma-z-50\n", ""),
  })
  try {
    const result = run()
    assert.equal(result.status, 1)
    assert.match(result.stderr, /public tokens: 1 added, 0 removed/)
    assert.match(result.stderr, /\+ --figma-z-50/)
    assert.match(result.stderr, /a removed or renamed token is a breaking change/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a stale name in the contract is reported as removed", () => {
  const { root, run } = fixture({
    "etc/tokens.txt": `${CONTRACT}js:text-retired\n`,
  })
  try {
    const result = run()
    assert.equal(result.status, 1)
    assert.match(result.stderr, /public tokens: 0 added, 1 removed/)
    assert.match(result.stderr, /- js:text-retired/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a new CSS name or typed name is reported as added", () => {
  const { root, run } = fixture({
    "src/tokens.generated.css": CSS.replace(
      "  --figma-z-50: 50;",
      "  --figma-z-50: 50;\n  --figma-spacing-4: 4px;",
    ),
    "src/figma-tokens.generated.ts": INVENTORY.replace(
      'cssName: "text-body",',
      'cssName: "text-body",\n  },\n  {\n    cssName: "text-label",',
    ),
  })
  try {
    const result = run()
    assert.equal(result.status, 1)
    assert.match(result.stderr, /public tokens: 2 added, 0 removed/)
    assert.match(result.stderr, /\+ --figma-spacing-4/)
    assert.match(result.stderr, /\+ js:text-label/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("--write records the accepted list and the check passes afterwards", () => {
  const { root, run, read } = fixture({
    "etc/tokens.txt": "--figma-color-blue-100\n",
  })
  try {
    const write = run("--write")
    assert.equal(write.status, 0, write.stderr)
    assert.match(write.stdout, /public tokens written: 4 names/)
    assert.equal(read("etc/tokens.txt"), CONTRACT)
    assert.equal(run().status, 0)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a missing contract asks for --write", () => {
  const { root, run } = fixture({ "etc/tokens.txt": null })
  try {
    const result = run()
    assert.equal(result.status, 1)
    assert.match(result.stderr, /4 added, 0 removed/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
