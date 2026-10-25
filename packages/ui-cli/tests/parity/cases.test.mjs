import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"

import {
  canonicalCase,
  caseIdFor,
  caseKey,
  deviceCoverage,
  DRAFT_NOTE,
  findCase,
  isDraftCase,
  loadCaseFile,
  loadInventoryNodes,
  loadRegistry,
  saveCase,
  stateProposals,
  syncProposals,
  validateCaseFile,
  variantOfCase,
} from "../../src/parity/cases.ts"
import { caseFromFlags, specFromCase } from "../../src/parity/cli.ts"
import { rootPath } from "../../src/lib/paths.ts"

const CORPUS = rootPath("src/catalog/figma/parity-cases.json")

// The device vocabulary of the fixtures: the resolver is data-driven, so the
// corpus tests declare their own.
const policy = {
  axes: ["Device"],
  any: ["Any", "Default"],
  devices: {
    mobile: {
      canonicalWidth: 320,
      defaultLayoutScope: "viewport",
      aliases: ["Mobile", "XS Mobile", "XSMobile"],
    },
    desktop: {
      canonicalWidth: 1200,
      defaultLayoutScope: "viewport",
      aliases: ["Desktop", "LG Desktop"],
    },
  },
}

const node = {
  nodeId: "1:1",
  name: "Control",
  properties: {
    Device: { type: "VARIANT", defaultValue: "Desktop", variantOptions: ["Desktop", "Mobile"] },
  },
  variants: [
    {
      nodeId: "1:10",
      name: "Device=Desktop",
      device: "desktop",
      box: { width: 1200, height: 40 },
      designFingerprint: "a".repeat(64),
    },
    {
      nodeId: "1:11",
      name: "Device=Mobile",
      device: "mobile",
      box: { width: 320, height: 40 },
      designFingerprint: "b".repeat(64),
    },
  ],
}

// A set with a visual axis next to its device axis: the state proposals read
// the variants the reviewed corpus does not point at.
const panel = {
  nodeId: "2:1",
  name: "Panel",
  properties: {
    Device: { type: "VARIANT", defaultValue: "Desktop", variantOptions: ["Desktop", "Mobile"] },
    Tone: { type: "VARIANT", defaultValue: "Plain", variantOptions: ["Plain", "Strong", "Kind"] },
  },
  variants: [
    {
      nodeId: "2:10",
      name: "Tone=Plain, Device=Desktop",
      device: "desktop",
      box: { width: 1200, height: 40 },
    },
    {
      nodeId: "2:11",
      name: "Tone=Strong, Device=Desktop",
      device: "desktop",
      box: { width: 1200, height: 40 },
    },
    {
      nodeId: "2:12",
      name: "Tone=Plain, Device=Mobile",
      device: "mobile",
      box: { width: 320, height: 40 },
    },
    {
      nodeId: "2:13",
      name: "Tone=Strong, Device=Mobile",
      device: "mobile",
      box: { width: 320, height: 40 },
    },
    // Two records can share a canonical device and a state (the source's own
    // spellings of one device): they share the corpus identity too.
    {
      nodeId: "2:14",
      name: "Tone=Kind, Device=LG Desktop",
      device: "desktop",
      box: { width: 1200, height: 40 },
    },
    {
      nodeId: "2:15",
      name: "Tone=Kind, Device=XL Desktop",
      device: "desktop",
      box: { width: 1536, height: 40 },
    },
  ],
}

const panelRegistry = {
  bulkRules: [],
  entries: {
    "2:1": {
      status: "implemented",
      target: {
        module: "src/components/panel.tsx",
        export: "Panel",
        story: "src/stories/Panel.stories.tsx",
        storyExports: ["Playground"],
      },
    },
  },
}

const registry = { bulkRules: [], entries: { "1:1": { status: "implemented" } } }

function validate(cases) {
  return validateCaseFile(cases, { registry, nodes: [node], policy })
}

test("the committed corpus is valid against the registry and the inventory", () => {
  const cases = loadCaseFile(CORPUS)
  assert.ok(cases.length > 0, "the corpus must not be empty")
  const { errors, warnings } = validateCaseFile(cases, {
    registry: loadRegistry(),
    nodes: loadInventoryNodes(),
  })
  assert.deepEqual(errors, [])
  assert.deepEqual(warnings, [])
})

