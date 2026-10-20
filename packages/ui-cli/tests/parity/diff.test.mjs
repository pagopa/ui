import assert from "node:assert/strict"
import fs from "node:fs"
import { test } from "node:test"

import {
  bandDeltas,
  classify,
  compare,
  compareSubject,
  compositionSignature,
  responsiveDeltas,
  scopeDeltas,
  tokenIndex,
} from "../../src/parity/diff.ts"
import { loadExport, namedLeaves, nodeSpec, sourceNode } from "../../src/parity/source.ts"
import { toolingPath } from "../../src/lib/paths.ts"

const SLICE = toolingPath("tests/fixtures/figma-parity/snapshot-slice.json")
const RECORDED_PROBE = toolingPath("tests/fixtures/figma-parity/render-probe.json")

function readProbe() {
  return JSON.parse(fs.readFileSync(RECORDED_PROBE, "utf8"))
}

// The two subjects the wave-2 TextField review compared: the source `Input`
// frame against the rendered input, and the source `Label text` layer against
// the rendered label.
function textFieldSources() {
  const project = loadExport(SLICE)
  const spec = nodeSpec(sourceNode(project, "529:6123"), { depth: 3 })
  return {
    field: namedLeaves(spec, "Input")[0],
    "Label text": namedLeaves(spec, "Label text")[0],
  }
}

test("the recorded TextField render verifies against the pinned slice", () => {
  const result = compare({ sources: textFieldSources(), probe: readProbe() })
  assert.deepEqual(result.deltas, [])
  assert.deepEqual(result.residues, [])
  assert.equal(result.verdict, "verified")
  const width = result.notes.find((note) => note.path === "field.box.width")
  assert.equal(width.note, "272px")
  const gap = result.notes.find((note) => note.path === "field.gap")
  assert.match(gap.note, /leaf element/)
})

test("a face on the wrong weight is a structural delta", () => {
  const probe = readProbe()
  probe.subjects["Label text"].font.weight = 400
  const result = compare({ sources: textFieldSources(), probe })
  const delta = result.deltas.find((item) => item.path === "Label text.font.weight")
  assert.ok(delta, "expected a weight delta")
  assert.equal(delta.source, 600)
  assert.equal(delta.render, 400)
  assert.equal(result.verdict, "review-required")
})

test("an off-tolerance box is a delta and a near-token value is classified", () => {
  const probe = readProbe()
  probe.subjects.field.box.width = 268
  const result = compare({ sources: textFieldSources(), probe })
  const delta = result.deltas.find((item) => item.path === "field.box.width")
  assert.ok(delta)
  assert.equal(delta.source, 274)
  assert.equal(delta.render, 268)
  // 268 is not a scale value: the classification must say so.
  assert.equal(delta.token.kind, "inline")
})

test("a declared residue stays visible without blocking the verdict", () => {
  const probe = readProbe()
  probe.subjects.field.box.width = 250
  const result = compare({
    sources: textFieldSources(),
    probe,
    residues: [{ path: "field.box.width", reason: "fixture residue with its reason" }],
  })
  assert.deepEqual(result.deltas, [])
  assert.equal(result.residues.length, 1)
  assert.equal(result.residues[0].reason, "fixture residue with its reason")
  assert.equal(result.verdict, "verified-with-residues")
})

test("the target rule accepts an expanded 22px action and rejects a bare one", () => {
  const source = {
    box: { width: 154, height: 22 },
    layout: { mode: "HORIZONTAL", gap: 0, padding: [0, 0, 0, 0] },
  }
  const base = { box: { width: 154, height: 22 }, padding: [0, 0, 0, 0], gap: 0, childCount: 1 }
  const expanded = compareSubject({
    key: "link",
    source,
    render: { ...base, expansion: { top: -11, bottom: -11 } },
    subject: { interactive: true },
  })
  assert.deepEqual(
    expanded.filter((delta) => delta.severity !== "ok").map((delta) => delta.path),
    [],
  )
  const bare = compareSubject({
    key: "link",
    source,
    render: { ...base },
    subject: { interactive: true },
  })
  assert.deepEqual(
    bare.filter((delta) => delta.severity !== "ok").map((delta) => delta.path),
    ["link.target"],
  )
})

