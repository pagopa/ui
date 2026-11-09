import assert from "node:assert/strict"
import { test } from "node:test"
import fs from "node:fs"
import path from "node:path"
import { format } from "oxfmt"
import { fixtureTree } from "../helpers/cli.mjs"
import { writeJson } from "../../src/lib/json.ts"

test("writeJson emits the formatter's stable JSON layout", async () => {
  const fixture = fixtureTree({}, "json-writer-")
  try {
    const file = path.join(fixture.root, "data.json")
    writeJson(file, { short: [1, 2, 3], nested: [{ ids: ["1:2", "3:4"] }] })
    const written = fs.readFileSync(file, "utf8")
    const formatted = await format(file, written, { printWidth: 100, tabWidth: 2 })
    assert.deepEqual(formatted.errors, [])
    assert.equal(written, formatted.code)
  } finally {
    fixture.dispose()
  }
})

test("writeJson emits parseable JSON when the formatter is absent", () => {
  const fixture = fixtureTree({}, "json-writer-")
  try {
    const missing = path.join(fixture.root, "no-such-formatter")
    const config = path.join(fixture.root, "oxfmt.config.ts")
    const value = { node: "61:2786", dispositions: ["keep", "depart"], ids: ["1:2"] }

    const withoutBinary = path.join(fixture.root, "without-binary.json")
    writeJson(withoutBinary, value, { binary: missing, config })
    assert.deepEqual(JSON.parse(fs.readFileSync(withoutBinary, "utf8")), value)

    fs.writeFileSync(config, "export default {}\n")
    const withoutConfig = path.join(fixture.root, "without-config.json")
    writeJson(withoutConfig, value, { binary: missing, config })
    assert.deepEqual(JSON.parse(fs.readFileSync(withoutConfig, "utf8")), value)
  } finally {
    fixture.dispose()
  }
})
