import assert from "node:assert/strict"
import { test } from "node:test"

import { svgToJsx } from "../../src/figma/artwork/svg-jsx.ts"

const options = { monochrome: true, idPrefix: "probe-" }

test("the mask definitions keep their source paint", () => {
  const source =
    '<svg viewBox="0 0 24 24"><defs><mask id="m"><path d="M0 0h24v24H0z" fill="#ffffff" /></mask></defs><path d="M2 2h20v20H2z" fill="#0b3ee3" /></svg>'
  const jsx = svgToJsx(source, options)
  assert.match(jsx, /<mask id="probe-m">/)
  assert.match(jsx, /fill="#ffffff"/)
  assert.doesNotMatch(jsx, /fill="#0b3ee3"/)
  assert.match(jsx, /fill="currentColor"/)
})

test("a body without defs paints with the inherited colour from its first byte", () => {
  // `<g ` is shorter than the `</defs>` terminator, so a boundary computed from
  // `lastIndexOf` must not fall inside the body and skip the leading paint.
  const source = '<svg viewBox="0 0 24 24"><g fill="#0b3ee3"><path d="M2 2h20v20H2z" /></g></svg>'
  const jsx = svgToJsx(source, options)
  assert.doesNotMatch(jsx, /#0b3ee3/)
  assert.match(jsx, /<g fill="currentColor">/)
  assert.match(jsx, /<path d="M2 2h20v20H2z"/)
})

test("a coloured body keeps its source paint", () => {
  const source = '<svg viewBox="0 0 24 24"><path d="M2 2h20v20H2z" fill="#0b3ee3" /></svg>'
  const jsx = svgToJsx(source, { monochrome: false, idPrefix: "probe-" })
  assert.match(jsx, /fill="#0b3ee3"/)
})