test("every committed case names a story the registry declares", () => {
  const registry = loadRegistry()
  for (const entry of loadCaseFile(CORPUS)) {
    assert.match(entry.storyId, /^[a-z0-9-]+--[a-z0-9-]+$/, `${entry.id} story id`)
    const known = registry.entries[entry.nodeId]
    if (known?.target?.storyExports?.length) {
      assert.ok(known.target.storyExports.length > 0)
      assert.equal(known.target.export, entry.export, `${entry.id} export`)
    }
  }
})

test("a case id is derived from the node and the state it captures", () => {
  assert.equal(caseIdFor({ nodeId: "529:6111", state: "filled" }), "529-6111-filled")
  assert.equal(
    caseIdFor({ nodeId: "1904:9589", state: "MD Desktop|Thank you" }),
    "1904-9589-md-desktop-thank-you",
  )
  assert.equal(caseIdFor({ nodeId: "749:5867", variant: "749:5865" }), "749-5867-749-5865")
  assert.equal(caseIdFor({ nodeId: "529:6111" }), "529-6111-case")
})

test("the canonical writer keeps one field order and drops empty collections", () => {
  const entry = canonicalCase({
    nodeId: "529:6111",
    state: "filled",
    export: "TextField",
    residues: [],
    ignores: [],
    blur: false,
    compareOffset: true,
    subjects: { "Label text": "label" },
  })
  assert.deepEqual(Object.keys(entry), [
    "id",
    "nodeId",
    "export",
    "state",
    "subjects",
    "compareOffset",
  ])
  assert.equal(entry.id, "529-6111-filled")
})

test("a saved case replaces the entry with the same identity", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parity-cases-"))
  const file = path.join(dir, "cases.json")
  const first = { nodeId: "529:6111", export: "TextField", state: "filled", width: 274 }
  const saved = saveCase(file, first)
  assert.equal(saved.replaced, false)
  assert.equal(saved.entry.id, "529-6111-filled")
  assert.deepEqual(
    loadCaseFile(file).map((entry) => entry.id),
    ["529-6111-filled"],
  )

  const refined = saveCase(file, { ...first, root: "input", compareOffset: true })
  assert.equal(refined.replaced, true)
  assert.equal(refined.total, 1)
  assert.equal(loadCaseFile(file)[0].root, "input")
  fs.rmSync(dir, { recursive: true, force: true })
})

test("an unknown case id fails with the known ids in the message", () => {
  assert.throws(
    () => findCase([{ id: "529-6111-filled" }], "529-6111-empty"),
    /no case with that id in the corpus \(known: 529-6111-filled\)/,
  )
})

test("the validator rejects the mapping mistakes the corpus exists to prevent", () => {
  const cases = [
    {
      id: "529-6111-filled",
      nodeId: "529:6111",
      export: "TextField",
      state: "filled",
      storyId: "components-inputs-textfield--source-frame",
      subjects: { "Label text": "" },
      residues: [{ path: "field.box.width" }],
      ignores: [""],
      compareBox: "width",
      unknownField: true,
      width: -1,
    },
    {
      id: "529-6111-filled",
      nodeId: "1:1",
      export: "TextField",
      variant: "not-a-node",
    },
  ]
  const { errors } = validateCaseFile(cases)
  const joined = errors.join("\n")
  assert.match(joined, /529-6111-filled: duplicate case id/)
  assert.match(joined, /subject Label text has no selector/)
  assert.match(joined, /residue field\.box\.width has no reason/)
  assert.match(joined, /an ignore entry needs a delta path/)
  assert.match(joined, /compareBox must be "height" or "full"/)
  assert.match(joined, /unknown field unknownField/)
  assert.match(joined, /width must be a positive number/)
  assert.match(joined, /1:1 is not in inventory\.json/)
  assert.match(joined, /variant must be a node id/)
})

test("a story id outside the declared exports is an error", () => {
  const { errors } = validateCaseFile([
    {
      id: "529-6111-filled",
      nodeId: "529:6111",
      export: "TextField",
      storyId: "components-inputs-textfield--not-declared",
      state: "filled",
    },
  ])
  assert.equal(errors.length, 1)
  assert.match(errors[0], /is not among the declared story exports of 529:6111/)
})

test("the case identity ignores the id and follows the node plus the variant", () => {
  assert.equal(
    caseKey({ nodeId: "529:6111", variant: "529:6110", state: "filled" }),
    "529:6111|529:6110|",
  )
  assert.equal(caseKey({ nodeId: "529:6111", state: "filled" }), "529:6111|filled|")
})

