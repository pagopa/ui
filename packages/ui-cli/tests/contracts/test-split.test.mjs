import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../../", import.meta.url))
const scripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts

function selected(pattern) {
  return new Set(
    fs
      .globSync(pattern, { cwd: root })
      .filter((file) => file.endsWith(".test.mjs"))
      .map((file) => path.normalize(file)),
  )
}

const all = selected("tests/**/*.test.mjs")
const unit = selected("tests/!(contracts)/**/*.test.mjs")
const contracts = selected("tests/contracts/*.test.mjs")

test("test-split: every suite is claimed by exactly one target", () => {
  // A glob that silently matches nothing would leave a suite unrun with the
  // chain still green, so the partition is the assertion, not the commands.
  assert.ok(all.size > 0, "the suite glob matches nothing")
  assert.ok(contracts.size > 0, "the contract glob matches nothing")
  assert.deepEqual(
    [...unit].filter((file) => contracts.has(file)),
    [],
    "a suite is selected by both targets",
  )
  assert.deepEqual(
    [...all].filter((file) => !unit.has(file) && !contracts.has(file)),
    [],
    "a suite is selected by neither target",
  )
  assert.equal(unit.size + contracts.size, all.size)
})

test("test-split: the scripts declare the two globs the partition was proved on", () => {
  assert.match(scripts["test:unit"], /tests\/!\(contracts\)\/\*\*\/\*\.test\.mjs/)
  assert.match(scripts["test:contracts"], /tests\/contracts\/\*\.test\.mjs/)
  const unitGlob = scripts["test:unit"].match(/"([^"]+)"/)[1]
  const contractGlob = scripts["test:contracts"].match(/"([^"]+)"/)[1]
  assert.equal(selected(unitGlob).size, unit.size, "the unit script selects a different set")
  assert.equal(
    selected(contractGlob).size,
    contracts.size,
    "the contract script selects a different set",
  )
  assert.match(scripts.test, /tests\/\*\*\/\*\.test\.mjs/, "the whole suite stays runnable")
})

test("test-split: the live-repo suites are the ones in tests/contracts", () => {
  // What makes a suite a contract is reading this repository instead of a
  // temporary tree: those reads cannot be an input of a cacheable target.
  const expected = [
    "cache-contracts",
    "chromatic",
    "deep-checks-scope",
    "figma-drift",
    "lint-complexity",
    "test-split",
    "verify-chain",
  ].map((name) => path.normalize(`tests/contracts/${name}.test.mjs`))
  assert.deepEqual([...contracts].sort(), expected)
})