test("the token classification reads the generated scale", () => {
  const index = tokenIndex()
  assert.equal(classify(index, "type", 18, 2, { lineHeight: 28 }).name, "text-title-xs-mobile")
  assert.equal(classify(index, "type", 18, 2, { lineHeight: 26 }).name, "text-body-big-sb")
  assert.equal(classify(index, "type", 24, 2, { lineHeight: 32 }).name, "text-title-xs")
  assert.equal(classify(index, "type", 24, 2, { lineHeight: 36 }).name, "text-title-md-mobile")
  assert.equal(classify(index, "type", 20).kind, "token")
  assert.equal(classify(index, "type", 19).kind, "near-token")
  assert.equal(classify(index, "type", 63).kind, "inline")
  assert.equal(classify(index, "radius", 8).name, "radius-8")
  assert.equal(classify(index, "radius", 10).kind, "near-token")
  assert.equal(classify(index, "radius", 13).kind, "inline")
  // An offset is spacing: it is classified against the spacing scale, so a value
  // on the 4px grid is a token and a value between two steps is visible as a
  // near-token (with a ±2px tolerance a 4px grid has no unreachable midpoint).
  assert.equal(classify(index, "space", 24).name, "space-6")
  assert.equal(classify(index, "space", 42).kind, "near-token")
  assert.equal(classify(index, "space", 41).name, "space-10")
})

// A TEXT layer measures the glyph box: its box is out of scope unless the case
// asks for the height (the label-float class of drift), and the width the
// bundled font cannot match stays out even then.
test("a TEXT subject compares its height only when the case asks for it", () => {
  const probe = readProbe()
  const sources = textFieldSources()
  const height = sources["Label text"].box.height + 12
  probe.subjects["Label text"].box.height = height
  probe.subjects["Label text"].box.width = 999

  const off = compare({ sources, probe })
  assert.equal(
    off.deltas.find((delta) => delta.path === "Label text.box.height"),
    undefined,
  )

  const heightOnly = compare({ sources, probe, subject: { compareBox: "height" } })
  const delta = heightOnly.deltas.find((item) => item.path === "Label text.box.height")
  assert.ok(delta, "expected the label height to be compared")
  assert.equal(delta.render, height)
  assert.equal(
    heightOnly.deltas.find((item) => item.path === "Label text.box.width"),
    undefined,
    "the glyph width is not a comparable box",
  )

  const full = compare({ sources, probe, subject: { compareBox: "full" } })
  assert.ok(full.deltas.find((item) => item.path === "Label text.box.width"))
})

// The composition fixtures: two source siblings under one parent, with the
// offsets the source declares.
function compositionFixture({ titleTop, descriptionTop }) {
  const frame = (top, key) => ({
    box: { width: 200, height: 24 },
    offset: { left: 0, top },
    parent: { name: "Content", mode: "VERTICAL" },
    type: "FRAME",
    key,
  })
  return {
    sources: {
      field: { box: { width: 200, height: 96 }, offset: { left: 0, top: 0 }, type: "FRAME" },
      Title: frame(24, "Title"),
      Description: frame(48, "Description"),
    },
    probe: {
      subjects: {
        field: { box: { width: 200, height: 96 }, offset: { left: 0, top: 0 } },
        Title: { box: { width: 200, height: 24 }, offset: { left: 0, top: titleTop } },
        Description: { box: { width: 200, height: 24 }, offset: { left: 0, top: descriptionTop } },
      },
    },
  }
}

test("the composition offsets are advisory by default and gate in strict mode", () => {
  const { sources, probe } = compositionFixture({ titleTop: 24, descriptionTop: 60 })
  const advisory = compare({ sources, probe, subject: { compareOffset: true } })
  assert.deepEqual(advisory.deltas, [])
  assert.equal(advisory.advisories.length, 1)
  assert.equal(advisory.advisories[0].path, "Description.offset.top")
  assert.equal(advisory.advisories[0].source, 48)
  assert.equal(advisory.advisories[0].render, 60)
  // 60 sits on the 4px spacing grid: the rendered offset is token-backed.
  assert.equal(advisory.advisories[0].token.kind, "token")
  assert.equal(advisory.advisories[0].token.name, "space-15")
  assert.equal(advisory.verdict, "verified")

  const strict = compare({ sources, probe, subject: { compareOffset: true }, strict: true })
  assert.equal(strict.deltas.length, 1)
  assert.equal(strict.verdict, "review-required")

  const off = compare({ sources, probe })
  assert.deepEqual(off.advisories, [], "the offset check is opt-in")

  // A value between two steps is reported as a near-token, not as a token.
  const between = compositionFixture({ titleTop: 24, descriptionTop: 42 })
  const near = compare({
    sources: between.sources,
    probe: between.probe,
    subject: { compareOffset: true },
  })
  assert.equal(near.advisories[0].token.kind, "near-token")
})

