import fc from "fast-check"
import { expect, test } from "vitest"

import { progressPercentage } from "./progress-kpi-utils"

const COUNT = fc.integer({ min: 0, max: 1_000_000 })
const TOTAL = fc.integer({ min: 1, max: 1_000_000 })

test("paints a whole percentage inside the range the bar declares", () => {
  fc.assert(
    fc.property(COUNT, COUNT, (value, total) => {
      const percentage = progressPercentage(value, total)
      expect(Number.isInteger(percentage)).toBe(true)
      expect(percentage).toBeGreaterThanOrEqual(0)
      expect(percentage).toBeLessThanOrEqual(100)
    }),
  )
})

test("a bar with nothing to count stays empty, and a reached total stays full", () => {
  fc.assert(
    fc.property(TOTAL, COUNT, (total, value) => {
      expect(progressPercentage(0, total)).toBe(0)
      expect(progressPercentage(total + value, total)).toBe(100)
    }),
  )
})

test("grows with the value and never shrinks", () => {
  fc.assert(
    fc.property(COUNT, COUNT, TOTAL, (left, right, total) => {
      const [small, large] = left <= right ? [left, right] : [right, left]
      expect(progressPercentage(large, total)).toBeGreaterThanOrEqual(
        progressPercentage(small, total),
      )
    }),
  )
})

test("an absent, negative or fractional total has no percentage to paint", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: -1000, max: 1000 }),
      fc.oneof(
        fc.constant(0),
        fc.integer({ min: -1000, max: -1 }),
        fc.double({ min: -1000, max: 0, noNaN: true }),
      ),
      (value, total) => {
        if (total > 0) return
        expect(progressPercentage(value, total)).toBe(0)
      },
    ),
  )
})

test("a value that is not a number does not paint NaN", () => {
  fc.assert(
    fc.property(
      fc.oneof(fc.constant(Number.NaN), fc.constant(Number.POSITIVE_INFINITY)),
      (notANumber) => {
        expect(progressPercentage(notANumber, 10)).toBe(0)
        expect(progressPercentage(10, notANumber)).toBe(0)
      },
    ),
  )
})
