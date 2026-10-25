import assert from "node:assert/strict"
import { test } from "node:test"

import { longNoteErrors, NOTE_LENGTH_LIMIT, RegistrySchema } from "../../src/schemas/catalogue.ts"

// The fixtures hold the notes only: the registry schema owns the shape, so the
// ratchet is tested against a registry a person could commit.
function registry(notes) {
  return RegistrySchema.parse({
    entries: Object.fromEntries(
      notes.map((note, index) => [`1:${index + 1}`, { status: "pending", note }]),
    ),
  })
}

function baseline(overLimit, maxLength = NOTE_LENGTH_LIMIT) {
  return { maxLength, overLimit, note: "fixture" }
}

const short = "one residue: the source insets 28px"
const long = "x".repeat(NOTE_LENGTH_LIMIT + 1)

test("a note past the limit above the baseline fails", () => {
  const errors = longNoteErrors(registry([short, long]), baseline(0), "registry.json")
  assert.equal(errors.length, 1)
  assert.match(errors[0], /1 registry notes exceed 600 characters, the baseline allows 0/)
})

test("a count below the baseline asks to lower it", () => {
  const errors = longNoteErrors(registry([short]), baseline(90), "registry.json")
  assert.equal(errors.length, 1)
  assert.match(errors[0], /lower overLimit to 0/)
})

test("a count equal to the baseline passes", () => {
  assert.deepEqual(longNoteErrors(registry([short, long]), baseline(1), "registry.json"), [])
})

test("a note of exactly the limit is not over it", () => {
  const errors = longNoteErrors(registry(["y".repeat(NOTE_LENGTH_LIMIT)]), baseline(0), "x.json")
  assert.deepEqual(errors, [])
})

test("the baseline cannot loosen the limit", () => {
  const errors = longNoteErrors(registry([short]), baseline(0, 1_200), "x.json")
  assert.equal(errors.length, 1)
  assert.match(errors[0], /maxLength is 1200, the limit is 600/)
})
