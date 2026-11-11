import assert from "node:assert/strict"
import { test } from "node:test"

import { chromium } from "playwright"
import { capture } from "../../src/adapters/storybook.ts"

test("a hover evidence selector keeps the pointer over its target", async (t) => {
  const pointerEvents = []
  const reachedHover = new Error("Reached hover setup")
  const page = {
    emulateMedia: async () => {},
    goto: async () => {},
    waitForSelector: async () => {},
    addScriptTag: async () => {},
    addStyleTag: async () => {},
    evaluate: async () => {},
    hover: async (selector) => {
      pointerEvents.push(["hover", selector])
      throw reachedHover
    },
    mouse: {
      move: async (x, y) => pointerEvents.push(["move", x, y]),
    },
  }
  const browser = {
    newPage: async () => page,
    close: async () => {},
  }
  t.mock.method(chromium, "launch", async () => browser)

  await assert.rejects(
    capture({
      storyId: "switch--hover",
      rootWidth: 150,
      rootSelector: "#storybook-root",
      expectState: "hover",
      stateEvidence: "#hover-target:hover",
    }),
    (error) => error === reachedHover,
  )
  assert.deepEqual(pointerEvents, [["hover", "#hover-target"]])
})
