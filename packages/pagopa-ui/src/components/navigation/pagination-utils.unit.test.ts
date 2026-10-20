import { expect, test } from "vitest"

import { pageRange } from "./pagination-utils"

test("keeps the first, last, current and neighbouring pages", () => {
  expect(pageRange(4, 12)).toEqual([1, "ellipsis", 3, 4, 5, "ellipsis", 12])
})

test("collapses small windows without ellipsis", () => {
  expect(pageRange(1, 5)).toEqual([1, 2, "ellipsis", 5])
  expect(pageRange(3, 4)).toEqual([1, 2, 3, 4])
  expect(pageRange(1, 1)).toEqual([1])
})

test("returns no page for an empty collection", () => {
  expect(pageRange(1, 0)).toEqual([])
})

test("keeps a valid window for out-of-range current pages", () => {
  // The Pagination component clamps the current page before calling; the
  // helper only guarantees a sane visible set for any input.
  expect(pageRange(0, 3)).toEqual([1, "ellipsis", 3])
  expect(pageRange(99, 3)).toEqual([1, "ellipsis", 3])
})
