import assert from "node:assert/strict"
import { test } from "node:test"

import { stripRedundantArtwork } from "../../src/figma/artwork/svg-strip.ts"

const FRAME = 'viewBox="0 0 24 24"'
const IDENTITY_GROUP = '<g transform="matrix(1 0 0 1 0 0)" opacity="1">'
const BLEED = "M0 0L24 0L24 24L0 24Z"

test("an identity group that only nests paints nothing and is dropped", () => {
  const source = `<svg ${FRAME}>${IDENTITY_GROUP}<path d="M2 2h20v20H2z" /></g></svg>`
  assert.equal(stripRedundantArtwork(source), `<svg ${FRAME}><path d="M2 2h20v20H2z" /></svg>`)
})

test("a mask that covers the whole node is dropped with its reference", () => {
  const source = `<svg ${FRAME}><defs><mask id="mask_0" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><path d="${BLEED}" fill="#ffffff" fill-opacity="1" /></mask></defs><g mask="url(#mask_0)"><path d="M2 2h20v20H2z" /></g></svg>`
  const stripped = stripRedundantArtwork(source)
  assert.doesNotMatch(stripped, /mask/)
  assert.match(stripped, /<path d="M2 2h20v20H2z" \/>/)
})

test("a clip path that covers the whole node is dropped with its reference", () => {
  const source = `<svg ${FRAME}><defs><clipPath id="clip_1"><path d="${BLEED}" /></clipPath></defs><g clip-path="url(#clip_1)"><path d="M2 2h20v20H2z" /></g></svg>`
  const stripped = stripRedundantArtwork(source)
  assert.doesNotMatch(stripped, /clip/)
  assert.match(stripped, /<path d="M2 2h20v20H2z" \/>/)
})

test("a clip path that hides part of the node survives untouched", () => {
  const source = `<svg ${FRAME}><defs><clipPath id="clip_1"><path d="M0 0L9 0L9 9L0 9Z" /></clipPath></defs><g clip-path="url(#clip_1)"><path d="M2 2h20v20H2z" /></g></svg>`
  assert.equal(stripRedundantArtwork(source), source)
})

test("a document the pass cannot prove is returned as it arrived", () => {
  const stray = `<svg ${FRAME}><path d="M2 2h20v20H2z" />trailing</svg>`
  assert.equal(stripRedundantArtwork(stray), stray)
  const unbalanced = `<svg ${FRAME}><g><path d="M2 2h20v20H2z" /></svg>`
  assert.equal(stripRedundantArtwork(unbalanced), unbalanced)
  const noFrame = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M2 2h20v20H2z" /></svg>'
  assert.equal(stripRedundantArtwork(noFrame), noFrame)
})

test("stripping is idempotent", () => {
  const source = `<svg ${FRAME}><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><path d="${BLEED}" fill="#ffffff" /></mask></defs>${IDENTITY_GROUP}<g mask="url(#m)"><path d="M2 2h20v20H2z" /></g></g></svg>`
  const once = stripRedundantArtwork(source)
  assert.equal(stripRedundantArtwork(once), once)
})
