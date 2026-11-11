// The committed records: the four documents the repository reviews in git. The
// seams are the reader's own — where a record is read from by default, the
// override that wins over it, the memory that makes a second read identical,
// the one record that may be absent, and the one error a corrupt one raises.
// Nothing here asserts how the reader parses: a refactor that keeps these
// behaviours must keep these tests green.
import assert from "node:assert/strict"
import { test } from "node:test"

import {
  CommittedRecordError,
  committedFile,
  readCases,
  readDevicePolicy,
  readInventory,
  readRegistry,
} from "../../src/records/committed.ts"
import { fixtureTree } from "../helpers/cli.mjs"

const INVENTORY = "src/catalog/figma/inventory.json"
const REGISTRY = "src/catalog/figma/registry.json"
const POLICY = "src/catalog/figma/device-policy.json"
const CASES = "src/catalog/figma/parity-cases.json"

const inventory = {
  fileKey: "file",
  syncedAt: "2026-01-02T00:00:00Z",
  components: [],
}

const registry = { bulkRules: [], entries: { "4:4": { status: "excluded" } } }

const policy = {
  axes: ["Device"],
  any: ["Any"],
  devices: {
    mobile: { canonicalWidth: 320, defaultLayoutScope: "viewport", aliases: ["Mobile"] },
  },
}

test("a committed record is read from its default path", () => {
  const fixture = fixtureTree({ [INVENTORY]: inventory, [REGISTRY]: registry }, "records-default-")
  try {
    assert.equal(readInventory(fixture.root).fileKey, "file")
    assert.equal(readRegistry(fixture.root).entries["4:4"].status, "excluded")
  } finally {
    fixture.dispose()
  }
})

test("a per-record override path wins over the default", () => {
  const fixture = fixtureTree(
    { [INVENTORY]: inventory, "elsewhere/inventory.json": { ...inventory, fileKey: "override" } },
    "records-override-",
  )
  try {
    assert.equal(readInventory(fixture.root).fileKey, "file")
    assert.equal(readInventory(fixture.root, "elsewhere/inventory.json").fileKey, "override")
  } finally {
    fixture.dispose()
  }
})

test("the same record read twice in one process is the identical value", () => {
  const fixture = fixtureTree({ [POLICY]: policy }, "records-memory-")
  try {
    const first = readDevicePolicy(fixture.root)
    // A second spelling of the same file: the memory is keyed by the resolved path.
    const second = readDevicePolicy(fixture.root, "src/catalog/figma/./device-policy.json")
    assert.equal(second, first)
  } finally {
    fixture.dispose()
  }
})

test("the same record under two roots is two reads, not one", () => {
  const one = fixtureTree({ [INVENTORY]: inventory }, "records-roots-one-")
  const other = fixtureTree(
    { [INVENTORY]: { ...inventory, fileKey: "other" } },
    "records-roots-other-",
  )
  try {
    assert.equal(readInventory(one.root).fileKey, "file")
    assert.equal(readInventory(other.root).fileKey, "other")
    // Reading the second root must not have answered for the first.
    assert.equal(readInventory(one.root).fileKey, "file")
  } finally {
    one.dispose()
    other.dispose()
  }
})

test("an optional record is null when its file is absent and its value when present", () => {
  const fixture = fixtureTree({}, "records-optional-")
  try {
    assert.equal(readCases(fixture.root), null)
    fixture.write({ [CASES]: [] })
    assert.deepEqual(readCases(fixture.root), [])
  } finally {
    fixture.dispose()
  }
})

test("a required record that is absent raises the one error", () => {
  const fixture = fixtureTree({}, "records-absent-")
  try {
    const file = committedFile("registry", fixture.root)
    assert.throws(
      () => readRegistry(fixture.root),
      (error) => {
        assert.ok(error instanceof CommittedRecordError)
        assert.equal(error.record, "registry")
        assert.equal(error.file, file)
        assert.match(error.reason, /not found/)
        return true
      },
    )
  } finally {
    fixture.dispose()
  }
})

test("a corrupt record raises the one error carrying the record, the file and the reason", () => {
  const fixture = fixtureTree({ [REGISTRY]: { entries: { "not-a-node": {} } } }, "records-corrupt-")
  try {
    const file = committedFile("registry", fixture.root)
    assert.throws(
      () => readRegistry(fixture.root),
      (error) => {
        assert.ok(error instanceof CommittedRecordError)
        assert.equal(error.record, "registry")
        assert.equal(error.file, file)
        assert.ok(error.reason.length > 0)
        assert.match(error.message, /registry\.json: /)
        return true
      },
    )
  } finally {
    fixture.dispose()
  }
})