test("a device case carries its device in the id and in the identity", () => {
  assert.equal(
    caseIdFor({ nodeId: "1298:5209", state: "Mobile", device: "mobile" }),
    "1298-5209-mobile-mobile",
  )
  assert.equal(caseIdFor({ nodeId: "1298:5209", state: "Mobile" }), "1298-5209-mobile")
  assert.equal(
    caseKey({ nodeId: "1298:5209", state: "Mobile", device: "mobile" }),
    "1298:5209|Mobile|mobile",
  )
  // Two devices of one state are two cases: the device is part of the identity.
  assert.notEqual(
    caseKey({ nodeId: "1298:5209", state: "Mobile", device: "mobile" }),
    caseKey({ nodeId: "1298:5209", state: "Mobile", device: "desktop" }),
  )
  const entry = canonicalCase({
    nodeId: "1298:5209",
    export: "Header",
    state: "Mobile",
    device: "mobile",
    layoutScope: "viewport",
  })
  assert.deepEqual(Object.keys(entry), ["id", "nodeId", "export", "state", "device", "layoutScope"])
})

test("the validator reads the device through the policy and the variant", () => {
  const clean = validate([
    {
      id: "1-1-desktop",
      nodeId: "1:1",
      export: "Control",
      state: "Desktop",
      device: "desktop",
      layoutScope: "viewport",
    },
    {
      id: "1-1-mobile-1-11",
      nodeId: "1:1",
      export: "Control",
      variant: "1:11",
      device: "mobile",
    },
  ])
  assert.deepEqual(clean.errors, [])

  const contradictions = validate([
    // The variant node id declares desktop, the case says mobile.
    { id: "a", nodeId: "1:1", export: "Control", variant: "1:10", device: "mobile" },
    // The state selects the mobile variant, the case says desktop.
    { id: "b", nodeId: "1:1", export: "Control", state: "Mobile", device: "desktop" },
    // A device the policy does not declare.
    { id: "c", nodeId: "1:1", export: "Control", device: "watch" },
    // The canonical key is the policy's, not one of its aliases.
    { id: "d", nodeId: "1:1", export: "Control", device: "XS Mobile" },
    // A scope that is neither viewport nor container.
    { id: "e", nodeId: "1:1", export: "Control", device: "mobile", layoutScope: "page" },
  ])
  const joined = contradictions.errors.join("\n")
  assert.match(
    joined,
    /a: device "mobile" contradicts the variant 1:10 \(Device=Desktop\), which declares "desktop"/,
  )
  assert.match(
    joined,
    /b: device "desktop" contradicts the variant 1:11 \(Device=Mobile\), which declares "mobile"/,
  )
  assert.match(joined, /c: device "watch" is not a device key \(mobile, desktop\)/)
  assert.match(
    joined,
    /d: device "XS Mobile" is not a device key \(mobile, desktop\) — it resolves to "mobile"/,
  )
  assert.match(joined, /e: layoutScope must be one of viewport \| container/)
  assert.equal(
    contradictions.errors.filter((error) => /contradicts/.test(error)).length,
    2,
    "the cross-check fires once per contradicting case",
  )
})

test("a case without a device stays valid against a policy that has one", () => {
  const { errors } = validate([{ id: "legacy", nodeId: "1:1", export: "Control", state: "empty" }])
  assert.deepEqual(errors, [])
  assert.equal(variantOfCase(node, { state: "empty" }), undefined)
  assert.equal(variantOfCase(node, { state: "Mobile" }).nodeId, "1:11")
  assert.equal(variantOfCase(node, { variant: "1:10" }).nodeId, "1:10")
})

test("the coverage join reports what each node declares against what it covers", () => {
  const cases = [
    {
      id: "1-1-mobile",
      nodeId: "1:1",
      export: "Control",
      device: "mobile",
      state: "Mobile",
    },
  ]
  const { rows, totals, omitted } = deviceCoverage({
    policy,
    nodes: [node],
    registry,
    cases,
    statuses: ["implemented"],
  })
  assert.equal(omitted, 0)
  assert.equal(totals.nodes, 1)
  assert.deepEqual(totals, { nodes: 1, declared: 2, covered: 1, missing: 1, drafts: 0 })
  assert.deepEqual(rows, [
    {
      nodeId: "1:1",
      name: "Control",
      status: "implemented",
      export: null,
      story: null,
      declared: ["mobile", "desktop"],
      covered: ["mobile"],
      missing: ["desktop"],
      drafts: [],
    },
  ])
  // The status filter reports the nodes it left out instead of hiding them.
  const excluded = deviceCoverage({
    policy,
    nodes: [node],
    registry,
    cases,
    statuses: ["pending"],
  })
  assert.equal(excluded.rows.length, 0)
  assert.equal(excluded.omitted, 1)
})

