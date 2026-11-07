import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const cli = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))
const clis = {
  export: ["figma", "export"],
  sync: ["figma", "plan"],
  pictograms: ["figma", "pictograms", "export"],
}

function runPreflight(command, args, token) {
  const env = { ...process.env }
  delete env.FIGMA_TOKEN
  if (token !== undefined) env.FIGMA_TOKEN = token
  return spawnSync(process.execPath, [cli, ...command, ...args], { encoding: "utf8", env })
}

test("live Figma commands reject an invalid token before making a request", () => {
  const inputs = {
    export: [],
    sync: ["--rest"],
    pictograms: ["--input", "../pagopa-ui/src/catalog/figma/inventory.json"],
  }
  for (const [name, command] of Object.entries(clis)) {
    const result = runPreflight(command, inputs[name], "figd_abc def")
    assert.equal(result.status, 1)
    assert.match(result.stderr, /^error: FIGMA_TOKEN contains whitespace/m)
    assert.doesNotMatch(result.stderr, /^\s+at /m)
  }
})
