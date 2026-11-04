import fc from "fast-check"
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

const TOTAL = fc.integer({ min: 1, max: 60 })
const CURRENT = fc.integer({ min: 1, max: 60 })

test("lists each page once, in ascending order", () => {
  fc.assert(
    fc.property(CURRENT, TOTAL, (current, total) => {
      const pages = pageRange(current, total).filter((page) => page !== "ellipsis")
      expect(pages).toEqual([...pages].sort((left, right) => left - right))
      expect(new Set(pages).size).toBe(pages.length)
      for (const page of pages) {
        expect(page).toBeGreaterThanOrEqual(1)
        expect(page).toBeLessThanOrEqual(total)
      }
    }),
  )
})

test("an empty collection shows no page", () => {
  fc.assert(
    fc.property(CURRENT, (current) => {
      expect(pageRange(current, 0)).toEqual([])
    }),
  )
})

test("always shows the first and the last page", () => {
  fc.assert(
    fc.property(CURRENT, TOTAL, (current, total) => {
      const pages = pageRange(current, total)
      expect(pages[0]).toBe(1)
      expect(pages[pages.length - 1]).toBe(total)
    }),
  )
})

// Only a page the collection owns counts: an out-of-range current page is
// clamped by the component, not by the helper.
const OWNED = fc
  .integer({ min: 1, max: 60 })
  .chain((total) =>
    fc.record({ total: fc.constant(total), current: fc.integer({ min: 1, max: total }) }),
  )

test("shows the current page when the collection owns it", () => {
  fc.assert(
    fc.property(OWNED, ({ current, total }) => {
      expect(pageRange(current, total)).toContain(current)
    }),
  )
})

test("never hides a page behind an ellipsis it does not need", () => {
  fc.assert(
    fc.property(CURRENT, TOTAL, (current, total) => {
      const pages = pageRange(current, total)
      for (let index = 0; index < pages.length; index += 1) {
        if (pages[index] !== "ellipsis") continue
        const previous = pages[index - 1]
        const next = pages[index + 1]
        expect(typeof previous).toBe("number")
        expect(typeof next).toBe("number")
        // An ellipsis stands for pages that are hidden, so it never sits
        // between two neighbours.
        expect(Number(next) - Number(previous)).toBeGreaterThanOrEqual(2)
      }
    }),
  )
})

test("never shows more than two ellipses", () => {
  fc.assert(
    fc.property(CURRENT, TOTAL, (current, total) => {
      const ellipses = pageRange(current, total).filter((page) => page === "ellipsis")
      expect(ellipses.length).toBeLessThanOrEqual(2)
    }),
  )
})