// RA6: the proposals the burn-down wave starts from, and the draft rule that
// keeps them out of the coverage (R9).
test("a missing device case is proposed from the sibling the corpus has", () => {
  const cases = [
    {
      id: "1-1-desktop",
      nodeId: "1:1",
      export: "Control",
      storyId: "fixture--example",
      state: "Desktop",
      device: "desktop",
      width: 1200,
      root: '[data-slot="control"]',
      subjects: { Label: "label" },
      compareOffset: true,
      residues: [{ path: "field.box.height", reason: "the sibling's own residue is not copied" }],
    },
  ]
  const { proposals, skipped } = syncProposals({
    policy,
    nodes: [node],
    registry,
    cases,
    statuses: ["implemented"],
  })
  assert.deepEqual(skipped, [])
  assert.deepEqual(proposals, [
    {
      nodeId: "1:1",
      export: "Control",
      storyId: "fixture--example",
      state: "Mobile",
      device: "mobile",
      width: 320,
      viewport: 320,
      root: '[data-slot="control"]',
      subjects: { Label: "label" },
      compareOffset: true,
      note: "draft — refine the mapping",
    },
  ])
  // The proposal is written through the same path a reviewed case uses, with the
  // device in its id.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parity-sync-"))
  const file = path.join(dir, "cases.json")
  fs.writeFileSync(file, JSON.stringify(cases))
  const saved = saveCase(file, proposals[0])
  assert.equal(saved.entry.id, "1-1-mobile-mobile")
  assert.equal(saved.replaced, false)
  assert.equal(loadCaseFile(file).length, 2)
  fs.rmSync(dir, { recursive: true, force: true })
})

test("a device-less sibling proposes every declared device", () => {
  const cases = [{ id: "1-1-case", nodeId: "1:1", export: "Control", storyId: "fixture--example" }]
  const { proposals } = syncProposals({
    policy,
    nodes: [node],
    registry,
    cases,
    statuses: ["implemented"],
  })
  assert.deepEqual(
    proposals.map((proposal) => [proposal.device, proposal.state, proposal.width]),
    [
      ["mobile", "Mobile", 320],
      ["desktop", "Desktop", 1200],
    ],
  )
  // An unexplored node (no sibling at all) is skipped with the reason, never
  // proposed from nothing.
  const none = syncProposals({
    policy,
    nodes: [node],
    registry,
    cases: [],
    statuses: ["implemented"],
  })
  assert.deepEqual(none.proposals, [])
  assert.deepEqual(none.skipped, [
    { nodeId: "1:1", missing: ["mobile", "desktop"], reason: "no sibling case" },
  ])
})

// The RA6 extension: the states and the visual properties enter the burn-down
// as drafts, one per variant no reviewed case points at.
test("a variant no reviewed case points at is proposed as a state draft", () => {
  const cases = [
    {
      id: "2-1-plain-desktop",
      nodeId: "2:1",
      export: "Panel",
      storyId: "fixture--panel",
      state: "Plain",
      variant: "2:10",
      device: "desktop",
      width: 1200,
    },
  ]
  const { proposals, skipped } = stateProposals({
    policy,
    nodes: [panel],
    registry: panelRegistry,
    cases,
    statuses: ["implemented"],
  })
  // The covered device's other variants are proposed, pinned to their own node;
  // the missing device's variants wait for the device proposal that owns the
  // first capture at that width, and two records that share an identity collapse
  // into one proposal.
  assert.deepEqual(proposals, [
    {
      nodeId: "2:1",
      export: "Panel",
      storyId: "fixture--panel",
      state: "Strong",
      variant: "2:11",
      device: "desktop",
      width: 1200,
      viewport: 1200,
      note: DRAFT_NOTE,
    },
    {
      nodeId: "2:1",
      export: "Panel",
      storyId: "fixture--panel",
      state: "Kind",
      variant: "2:14",
      device: "desktop",
      width: 1200,
      viewport: 1200,
      note: DRAFT_NOTE,
    },
  ])
  assert.deepEqual(skipped, [
    { nodeId: "2:1", variant: "2:12", reason: "device mobile waits for its device case" },
    { nodeId: "2:1", variant: "2:13", reason: "device mobile waits for its device case" },
    {
      nodeId: "2:1",
      variant: "2:15",
      reason: "identity 2-1-kind-desktop already proposed by another variant",
    },
  ])
  // No sibling, no proposal: the first case of a node needs the review.
  const none = stateProposals({
    policy,
    nodes: [panel],
    registry: panelRegistry,
    cases: [],
    statuses: ["implemented"],
  })
  assert.deepEqual(none.proposals, [])
  assert.deepEqual(none.skipped, [{ nodeId: "2:1", reason: "no sibling case" }])
})

