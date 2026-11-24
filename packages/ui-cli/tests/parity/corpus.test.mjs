import assert from "node:assert/strict"
import path from "node:path"
import { test } from "node:test"

import { caseCorpus, readCorpus } from "../../src/parity/corpus.ts"
import { verify } from "../../src/parity/verify.ts"
import { COMMITTED_FILES, forgetCommitted } from "../../src/records/committed.ts"
import { fixtureTree, workspaceAt } from "../helpers/cli.mjs"

const workspace = workspaceAt(path.resolve(import.meta.dirname, "../../../pagopa-ui"))

const policy = {
  axes: ["Device"],
  any: ["Any"],
  devices: {
    mobile: { canonicalWidth: 320, defaultLayoutScope: "viewport", aliases: ["Mobile"] },
    desktop: { canonicalWidth: 1200, defaultLayoutScope: "viewport", aliases: ["Desktop"] },
  },
}

const node = {
  nodeId: "1:1",
  name: "Control",
  type: "COMPONENT",
  pageId: "0:1",
  pageName: "Components",
  properties: {
    Device: { type: "VARIANT", defaultValue: "Desktop", variantOptions: ["Desktop", "Mobile"] },
  },
  variants: [
    { nodeId: "1:10", name: "Device=Desktop", device: "desktop" },
    { nodeId: "1:11", name: "Device=Mobile", device: "mobile" },
  ],
}

const registry = {
  entries: { "1:1": { status: "implemented", target: { story: "src/Control.stories.tsx" } } },
  bulkRules: [],
}

const cases = [
  {
    id: "1-1-mobile-mobile",
    nodeId: "1:1",
    export: "Control",
    state: "Mobile",
    device: "mobile",
    width: 320,
  },
  {
    id: "1-1-desktop-desktop",
    nodeId: "1:1",
    export: "Control",
    state: "Desktop",
    device: "desktop",
    width: 1200,
    note: "reviewed: the desktop composition",
  },
  {
    id: "1-1-strong-desktop",
    nodeId: "1:1",
    export: "Control",
    variant: "1:11",
    device: "desktop",
    note: "draft — refine the mapping",
  },
]

test("the committed corpus is one value holding its documents and answering without them", () => {
  const corpus = readCorpus(workspace)
  assert.ok(corpus.cases.length > 0, "the corpus must not be empty")
  assert.ok(corpus.inventory.length > 0)
  assert.ok(Object.keys(corpus.registry.entries ?? {}).length > 0)
  assert.ok(corpus.policy.devices, "the device vocabulary is a document of the corpus")
  // The load-bearing shape: the documents are already held, so validation takes
  // no arguments at all.
  const { errors, warnings } = corpus.validate()
  assert.deepEqual(errors, [])
  assert.deepEqual(warnings, [])
})

test("an id resolves without reading the records the lookup does not consult", () => {
  const fixture = fixtureTree({
    [COMMITTED_FILES.cases]: JSON.stringify([
      { id: "1-1-strong", nodeId: "1:1", export: "Control" },
    ]),
  })
  try {
    const corpus = readCorpus(workspaceAt(fixture.root))
    assert.equal(corpus.find("1-1-strong").nodeId, "1:1")
    // The other three records are read when a judgment needs them, not before:
    // this tree has none, so validation raises the record it is missing.
    assert.throws(() => corpus.validate(), /inventory\.json: not found/)
  } finally {
    forgetCommitted(path.resolve(fixture.root, COMMITTED_FILES.cases))
    fixture.dispose()
  }
})

test("the corpus answers the node questions the importers used to index by hand", () => {
  const corpus = caseCorpus({
    workspace,
    cases,
    inventory: [node],
    registry,
    policy,
  })
  assert.deepEqual(
    corpus.of("1:1").map((entry) => entry.id),
    ["1-1-mobile-mobile", "1-1-desktop-desktop", "1-1-strong-desktop"],
  )
  // A draft is never coverage until the reviewed render replaces its note.
  assert.deepEqual(
    corpus.reviewed("1:1").map((entry) => entry.id),
    ["1-1-mobile-mobile", "1-1-desktop-desktop"],
  )
  assert.deepEqual(
    corpus.drafts.map((entry) => entry.id),
    ["1-1-strong-desktop"],
  )
  assert.deepEqual([...corpus.nodeIds], ["1:1"])
  assert.deepEqual(
    [...corpus.byId.keys()],
    cases.map((entry) => entry.id),
  )
  assert.equal(corpus.node("1:1")?.name, "Control")
  assert.equal(corpus.node("9:9"), undefined)
  assert.deepEqual([...corpus.pointed("1:1")].sort(), ["1:10", "1:11"])
  assert.deepEqual(corpus.of("9:9"), [])
})

