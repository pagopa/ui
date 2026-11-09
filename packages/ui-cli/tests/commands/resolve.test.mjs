import assert from "node:assert/strict"
import { test } from "node:test"

import { createContext } from "../../src/commands/context.ts"
import { createCli } from "../../src/commands/index.ts"
import { unresolvedCliTokens } from "../../src/commands/resolve.ts"

const root = createCli(createContext({ env: {}, cwd: process.cwd(), io: { out() {}, err() {} } }))

test("rejects an unknown command", () => {
  assert.match(unresolvedCliTokens(root, ["check", "not-real"]), /unknown ui-cli command/)
})

test("rejects an unknown flag", () => {
  assert.match(
    unresolvedCliTokens(root, ["check", "text-defaults", "--not-a-flag"]),
    /unknown ui-cli flag/,
  )
})

test("a string flag consumes its value", () => {
  assert.equal(unresolvedCliTokens(root, ["check", "text-defaults", "--max", "3"]), null)
})

test("boolean negation resolves to its declared flag", () => {
  assert.equal(unresolvedCliTokens(root, ["check", "client-directives", "--no-report"]), null)
  assert.match(
    unresolvedCliTokens(root, ["check", "text-defaults", "--no-max"]) ?? "",
    /unknown ui-cli flag --no-max/,
  )
})

test("help is accepted at any command depth", () => {
  assert.equal(unresolvedCliTokens(root, ["check", "text-defaults", "--help"]), null)
})

test("rejects positional input on a leaf without positional arguments", () => {
  assert.match(unresolvedCliTokens(root, ["check", "layers", "extra"]), /unexpected argument extra/)
})