test("a state draft saves through the canonical path and waits for the review", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parity-state-"))
  const file = path.join(dir, "cases.json")
  fs.writeFileSync(
    file,
    JSON.stringify([
      {
        id: "2-1-plain-desktop",
        nodeId: "2:1",
        export: "Panel",
        storyId: "fixture--panel",
        variant: "2:10",
        state: "Plain",
        device: "desktop",
      },
    ]),
  )
  const sync = () =>
    syncProposals({
      policy,
      nodes: [panel],
      registry: panelRegistry,
      cases: loadCaseFile(file),
      statuses: ["implemented"],
    })
  const saved = saveCase(file, sync().stateProposals[0])
  assert.equal(saved.entry.id, "2-1-strong-desktop")
  assert.equal(saved.entry.variant, "2:11")
  assert.equal(saved.replaced, false)
  assert.equal(isDraftCase(saved.entry), true)
  const { errors } = validateCaseFile([saved.entry], {
    registry: panelRegistry,
    nodes: [panel],
    policy,
  })
  assert.deepEqual(errors, [])
  // The draft still waits for the reviewed render: the next run proposes it
  // again (replacing, not appending) and the variant stays unpointed.
  assert.ok(sync().stateProposals.some((proposal) => proposal.variant === "2:11"))
  const replaced = saveCase(
    file,
    sync().stateProposals.find((proposal) => proposal.variant === "2:11"),
  )
  assert.equal(replaced.replaced, true)
  assert.equal(loadCaseFile(file).length, 2)
  // Once the note is the reviewed one, the variant is pointed and the run stops
  // proposing it.
  const reviewed = loadCaseFile(file).map((item) =>
    item.id === saved.entry.id ? { ...item, note: "reviewed: the strong tone verified" } : item,
  )
  assert.ok(
    !stateProposals({
      policy,
      nodes: [panel],
      registry: panelRegistry,
      cases: reviewed,
      statuses: ["implemented"],
    }).proposals.some((proposal) => proposal.variant === "2:11"),
  )
  fs.rmSync(dir, { recursive: true, force: true })
})

test("a proposal never takes the identity of a reviewed case", () => {
  const cases = [
    {
      id: "2-1-plain-desktop",
      nodeId: "2:1",
      export: "Panel",
      storyId: "fixture--panel",
      variant: "2:10",
      device: "desktop",
    },
    {
      id: "2-1-strong-desktop",
      nodeId: "2:1",
      export: "Panel",
      storyId: "fixture--panel",
      state: "Strong!",
      device: "desktop",
      note: "reviewed: an older spelling of the same identity",
    },
  ]
  const { proposals, skipped } = stateProposals({
    policy,
    nodes: [panel],
    registry: panelRegistry,
    cases,
    statuses: ["implemented"],
  })
  assert.deepEqual(
    proposals.map((proposal) => proposal.variant),
    ["2:14"],
  )
  assert.deepEqual(
    skipped.filter((entry) => entry.variant === "2:11"),
    [
      {
        nodeId: "2:1",
        variant: "2:11",
        reason: "identity 2-1-strong-desktop is owned by a reviewed case",
      },
    ],
  )
})