test("an unknown case id fails with the ids the corpus knows", () => {
  const corpus = caseCorpus({ workspace, cases, inventory: [node], registry, policy })
  assert.throws(
    () => corpus.find("1-1-empty"),
    /no case with that id in the corpus \(known: 1-1-mobile-mobile, 1-1-desktop-desktop, 1-1-strong-desktop\)/,
  )
})

test("validateRegistry accepts additionalExports declared on the registry target", () => {
  const withAdditional = {
    entries: {
      "1:1": {
        status: "implemented",
        target: {
          module: "src/control.tsx",
          export: "Control",
          additionalExports: ["ControlGroup"],
          story: "src/Control.stories.tsx",
        },
      },
    },
    bulkRules: [],
  }
  const corpus = caseCorpus({
    workspace,
    cases: [
      {
        id: "1-1-group",
        nodeId: "1:1",
        export: "ControlGroup",
        device: "desktop",
        state: "Desktop",
      },
    ],
    inventory: [node],
    registry: withAdditional,
    policy,
  })
  assert.deepEqual(corpus.validate().errors, [])
})

test("verify honors device-exceptions.json for implemented nodes missing device cases", () => {
  const inventoryNode = {
    ...node,
    variants: node.variants.map((variant, index) => ({
      ...variant,
      designFingerprint: String(index + 1).repeat(64),
    })),
  }
  const baseFiles = {
    "src/catalog/figma/inventory.json": {
      fileKey: "fixture",
      syncedAt: "2026-10-21",
      components: [inventoryNode],
    },
    "src/catalog/figma/registry.json": {
      entries: {
        "1:1": {
          status: "implemented",
          target: {
            module: "src/control.tsx",
            export: "Control",
            story: "src/Control.stories.tsx",
          },
        },
      },
      bulkRules: [],
    },
    "src/catalog/figma/device-policy.json": policy,
    "src/catalog/figma/parity-cases.json": [],
  }
  const unexcepted = fixtureTree(baseFiles, "verify-device-unexcepted-")
  const excepted = fixtureTree(
    {
      ...baseFiles,
      "src/catalog/figma/device-exceptions.json": { "1:1": "tracked in burn-down" },
    },
    "verify-device-excepted-",
  )
  const stale = fixtureTree(
    {
      ...baseFiles,
      "src/catalog/figma/parity-cases.json": cases.slice(0, 2),
      "src/catalog/figma/device-exceptions.json": {
        "1:1": "no longer missing any device",
        "9:9": "unknown node",
      },
    },
    "verify-device-stale-",
  )
  try {
    const failed = verify(workspaceAt(unexcepted.root), { json: true })
    const failedData = JSON.parse(failed.out[0])
    assert.ok(
      failedData.errors.some((error) => error.includes("1:1 (implemented) misses device case(s)")),
    )

    const warned = verify(workspaceAt(excepted.root), { json: true })
    const warnedData = JSON.parse(warned.out[0])
    assert.ok(
      !warnedData.errors.some((error) => error.includes("1:1 (implemented) misses device case(s)")),
      "excepted node should not raise a device coverage error",
    )
    assert.ok(
      warnedData.warnings.some((warning) => warning.includes("excepted: tracked in burn-down")),
      "excepted node should surface as a warning with its reason",
    )

    const staleResult = verify(workspaceAt(stale.root), { json: true })
    const staleData = JSON.parse(staleResult.out[0])
    assert.ok(
      staleData.errors.some((error) => error.includes("1:1 covers every declared device")),
      "stale device exception must fail verify",
    )
    assert.ok(
      staleData.errors.some((error) =>
        error.includes("9:9 is not a registry entry with a device axis"),
      ),
      "unknown-node device exception must fail verify",
    )
  } finally {
    unexcepted.dispose()
    excepted.dispose()
    stale.dispose()
  }
})
