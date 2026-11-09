import assert from "node:assert/strict"
import { test } from "node:test"

import { resolveFigmaToken } from "../../src/adapters/figma-token.ts"

test("the environment token takes precedence over the macOS keychain", () => {
  let calls = 0
  const result = resolveFigmaToken({ FIGMA_TOKEN: "  figd_environment  " }, () => {
    calls += 1
    return "figd_keychain"
  })
  assert.deepEqual(result, { token: "figd_environment", source: "environment" })
  assert.equal(calls, 0)
})

test("the keychain is the fallback when the environment token is absent", () => {
  const calls = []
  const result = resolveFigmaToken({}, (command, args) => {
    calls.push([command, args])
    return " figd_keychain\n"
  })
  assert.deepEqual(result, { token: "figd_keychain", source: "keychain" })
  assert.deepEqual(calls, [["security", ["find-generic-password", "-s", "figma-pat", "-w"]]])
})

test("missing, empty, whitespace-containing and invalid keychain tokens fail without disclosure", () => {
  assert.throws(() => resolveFigmaToken({}, () => ""), /FIGMA_TOKEN is missing or empty/)
  assert.throws(
    () => resolveFigmaToken({ FIGMA_TOKEN: "  " }, () => ""),
    /FIGMA_TOKEN is missing or empty/,
  )
  assert.throws(
    () => resolveFigmaToken({ FIGMA_TOKEN: "figd_a b" }, () => ""),
    /contains whitespace/,
  )
  assert.throws(() => resolveFigmaToken({}, () => "  "), /FIGMA_TOKEN is missing or empty/)
  assert.throws(() => resolveFigmaToken({}, () => "figd_a b"), /contains whitespace/)
})
