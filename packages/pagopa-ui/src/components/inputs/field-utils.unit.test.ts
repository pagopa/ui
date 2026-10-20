import { expect, test } from "vitest"

import { describedBy } from "./field-utils"

const ids = {
  controlId: "field",
  descriptionId: "field-description",
  errorId: "field-error",
  successId: "field-success",
}

test("lists the associated messages in a stable order", () => {
  expect(describedBy(ids, { description: "d", error: "e", success: "s" })).toBe(
    "field-description field-error",
  )
})

test("keeps an external describedby first and the success message last", () => {
  expect(describedBy(ids, { success: "s" }, "external")).toBe("external field-success")
})

test("omits absent messages and returns undefined when nothing is associated", () => {
  expect(describedBy(ids, { error: "e" })).toBe("field-error")
  expect(describedBy(ids, {})).toBeUndefined()
  expect(describedBy(ids, {}, "")).toBeUndefined()
})
