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

test("writeJson reports a formatter that is present and fails", () => {
  const fixture = fixtureTree({}, "json-writer-")
  try {
    const config = path.join(fixture.root, "oxfmt.config.ts")
    fs.writeFileSync(config, "export default {}\n")
    const failing = path.join(fixture.root, "failing-formatter")
    // It drains stdin before failing: a fixture that exits first would race the
    // write of the JSON document and sometimes fail with EPIPE instead of the
    // formatter's own exit status.
    fs.writeFileSync(failing, "#!/bin/sh\ncat >/dev/null\nexit 1\n", { mode: 0o755 })

    // An absent formatter is an absence and degrades; one that runs and fails is
    // a defect, and the write must not hide it behind unformatted output.
    assert.throws(
      () =>
        writeJson(path.join(fixture.root, "failing.json"), { a: 1 }, { binary: failing, config }),
      /Command failed/,
    )
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