test("a draft case is not coverage until the reviewed render replaces its note", () => {
  const draft = {
    id: "1-1-mobile-mobile",
    nodeId: "1:1",
    export: "Control",
    storyId: "fixture--example",
    state: "Mobile",
    device: "mobile",
    note: "draft — refine the mapping",
  }
  const coverage = deviceCoverage({
    policy,
    nodes: [node],
    registry,
    cases: [draft],
    statuses: ["implemented"],
  })
  assert.deepEqual(coverage.rows[0].covered, [])
  assert.deepEqual(coverage.rows[0].missing, ["mobile", "desktop"])
  assert.deepEqual(coverage.rows[0].drafts, ["1-1-mobile-mobile"])
  assert.equal(coverage.totals.drafts, 1)

  const refined = { ...draft, note: "reviewed: the mobile card composition" }
  const covered = deviceCoverage({
    policy,
    nodes: [node],
    registry,
    cases: [refined],
    statuses: ["implemented"],
  })
  assert.deepEqual(covered.rows[0].covered, ["mobile"])
  assert.deepEqual(covered.rows[0].missing, ["desktop"])
  assert.deepEqual(covered.rows[0].drafts, [])
})

// The corpus is addressed by `--case <id>`: a refinement that gains a device (or
// a scope) replaces the entry it refines instead of appending a namesake.
test("refining a case with a device keeps its id and replaces the entry", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parity-save-"))
  const file = path.join(dir, "cases.json")
  fs.writeFileSync(
    file,
    JSON.stringify([
      {
        id: "749-5867-mobile",
        nodeId: "749:5867",
        export: "WaitingState",
        storyId: "components-feedback-waitingstate--source-frame",
        state: "mobile",
        width: 320,
      },
    ]),
  )
  const saved = saveCase(
    file,
    {
      nodeId: "749:5867",
      export: "WaitingState",
      storyId: "components-feedback-waitingstate--source-frame",
      state: "mobile",
      device: "mobile",
      layoutScope: "viewport",
      width: 320,
    },
    { id: "749-5867-mobile" },
  )
  assert.equal(saved.replaced, true)
  assert.equal(saved.total, 1)
  const [entry] = loadCaseFile(file)
  assert.equal(entry.id, "749-5867-mobile")
  assert.equal(entry.device, "mobile")
  assert.equal(entry.layoutScope, "viewport")
  fs.rmSync(dir, { recursive: true, force: true })
})

// `--note <text>` is how a refined draft stops being a draft: it replaces the
// `cases --sync` note in the saved entry while root, subjects, residues and the
// rest of the mapping stay (before the flag the only way was to re-type every
// flag and lose the mapping).
test("--note replaces a draft note without losing the reviewed mapping", () => {
  const draft = {
    id: "1-1-mobile-mobile",
    nodeId: "1:1",
    export: "Control",
    storyId: "fixture--example",
    state: "Mobile",
    device: "mobile",
    width: 320,
    root: '[data-slot="control"]',
    subjects: { Label: "label" },
    note: DRAFT_NOTE,
  }
  const args = { subjects: [], residues: [], ignores: [], fill: [], click: [], focus: [] }
  const refined = specFromCase(
    draft,
    new Map([["note", "reviewed: the mobile composition at 320"]]),
    args,
  )
  assert.equal(refined.note, "reviewed: the mobile composition at 320")
  assert.equal(refined.root, '[data-slot="control"]')
  assert.deepEqual(refined.subjects, { Label: "label" })
  // Without `--note` the case keeps the note it carries: a plain re-run of the
  // case never clears it.
  assert.equal(specFromCase(draft, new Map(), args).note, DRAFT_NOTE)

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parity-note-"))
  const file = path.join(dir, "cases.json")
  fs.writeFileSync(file, JSON.stringify([draft]))
  const saved = saveCase(file, refined, { id: draft.id })
  assert.equal(saved.replaced, true)
  const [entry] = loadCaseFile(file)
  assert.equal(entry.note, "reviewed: the mobile composition at 320")
  assert.equal(entry.root, '[data-slot="control"]')
  assert.equal(isDraftCase(entry), false)
  fs.rmSync(dir, { recursive: true, force: true })
})

test("--note annotates a case built from the command line", () => {
  const known = {
    nodeId: "1:1",
    export: "Control",
    storyIds: ["fixture--example"],
  }
  const args = { subjects: [], residues: [], ignores: [], fill: [], click: [], focus: [] }
  const spec = caseFromFlags(known, new Map([["note", "reviewed: the desktop first render"]]), args)
  assert.equal(spec.note, "reviewed: the desktop first render")
  assert.equal(spec.nodeId, "1:1")
  assert.equal(caseFromFlags(known, new Map(), args).note, undefined)
})