test("the order check reports an inverted sibling pair", () => {
  const inverted = compositionFixture({ titleTop: 48, descriptionTop: 24 })
  const result = compare({
    sources: inverted.sources,
    probe: inverted.probe,
    subject: { compareOffset: true },
  })
  const order = result.advisories.find((advisory) => advisory.path === "Title.composition.order")
  assert.ok(order, "expected an order advisory")
  assert.equal(order.source, "Title before Description")
  assert.equal(order.render, "Description before Title")

  const matching = compositionFixture({ titleTop: 24, descriptionTop: 48 })
  const clean = compare({
    sources: matching.sources,
    probe: matching.probe,
    subject: { compareOffset: true },
  })
  assert.equal(
    clean.advisories.find((advisory) => advisory.path.endsWith("composition.order")),
    undefined,
  )
})

// The responsive verdict (RA5). The probe's own report is the input: clipped,
// escaped and truncated are defects the source does not have (R6), a scroll
// container is an advisory, and the band expectation is derived from the
// variant's layout mode — never from a component name.
test("a clipped or escaped box and lost text are deltas, a scroll container is an advisory", () => {
  const deltas = responsiveDeltas({
    responsive: {
      clipped: [{ selector: '[data-slot="header"]', axis: "x", hidden: 31, client: 320 }],
      escaped: [{ selector: "button.action", edges: { right: 31 } }],
      truncated: [{ selector: "span.label", hidden: 44, text: "Identity" }],
      scrollable: [{ selector: "div.tabs", x: 120, y: 0, before: 40 }],
    },
  })
  const paths = deltas.map((delta) => delta.path)
  assert.deepEqual(paths, [
    'responsive.clipped.[data-slot="header"]',
    "responsive.escaped.button.action",
    "responsive.truncated.span.label",
    "responsive.scrollable.div.tabs",
  ])
  assert.deepEqual(
    deltas.map((delta) => delta.severity),
    ["delta", "delta", "delta", "advisory"],
  )
  assert.match(deltas[0].render, /31px hidden on x/)
  assert.match(deltas[1].render, /right 31px/)
  assert.match(deltas[3].render, /content starts 40px before the scroll origin/)
})

test("a responsive finding fails the case unless a residue records the reason", () => {
  const sources = { field: { box: { width: 320, height: 77 } } }
  const probe = {
    subjects: { field: { box: { width: 320, height: 77 }, padding: [0, 0, 0, 0], gap: 0 } },
    responsive: { clipped: [{ selector: "button.action", axis: "x", hidden: 31, client: 320 }] },
  }
  const gating = compare({ sources, probe })
  assert.equal(gating.verdict, "review-required")
  assert.equal(gating.deltas[0].path, "responsive.clipped.button.action")

  const recorded = compare({
    sources,
    probe,
    residues: [{ path: "responsive.clipped.button.action", reason: "the source clips it too" }],
  })
  assert.deepEqual(recorded.deltas, [])
  assert.equal(recorded.verdict, "verified-with-residues")
  assert.equal(recorded.residues[0].reason, "the source clips it too")
})

// One band or a stack, per device: derived from the variant's layout mode and
// the number of lines the band element's children occupy.
const bandSource = (mode, children) => ({ layout: { mode }, children })
const threeChildren = [
  { box: { width: 100, height: 40 } },
  { box: { width: 100, height: 40 } },
  { box: { width: 100, height: 40 } },
]

