import assert from "node:assert/strict"
import { test } from "node:test"

import { svgToJsx } from "../../src/figma/artwork/svg-jsx.ts"

const options = { monochrome: true, namespace: "uid" }

test("the mask definitions keep their source paint", () => {
  const source =
    '<svg viewBox="0 0 24 24"><defs><mask id="m"><path d="M0 0h24v24H0z" fill="#ffffff" /></mask></defs><path d="M2 2h20v20H2z" fill="#0b3ee3" /></svg>'
  const { markup } = svgToJsx(source, options)
  assert.match(markup, /<mask id=\{uid \+ "m"\}>/)
  assert.match(markup, /fill="#ffffff"/)
  assert.doesNotMatch(markup, /fill="#0b3ee3"/)
  assert.match(markup, /fill="currentColor"/)
})

test("a body without defs paints with the inherited colour from its first byte", () => {
  // `<g ` is shorter than the `</defs>` terminator, so a boundary computed from
  // `lastIndexOf` must not fall inside the body and skip the leading paint.
  const source = '<svg viewBox="0 0 24 24"><g fill="#0b3ee3"><path d="M2 2h20v20H2z" /></g></svg>'
  const { markup } = svgToJsx(source, options)
  assert.doesNotMatch(markup, /#0b3ee3/)
  assert.match(markup, /<g fill="currentColor">/)
  assert.match(markup, /<path d="M2 2h20v20H2z"/)
})

test("a coloured body keeps its source paint", () => {
  const source = '<svg viewBox="0 0 24 24"><path d="M2 2h20v20H2z" fill="#0b3ee3" /></svg>'
  const { markup } = svgToJsx(source, { monochrome: false })
  assert.match(markup, /fill="#0b3ee3"/)
})

test("an id and its reference compile against the caller's namespace", () => {
  const source =
    '<svg viewBox="0 0 24 24"><defs><clipPath id="c"><path d="M0 0h24v6H0z" /></clipPath></defs><g clip-path="url(#c)"><path d="M2 2h4v4H2z" /></g></svg>'
  const { markup, declaresIds } = svgToJsx(source, options)
  assert.equal(declaresIds, true)
  assert.match(markup, /<clipPath id=\{uid \+ "c"\}>/)
  assert.match(markup, /clipPath=\{"url\(#" \+ uid \+ "c\)"\}/)
})

test("artwork that keeps an id without a namespace is rejected", () => {
  const source =
    '<svg viewBox="0 0 24 24"><defs><clipPath id="c"><path d="M0 0h24v6H0z" /></clipPath></defs><g clip-path="url(#c)"><path d="M2 2h4v4H2z" /></g></svg>'
  assert.throws(
    () => svgToJsx(source, { monochrome: true }),
    /Artwork keeps an id: pass the identifier of its namespace/,
  )
})

test("redundant artwork needs no namespace at all", () => {
  const source =
    '<svg viewBox="0 0 24 24"><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><path d="M0 0h24v24H0z" fill="#ffffff" /></mask></defs><g mask="url(#m)"><path d="M2 2h20v20H2z" fill="#0b3ee3" /></g></svg>'
  const { markup, declaresIds } = svgToJsx(source, { monochrome: true })
  assert.equal(declaresIds, false)
  assert.doesNotMatch(markup, /mask/)
  assert.match(markup, /fill="currentColor"/)
})
