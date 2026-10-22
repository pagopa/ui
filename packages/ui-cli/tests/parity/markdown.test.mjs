import assert from "node:assert/strict"
import { test } from "node:test"

import { markdownTable } from "../../src/lib/markdown.ts"

test("a generated table is padded the way the formatter prints it", () => {
  assert.deepEqual(
    markdownTable(
      ["node", "verdict"],
      [
        ["`127:1510`", "review-required"],
        ["a", "ok"],
      ],
    ),
    [
      "| node       | verdict         |",
      "| ---------- | --------------- |",
      "| `127:1510` | review-required |",
      "| a          | ok              |",
    ],
  )
})

test("a narrow column keeps three dashes and an empty cell is padded", () => {
  assert.deepEqual(markdownTable(["n", "x"], [["1", ""]]), [
    "| n   | x   |",
    "| --- | --- |",
    "| 1   |     |",
  ])
})
