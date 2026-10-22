import assert from "node:assert/strict"
import { test } from "node:test"

import {
  captureChecks,
  DISABLE_MOTION_CSS,
  formatProbeTree,
  SCHEMA_VERSION,
} from "../../src/parity/render.ts"

// The preflight is the A1 contract: a capture that is scaled, does not carry the
// forced width or is not in the declared state is missing evidence (exit 2), not
// a delta list. The checks are pure, so they run without a browser.
const passing = { dpr: 1, rulerWidth: 100, rootWidth: 274, state: { state: "filled", ok: true } }

test("a clean capture passes the preflight", () => {
  assert.deepEqual(captureChecks({ probe: passing, expectedWidth: 274 }), [])
})

test("a device scale factor other than 1 is a capture mismatch", () => {
  const failures = captureChecks({ probe: { ...passing, dpr: 2 }, expectedWidth: 274 })
  assert.equal(failures.length, 1)
  assert.equal(failures[0].code, "capture-mismatch")
  assert.match(failures[0].message, /devicePixelRatio is 2/)
})

test("a scaled preview canvas is caught by the ruler, not by the requested width", () => {
  const failures = captureChecks({
    probe: { ...passing, rulerWidth: 84.5, rootWidth: 232 },
    expectedWidth: 274,
  })
  assert.equal(failures.length, 2)
  assert.deepEqual(
    failures.map((failure) => failure.code),
    ["capture-mismatch", "capture-mismatch"],
  )
  assert.match(failures[0].message, /ruler measures 84.5px/)
})

test("a forced width that did not land is a capture mismatch within two pixels", () => {
  assert.deepEqual(captureChecks({ probe: { ...passing, rootWidth: 276 }, expectedWidth: 274 }), [])
  const failures = captureChecks({ probe: { ...passing, rootWidth: 320 }, expectedWidth: 274 })
  assert.equal(failures.length, 1)
  assert.match(failures[0].message, /forced root measures 320px against the requested 274px/)
})

test("a state the story does not show is missing evidence", () => {
  const failures = captureChecks({
    probe: {
      ...passing,
      state: { state: "filled", ok: false, detail: "no value or selection inside the story root" },
    },
    expectedWidth: 274,
  })
  assert.equal(failures.length, 1)
  assert.equal(failures[0].code, "state-mismatch")
  assert.match(failures[0].message, /no value or selection/)
})

test("a capture that forces the mapped root skips the story-root width check", () => {
  // The scope probe (RA5) forces the element the case maps as its root while the
  // story root keeps its own width: the ruler and the device scale still gate,
  // the width comparison does not.
  assert.deepEqual(
    captureChecks({ probe: { ...passing, rootWidth: 900 }, expectedWidth: 274, checkWidth: false }),
    [],
  )
  const failures = captureChecks({
    probe: { ...passing, rootWidth: 900 },
    expectedWidth: 274,
  })
  assert.equal(failures.length, 1)
  assert.match(failures[0].message, /forced root measures 900px/)
})

test("the module keeps a single probe schema version and the motion guard", () => {
  assert.equal(SCHEMA_VERSION, 1)
  // The guard is the article's: an animation or a transition still running moves
  // pixels between two runs of the same case.
  assert.match(DISABLE_MOTION_CSS, /animation: none !important/)
  assert.match(DISABLE_MOTION_CSS, /transition: none !important/)
  assert.match(DISABLE_MOTION_CSS, /caret-color: transparent !important/)
})

test("the tree formatter prints one readable line per element", () => {
  const lines = formatProbeTree([
    {
      depth: 0,
      tag: "fieldset",
      className: "flex gap-2",
      box: { width: 310, height: 448 },
      at: { x: 0, y: 0 },
      padding: [0, 0, 0, 0],
      gap: 8,
    },
    {
      depth: 1,
      tag: "div",
      className: "",
      box: { width: 310, height: 43 },
      at: { x: 0, y: 44 },
      padding: [8, 88, 8, 16],
      gap: 0,
    },
  ])
  assert.equal(
    lines,
    [
      "fieldset.flex.gap-2 310x448 @0,0 pad=0/0/0/0 gap=8",
      "  div 310x43 @0,44 pad=8/88/8/16 gap=0",
    ].join("\n"),
  )
})
