import assert from "node:assert/strict"
import { test } from "node:test"

import { pictogramModules } from "../../src/figma/pictograms.ts"

function entry(name) {
  return {
    name,
    designFingerprint: "fingerprint",
    light: { nodeId: "1:2", file: "1-2.svg", sha256: "a".repeat(64) },
    dark: { nodeId: "1:3", file: "1-3.svg", sha256: "b".repeat(64) },
  }
}

test("each pictogram publishes its own module and the registry indexes them by name", () => {
  const modules = pictogramModules({ "1:1": entry("Data Security"), "2:1": entry("In progress") })
  assert.deepEqual(
    modules.pictograms.map((module) => module.file),
    ["pictograms/data-security.ts", "pictograms/in-progress.ts"],
  )
  assert.match(modules.pictograms[0].source, /export const dataSecurity: PictogramAsset/)
  assert.match(modules.pictograms[1].source, /export const inProgress: PictogramAsset/)
  assert.match(
    modules.registry.source,
    /import \{ dataSecurity \} from "\.\/pictograms\/data-security"/,
  )
  assert.match(modules.registry.source, /"Data Security": dataSecurity/)
  assert.match(modules.registry.source, /"2:1": inProgress/)
})

test("two pictograms that would share a module are rejected", () => {
  assert.throws(
    () => pictogramModules({ "1:1": entry("Alarm Clock"), "2:1": entry("AlarmClock") }),
    /share the module alarm-clock/,
  )
})
