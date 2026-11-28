import assert from "node:assert/strict"
import { test } from "node:test"

import { noteLengthWarnings } from "../../src/figma/catalogue/validation.ts"
import { NOTE_LENGTH_LIMIT, RegistrySchema } from "../../src/schemas/catalogue.ts"

// The fixtures hold the notes only: the registry schema owns the shape, so the
// report is tested against a registry a person could commit.
function registry(notes) {
  return RegistrySchema.parse({
    entries: Object.fromEntries(
      notes.map((note, index) => [`1:${index + 1}`, { status: "pending", note }]),
    ),
  })
}

const short = "one residue: the source insets 28px"
const long = "x".repeat(NOTE_LENGTH_LIMIT + 1)

test("a registry within the limit has nothing to report", () => {
  assert.deepEqual(noteLengthWarnings(registry([short])), [])
})

// The limit is a writer guard, not a baseline: `record` refuses a longer note, and the notes already past it are counted on the report so the
// residue stays visible without holding the branch.
test("the notes past the limit are reported once with their count", () => {
  const warnings = noteLengthWarnings(registry([short, long, long]))
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /2 of 3 registry notes exceed 600 characters/)
  assert.match(warnings[0], /pnpm ui-cli record/)
})

test("a note of exactly the limit is not over it", () => {
  assert.deepEqual(noteLengthWarnings(registry(["y".repeat(NOTE_LENGTH_LIMIT)])), [])
})

test("a rule note counts like an entry note", () => {
  const withRule = RegistrySchema.parse({
    entries: { "1:1": { status: "pending", note: short } },
    bulkRules: [{ pageId: "1:0", note: long }],
  })
  const warnings = noteLengthWarnings(withRule)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /1 of 2 registry notes exceed 600 characters/)
})