test("a band that wrapped, and a stack that did not, are deltas", () => {
  const wrapped = bandDeltas({
    source: bandSource("HORIZONTAL", threeChildren),
    responsive: { band: { children: 3, rows: 2 } },
  })
  assert.deepEqual(
    wrapped.map((delta) => delta.path),
    ["responsive.band.wrap"],
  )
  assert.equal(wrapped[0].render, "2 lines")

  const collapsed = bandDeltas({
    source: bandSource("VERTICAL", threeChildren),
    responsive: { band: { children: 3, rows: 1 } },
  })
  assert.deepEqual(
    collapsed.map((delta) => delta.path),
    ["responsive.band.stack"],
  )

  // The matching structures report nothing.
  assert.deepEqual(
    bandDeltas({
      source: bandSource("HORIZONTAL", threeChildren),
      responsive: { band: { children: 3, rows: 1 } },
    }),
    [],
  )
  assert.deepEqual(
    bandDeltas({
      source: bandSource("VERTICAL", threeChildren),
      responsive: { band: { children: 3, rows: 3 } },
    }),
    [],
  )
})

test("the band check stays silent when the source or the render cannot decide", () => {
  const cases = [
    // No layout mode on the source (a plain frame, not an auto-layout one).
    { source: { children: threeChildren }, responsive: { band: { children: 3, rows: 2 } } },
    // One child on either side: a wrapper level is not a composition difference.
    {
      source: bandSource("HORIZONTAL", [threeChildren[0]]),
      responsive: { band: { children: 1, rows: 2 } },
    },
    {
      source: bandSource("HORIZONTAL", threeChildren),
      responsive: { band: { children: 0, rows: 0 } },
    },
    // No responsive block at all (an older probe).
    { source: bandSource("HORIZONTAL", threeChildren), responsive: undefined },
  ]
  for (const fixture of cases) {
    assert.deepEqual(bandDeltas(fixture), [], JSON.stringify(fixture))
  }
})

test("a declared scope the render does not confirm is a finding", () => {
  assert.deepEqual(
    scopeDeltas({ scope: { declared: "viewport", changed: { viewport: true } } }),
    [],
  )
  assert.deepEqual(
    scopeDeltas({ scope: { declared: "container", changed: { rootWidth: true } } }),
    [],
  )
  const viewport = scopeDeltas({ scope: { declared: "viewport", changed: { viewport: false } } })
  assert.deepEqual(
    viewport.map((delta) => delta.path),
    ["responsive.scope.viewport"],
  )
  assert.equal(viewport[0].severity, "delta")
  const container = scopeDeltas({ scope: { declared: "container", changed: { rootWidth: false } } })
  assert.deepEqual(
    container.map((delta) => delta.path),
    ["responsive.scope.container"],
  )
  // A case without a declared scope is not checked: the default is the policy's.
  assert.deepEqual(scopeDeltas({}), [])
  assert.deepEqual(scopeDeltas({ scope: {} }), [])
})

// The signature the declared scope is verified with: a composition change must
// move it, a pure width change must not (otherwise a container case would
// "verify" itself by shrinking).
test("the composition signature ignores width and follows the composition", () => {
  const subject = (overrides) => ({
    layout: "flex row",
    childCount: 3,
    box: { width: 272, height: 48 },
    font: { size: 16, weight: 600 },
    gap: 8,
    padding: [0, 16, 0, 16],
    visibleText: 22,
    text: "Nome del prodotto",
    ...overrides,
  })
  const base = {
    subjects: { field: subject({}) },
    responsive: { band: { rows: 1, children: 3 } },
  }
  assert.equal(compositionSignature(base), compositionSignature(base))
  // A wider box is not a composition change: the container case must not
  // "verify" itself by shrinking the root.
  const wider = { ...base, subjects: { field: subject({ box: { width: 900, height: 48 } }) } }
  assert.equal(compositionSignature(wider), compositionSignature(base))
  // A collapsed label, a flipped axis, a wrapped band and a taller stack are.
  const collapsed = { ...base, subjects: { field: subject({ visibleText: 0, text: "" }) } }
  assert.notEqual(compositionSignature(collapsed), compositionSignature(base))
  const flipped = { ...base, subjects: { field: subject({ layout: "flex column" }) } }
  assert.notEqual(compositionSignature(flipped), compositionSignature(base))
  const wrapped = {
    ...base,
    responsive: { band: { rows: 2, children: 3 } },
  }
  assert.notEqual(compositionSignature(wrapped), compositionSignature(base))
  const taller = { ...base, subjects: { field: subject({ box: { width: 272, height: 84 } }) } }
  assert.notEqual(compositionSignature(taller), compositionSignature(base))
})
