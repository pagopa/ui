import fc from "fast-check"
import { expect, test } from "vitest"

import { formatFileSize } from "./format"

// A size a browser reports: whole bytes, never negative.
const SIZE = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER })

const PRINTED = /^\d+(\.\d)? (B|KB|MB|GB|TB|PB)$/

function magnitude(text: string): number {
  return Number(text.split(" ")[0])
}

test("never names a unit the printed magnitude has already outgrown", () => {
  fc.assert(
    fc.property(SIZE, (bytes) => {
      const text = formatFileSize(bytes)
      // "1024 KB" and "1024.0 MB" were both reachable: the rounding of one
      // unit produced a magnitude the next unit owns.
      expect(magnitude(text)).toBeLessThan(1024)
    }),
  )
})

test("prints a number and a unit, whatever the size", () => {
  fc.assert(
    fc.property(SIZE, (bytes) => {
      const text = formatFileSize(bytes)
      expect(text).toMatch(PRINTED)
      expect(text).not.toMatch(/NaN|Infinity|e\+/)
    }),
  )
})

test("keeps the unit it names, and never goes back to a smaller one", () => {
  fc.assert(
    fc.property(SIZE, SIZE, (left, right) => {
      const [small, large] = left <= right ? [left, right] : [right, left]
      const unitOf = (bytes: number) => formatFileSize(bytes).split(" ")[1]
      const units = ["B", "KB", "MB", "GB", "TB", "PB"]
      expect(units.indexOf(unitOf(large))).toBeGreaterThanOrEqual(units.indexOf(unitOf(small)))
    }),
  )
})

test("reports an unknown or impossible size as zero bytes", () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.integer({ min: -Number.MAX_SAFE_INTEGER, max: -1 }),
        fc.constant(Number.NaN),
        fc.constant(Number.POSITIVE_INFINITY),
        fc.constant(Number.NEGATIVE_INFINITY),
      ),
      (bytes) => {
        expect(formatFileSize(bytes)).toBe("0 B")
      },
    ),
  )
})

// The unit boundaries are where the old formatter broke, so they are worth
// naming one by one rather than leaving to a generated value.
test("crosses each unit at its own boundary", () => {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"]
  for (let unit = 1; unit < units.length; unit += 1) {
    const text = formatFileSize(1024 ** unit)
    expect(magnitude(text)).toBe(1)
    expect(text.split(" ")[1]).toBe(units[unit])
    // One byte under the boundary rounds up, so it must not stay behind
    // printing a full 1024 of the smaller unit.
    const below = formatFileSize(1024 ** unit - 1)
    expect(magnitude(below)).toBeLessThan(1024)
  }
})
