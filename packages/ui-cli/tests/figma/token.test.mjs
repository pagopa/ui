import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const cli = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))
const clis = {
  export: ["figma", "export"],
  sync: ["figma", "sync"],
  pictograms: ["assets", "pictograms", "export"],
}

function runPreflight(command, args, token) {
  const env = { ...process.env }
  delete env.FIGMA_TOKEN
  if (token !== undefined) env.FIGMA_TOKEN = token
  return spawnSync(process.execPath, [cli, ...command, ...args], { encoding: "utf8", env })
}

test("figma-export exits with explicit guidance when FIGMA_TOKEN is missing", () => {
  const result = runPreflight(clis.export, [])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /^error: FIGMA_TOKEN is missing or empty/m)
  assert.match(result.stderr, /file_content:read and library_content:read/)
  assert.doesNotMatch(result.stderr, /^\s+at /m)
})

test("figma-sync --rest exits with explicit guidance when FIGMA_TOKEN is missing", () => {
  const result = runPreflight(clis.sync, ["--rest"])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /^error: FIGMA_TOKEN is missing or empty/m)
})

test("figma-pictograms --export exits with explicit guidance when FIGMA_TOKEN is missing", () => {
  const result = runPreflight(clis.pictograms, ["--input", "unused.json"])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /^error: FIGMA_TOKEN is missing or empty/m)
})

test("an empty FIGMA_TOKEN fails like a missing one", () => {
  const result = runPreflight(clis.export, [], "   ")
  assert.equal(result.status, 1)
  assert.match(result.stderr, /^error: FIGMA_TOKEN is missing or empty/m)
})

test("a token with internal whitespace fails with an explicit message", () => {
  const result = runPreflight(clis.export, [], "figd_abc def")
  assert.equal(result.status, 1)
  assert.match(result.stderr, /^error: FIGMA_TOKEN contains whitespace/m)
})
