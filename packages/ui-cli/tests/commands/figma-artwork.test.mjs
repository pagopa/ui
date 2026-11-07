import assert from "node:assert/strict"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { test } from "node:test"

import { runCli, fixtureTree } from "../helpers/cli.mjs"
import { toolingPath } from "../../src/lib/paths.ts"

test("Figma artwork commands expose the contracted check and update routes", async (t) => {
  const fixture = fixtureTree({
    "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "fixture"\n',
    "src/catalog/figma/inventory.json": "{}\n",
  })
  t.after(fixture.dispose)

  for (const [command, label] of [
    [["check", "tokens"], "tokens"],
    [["check", "icons"], "icons"],
    [["check", "pictograms"], "pictograms"],
    [["check", "artwork"], "artwork"],
  ]) {
    await t.test(command.join(" "), async () => {
      const result = await runCli(command, { root: fixture.root })
      assert.equal(result.status, 1)
      assert.match(result.stderr, new RegExp(`${label}: [0-9]+ problem`))
    })
  }

  for (const command of [
    ["update", "tokens"],
    ["update", "icons"],
    ["update", "pictograms"],
    ["figma", "pictograms", "export"],
  ]) {
    await t.test(`${command.join(" ")} requires --input`, async () => {
      const result = await runCli(command, { root: fixture.root })
      assert.equal(result.status, 2)
    })
  }

  await t.test(
    "figma export rejects the injected invalid token before network access",
    async () => {
      const result = await runCli(["figma", "export"], {
        root: fixture.root,
        env: { FIGMA_TOKEN: "invalid token" },
      })
      assert.equal(result.status, 1)
      assert.match(result.stderr, /FIGMA_TOKEN contains whitespace/)
    },
  )
})

test("the executable resolves a relative design-system root before legacy imports change cwd", () => {
  const result = spawnSync(process.execPath, [toolingPath("src/cli.ts"), "check", "icons"], {
    cwd: path.resolve(toolingPath("../..")),
    encoding: "utf8",
    env: { ...process.env, PAGOPA_UI_ROOT: "packages/pagopa-ui" },
  })
  assert.equal(result.status, 0, result.stderr)
})
