// The node card: one bounded record per node, rendered as text and as JSON.
// The seams under test are the card's own output — the record `buildNodeCard`
// returns, the text `formatNodeCard` renders and the bytes the ceiling allows —
// plus the `figma brief --card` command contract. Nothing here reaches inside
// the builder: a refactor that keeps the rendered card identical must keep
// these tests green.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  CARD_BUDGET,
  buildNodeCard,
  formatNodeCard,
  readNodeCardGates,
} from "../../src/figma/card.ts"
import { committedFile, readInventory } from "../../src/records/committed.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

const DESIGN_SYSTEM = fileURLToPath(new URL("../../../pagopa-ui/", import.meta.url))

const inventory = {
  schemaVersion: 2,
  fileKey: "file",
  syncedAt: "2026-01-02T00:00:00Z",
  components: [
    {
      nodeId: "4:4",
      name: "Widget",
      type: "COMPONENT_SET",
      pageId: "1:1",
      pageName: "• Components",
      properties: {
        Device: {
          type: "VARIANT",
          defaultValue: "Mobile",
          variantOptions: ["Mobile", "Desktop"],
        },
      },
      variants: [
        {
          nodeId: "4:5",
          name: "Device=Mobile",
          device: "mobile",
          box: { width: 320, height: 40 },
          designFingerprint: "a".repeat(64),
        },
        {
          nodeId: "4:6",
          name: "Device=Desktop",
          device: "desktop",
          box: { width: 1200, height: 40 },
          designFingerprint: "b".repeat(64),
        },
      ],
    },
    {
      nodeId: "5:5",
      name: "Spinner",
      type: "COMPONENT",
      pageId: "1:1",
      pageName: "• Components",
    },
  ],
}

const registry = {
  entries: {
    "4:4": {
      status: "implemented",
      target: {
        module: "src/components/widget.tsx",
        export: "Widget",
        story: "apps/storybook/src/Widget.stories.tsx",
        storyExports: ["Playground", "Fidelity"],
      },
      note: "Reviewed 2026-01-02: one composition at every device.",
    },
  },
  bulkRules: [],
}

const rules = {
  schemaVersion: 1,
  fileKey: "file",
  cards: {
    "I4:4;4:9": {
      pageId: "1:1",
      page: "• Components",
      container: "4:9",
      section: "Consolidate",
      status: "Ok!",
      title: "Larghezza",
      titleEn: "Width",
      summary: "The widget fills its container.",
      sourceHash: "0123456789abcdef",
      targets: ["4:4"],
      scope: "component",
      disposition: "recorded",
      guide: "apps/storybook/src/guides/widget.md",
      reviewedAt: "2026-01-02",
    },
    "I4:4;4:10": {
      pageId: "1:1",
      page: "• Components",
      container: "4:10",
      section: "Da commentare",
      status: "Da fare",
      title: "Allineamento",
      sourceHash: "fedcba9876543210",
      targets: ["4:4"],
      scope: "component",
      disposition: "pending",
    },
  },
}

const cases = [
  {
    id: "widget-mobile",
    nodeId: "4:4",
    export: "Widget",
    storyId: "components-widget--playground",
    variant: "4:5",
    device: "mobile",
    layoutScope: "viewport",
    width: 320,
    viewport: 320,
    height: 40,
    root: "#storybook-root",
    note: "Reviewed at 320: the widget fills its container.",
  },
  {
    id: "widget-desktop",
    nodeId: "4:4",
    export: "Widget",
    storyId: "components-widget--playground",
    variant: "4:6",
    device: "desktop",
    layoutScope: "viewport",
    width: 1200,
    viewport: 1200,
    height: 40,
    root: "#storybook-root",
    note: "draft: the desktop frame is not captured yet.",
  },
]

const policy = {
  axes: ["Device"],
  any: ["Any"],
  devices: {
    mobile: { canonicalWidth: 320, defaultLayoutScope: "viewport", aliases: ["Mobile"] },
    desktop: { canonicalWidth: 1200, defaultLayoutScope: "viewport", aliases: ["Desktop"] },
  },
}

const manifest = {
  schemaVersion: 2,
  fileKey: "file",
  version: "1",
  capturedAt: "2026-01-02T00:00:00Z",
  sourceSha256: "c".repeat(64),
  cases: {
    "widget-mobile": {
      png: "references/widget-mobile.png",
      sha256: "d".repeat(64),
      nodeId: "4:4",
      variant: "4:5",
      designFingerprint: "a".repeat(64),
      width: 320,
      height: 40,
    },
  },
}

function catalogue(overrides = {}) {
  return fixtureTree({
    "src/catalog/figma/inventory.json": inventory,
    "src/catalog/figma/registry.json": registry,
    "src/catalog/figma/rules.json": rules,
    "src/catalog/figma/parity-cases.json": cases,
    "src/catalog/figma/device-policy.json": policy,
    "docs/figma-parity/manifest.json": manifest,
    "docs/design-requests/2026-01-02-widget-width.md":
      "# Design request — Widget width\n\nOrigin: node `4:4`.\n",
    ...overrides,
  })
}

// The verdict filters gate results the caller read, so every card here hands
// over the workspace's own: the card never walks the workspace itself.
function nodeCard(workspace, node, options = {}) {
  return buildNodeCard(workspace, node, { gates: readNodeCardGates(workspace), ...options })
}

function cardLines(fixture) {
  return formatNodeCard(nodeCard(workspaceAt(fixture.root), "4:4"))
}

test("the card renders one line per section from the committed catalogue", () => {
  const fixture = catalogue()
  try {
    assert.deepEqual(cardLines(fixture), [
      "node       4:4 · Widget",
      "page       • Components",
      "status     implemented",
      "target     src/components/widget.tsx · Widget",
      "story      apps/storybook/src/Widget.stories.tsx · Playground, Fidelity",
      "devices    mobile 320 · desktop 1200",
      "cases      mobile 320 viewport reviewed — Reviewed at 320: the widget fills its container. · desktop 1200 viewport draft — draft: the desktop frame is not captured yet.",
      "rules      2 (1 pending) · I4:4;4:9 recorded — Width · I4:4;4:10 pending — Allineamento · guide apps/storybook/src/guides/widget.md",
      "comments   (no snapshot: run figma comments --refresh)",
      "requests   docs/design-requests/2026-01-02-widget-width.md",
      "delta      (no live snapshot: run figma export to compare)",
      "verdict    devices desktop has no reviewed case",
      "evidence   docs/figma-parity/references/widget-mobile.png",
      "note       Reviewed 2026-01-02: one composition at every device.",
      "detail     (no detail written: figma brief --node <id> --card)",
    ])
  } finally {
    fixture.dispose()
  }
})

test("figma brief --card prints the card, --card --json prints the record", async () => {
  const fixture = catalogue()
  try {
    const text = await runCli(["figma", "brief", "--node", "4:4", "--card"], { root: fixture.root })
    assert.equal(text.status, 0)
    // The card names the full brief the same command wrote beside it: the card
    // is capped, so the prose it summarises is one read away rather than gone.
    const lines = cardLines(fixture)
    assert.equal(
      text.stdout.trimEnd(),
      [...lines.slice(0, -1), "detail     .figma/briefs/4-4.txt"].join("\n"),
    )
    const detail = fs.readFileSync(path.join(fixture.root, ".figma", "briefs", "4-4.txt"), "utf8")
    assert.match(detail, /^node {7}4:4 · Widget$/m)
    assert.match(detail, /Width/)

    const json = await runCli(["figma", "brief", "--node", "4:4", "--card", "--json"], {
      root: fixture.root,
    })
    assert.equal(json.status, 0)
    const record = JSON.parse(json.stdout)
    assert.equal(record.node, "4:4")
    assert.equal(record.name, "Widget")
    assert.equal(record.status, "implemented")
    assert.equal(record.module, "src/components/widget.tsx")
    assert.deepEqual(record.devices, [
      { device: "mobile", width: 320 },
      { device: "desktop", width: 1200 },
    ])
    assert.deepEqual(
      record.cases.map((item) => [item.id, item.verdict]),
      [
        ["widget-mobile", "reviewed"],
        ["widget-desktop", "draft"],
      ],
    )
    assert.deepEqual(record.verdict, ["devices desktop has no reviewed case"])
    assert.deepEqual(record.evidence, [
      { path: "docs/figma-parity/references/widget-mobile.png", stale: false },
    ])
    assert.equal(record.comments, null)
    assert.equal(record.delta, null)
  } finally {
    fixture.dispose()
  }
})

// The card is the only artifact a session reads by default, so it clamps the
// registry note; the detail written beside it is where the whole note — binding
// constraints and residues included — has to survive.
test("the detail keeps the registry note whole where the card clamps it", async () => {
  const head = "Binding: keep 8px between buttons at every device."
  const residue = "Residue from the 2025 review: ".repeat(8).trim()
  const note = `${head}\n${residue}`
  assert.ok(note.length > 240)
  const fixture = catalogue({
    "src/catalog/figma/registry.json": {
      ...registry,
      entries: { "4:4": { ...registry.entries["4:4"], note } },
    },
  })
  try {
    const text = await runCli(["figma", "brief", "--node", "4:4", "--card"], { root: fixture.root })
    assert.equal(text.status, 0)
    assert.ok(!text.stdout.includes(residue), "the card clamps the note")
    assert.match(text.stdout, /^note {7}Binding: keep 8px.*…$/m)

    const detail = fs.readFileSync(path.join(fixture.root, ".figma", "briefs", "4-4.txt"), "utf8")
    assert.ok(detail.includes(`note       ${head}\n`), "the first line is the note verbatim")
    assert.ok(detail.includes(`           ${residue}\n`), "the rest of the note stays indented")
  } finally {
    fixture.dispose()
  }
})

test("--card without a node is a usage error and --card does not disturb the brief", async () => {
  const fixture = catalogue()
  try {
    const usage = await runCli(["figma", "brief", "--queue", "--card"], { root: fixture.root })
    assert.equal(usage.status, 2)
    assert.match(usage.stderr, /--card needs --node/)

    const brief = await runCli(["figma", "brief", "--node", "4:4"], { root: fixture.root })
    assert.equal(brief.status, 0)
    assert.match(brief.stdout, /^node {7}4:4 · Widget$/m)
    assert.doesNotMatch(brief.stdout, /^verdict/m)
  } finally {
    fixture.dispose()
  }
})

test("every section states its absence instead of vanishing", () => {
  const fixture = catalogue()
  try {
    assert.deepEqual(formatNodeCard(nodeCard(workspaceAt(fixture.root), "5:5")), [
      "node       5:5 · Spinner",
      "page       • Components",
      "status     (no registry entry)",
      "target     (no target)",
      "story      (no story declared)",
      "devices    (no device declared)",
      "cases      (no parity case)",
      "rules      no rule targets this node",
      "comments   (no snapshot: run figma comments --refresh)",
      "requests   none",
      "delta      (no live snapshot: run figma export to compare)",
      "verdict    no check names this node",
      "evidence   (no evidence: run figma evidence)",
      "note       (no registry note)",
      "detail     (no detail written: figma brief --node <id> --card)",
    ])
  } finally {
    fixture.dispose()
  }
})

const manyRules = {
  schemaVersion: 1,
  fileKey: "file",
  cards: Object.fromEntries(
    Array.from({ length: 30 }, (_, index) => [
      `I4:4;4:${100 + index}`,
      {
        pageId: "1:1",
        page: "• Components",
        container: `4:${100 + index}`,
        section: "Consolidate",
        status: "Ok!",
        title: `Regola ${index}`,
        titleEn: `Rule ${index}`,
        summary: "A rule whose summary is long enough to fill the card on its own.",
        sourceHash: "0123456789abcdef",
        targets: ["4:4"],
        scope: "component",
        disposition: "recorded",
        guide: `apps/storybook/src/guides/widget-${index}.md`,
        reviewedAt: "2026-01-02",
      },
    ]),
  ),
}

test("a cut section carries a marker and the card stays under the ceiling", () => {
  const fixture = catalogue({
    "src/catalog/figma/rules.json": manyRules,
    "src/catalog/figma/registry.json": {
      ...registry,
      entries: {
        "4:4": {
          ...registry.entries["4:4"],
          note: `Reviewed: ${"a long sentence about the composition. ".repeat(12)}`,
        },
      },
    },
  })
  try {
    const lines = formatNodeCard(nodeCard(workspaceAt(fixture.root), "4:4"))
    const text = lines.join("\n")
    assert.ok(
      Buffer.byteLength(text, "utf8") <= CARD_BUDGET,
      `card is ${Buffer.byteLength(text)} bytes`,
    )
    assert.match(text, /… \+\d+ more/)
    for (const label of [
      "node",
      "page",
      "status",
      "target",
      "story",
      "devices",
      "cases",
      "rules",
    ]) {
      assert.ok(
        text.startsWith(`${label} `) || text.includes(`\n${label} `),
        `${label} section survived the cut`,
      )
    }
  } finally {
    fixture.dispose()
  }
})

test("two runs on the same catalogue are byte-identical and carry no absolute path", () => {
  const fixture = catalogue()
  try {
    const workspace = workspaceAt(fixture.root)
    const first = formatNodeCard(nodeCard(workspace, "4:4"))
    const second = formatNodeCard(nodeCard(workspaceAt(fixture.root), "4:4"))
    assert.deepEqual(second, first)
    assert.ok(!first.join("\n").includes(fixture.root), "the card prints no absolute path")
    assert.deepEqual(nodeCard(workspaceAt(fixture.root), "4:4"), nodeCard(workspace, "4:4"))
  } finally {
    fixture.dispose()
  }
})

// A clean checkout renders the deterministic card; the gitignored `.figma/`
// exports a laptop has pulled only add to it, and the ceiling covers both.
test("the local exports add to the card and the ceiling covers both", () => {
  const fixture = fixtureTree(
    {
      "src/catalog/figma/inventory.json": {
        schemaVersion: 2,
        fileKey: "file",
        syncedAt: "2026-01-02T00:00:00Z",
        components: [
          {
            nodeId: "4:4",
            name: "Widget",
            type: "COMPONENT",
            pageId: "1:1",
            pageName: "• Components",
          },
        ],
      },
      "src/catalog/figma/registry.json": { entries: {}, bulkRules: [] },
      "src/catalog/figma/device-policy.json": policy,
    },
    "node-card-budget-",
  )
  try {
    const expected = [
      "node       4:4 · Widget",
      "page       • Components",
      "status     (no registry entry)",
      "target     (no target)",
      "story      (no story declared)",
      "devices    (no device declared)",
      "cases      (no parity case)",
      "rules      no rule targets this node",
      "comments   (no snapshot: run figma comments --refresh)",
      "requests   none",
      "delta      (no live snapshot: run figma export to compare)",
      "verdict    no check names this node",
      "evidence   (no evidence: run figma evidence)",
      "note       (no registry note)",
      "detail     (no detail written: figma brief --node <id> --card)",
    ].join("\n")
    const workspace = workspaceAt(fixture.root)
    const gates = readNodeCardGates(workspace)
    const card = (local) =>
      formatNodeCard(buildNodeCard(workspace, "4:4", { local, gates })).join("\n")
    const clean = card(false)
    assert.equal(clean, expected)
    assert.ok(
      Buffer.byteLength(clean, "utf8") <= CARD_BUDGET,
      `the card is ${Buffer.byteLength(clean, "utf8")} bytes`,
    )
    assert.equal(card(true), clean, "no exports pulled, nothing to add")

    fs.mkdirSync(path.join(fixture.root, ".figma"), { recursive: true })
    fs.writeFileSync(
      path.join(fixture.root, ".figma", "comments.json"),
      JSON.stringify({
        fileKey: "file",
        version: "1",
        fetchedAt: "2026-01-02T00:00:00Z",
        threads: [
          {
            id: "t1",
            nodeId: "4:4",
            author: "designer",
            createdAt: "2026-01-02T00:00:00Z",
            resolvedAt: null,
            message: "Align the icon with the label.",
            replies: [],
          },
        ],
      }),
    )
    fs.writeFileSync(
      path.join(fixture.root, ".figma", "live-rest.json"),
      JSON.stringify({ nodes: {}, meta: { components: [], component_sets: [] } }),
    )
    const local = card(true)
    assert.ok(
      Buffer.byteLength(local, "utf8") > Buffer.byteLength(clean, "utf8"),
      `the local card is ${Buffer.byteLength(local, "utf8")} bytes`,
    )
    assert.ok(
      Buffer.byteLength(local, "utf8") <= CARD_BUDGET,
      `the local card is ${Buffer.byteLength(local, "utf8")} bytes`,
    )
  } finally {
    fixture.dispose()
  }
})

function withLocal(fixture, files) {
  fs.mkdirSync(path.join(fixture.root, ".figma"), { recursive: true })
  for (const [name, value] of Object.entries(files)) {
    fs.writeFileSync(path.join(fixture.root, ".figma", name), JSON.stringify(value))
  }
}

const thread = (id, nodeId, message, extra = {}) => ({
  id,
  nodeId,
  author: "designer",
  createdAt: "2026-01-02T00:00:00Z",
  resolvedAt: null,
  message,
  replies: [],
  ...extra,
})

const commentsSnapshot = (...threads) => ({
  fileKey: "file",
  version: "1",
  fetchedAt: "2026-01-02T00:00:00Z",
  threads,
})

// The ledger schema asks a reviewed card for its English title and a summary,
// and each disposition for its own field: the factory fills every one so a test
// varies only the disposition it is about.
const oneRule = (cardId, disposition, extra = {}) => ({
  schemaVersion: 1,
  fileKey: "file",
  cards: {
    [cardId]: {
      pageId: "1:1",
      page: "• Components",
      container: "4:9",
      section: "Consolidate",
      status: "Ok!",
      title: "Larghezza",
      titleEn: "Width",
      summary: "The widget fills its container.",
      sourceHash: "0123456789abcdef",
      targets: ["4:4"],
      scope: "component",
      disposition,
      guide: "apps/storybook/src/guides/widget.md",
      reviewedAt: "2026-01-02",
      reason: "Reviewed and set aside.",
      request: "docs/design-requests/2026-01-02-widget-width.md",
      duplicateOf: "I4:4;4:8",
      removedAt: "2026-01-02",
      ...extra,
    },
  },
})

// A thread is pinned to whatever the designer drew it on — the set, a variant,
// the page — so the card reads each one against the component that owns the
// anchor. Resolving the anchor as a node of the inventory threw for every
// variant and page thread, which is most of them.
test("a thread is answered by the component that owns its anchor", () => {
  const fixture = catalogue()
  try {
    withLocal(fixture, {
      "comments.json": commentsSnapshot(
        thread("t1", "4:4", "The label and the icon are not aligned."),
        thread("t2", "4:5", "At 320 the label wraps.", {
          replies: [
            { id: "t2r", author: "dev", createdAt: "2026-01-03T00:00:00Z", message: "Fixed." },
          ],
        }),
        thread("t3", "1:1", "This page needs a name."),
      ),
    })
    const card = nodeCard(workspaceAt(fixture.root), "4:4")
    // The recorded card on 4:4 answers the set and its variant; the page anchor
    // belongs to no component, so it stays with the design owner.
    assert.equal(card.comments.open, 3)
    assert.equal(card.comments.answeredBySource, 2)
    assert.equal(card.comments.needsDesignRequest, 1)
    assert.deepEqual(
      card.comments.threads.map((entry) => [entry.anchor, entry.replies]),
      [
        ["4:4", 0],
        ["4:5", 1],
        ["1:1", 0],
      ],
    )
    const text = formatNodeCard(card).join("\n")
    assert.match(text, /^comments {3}3 open · answered by source 2 · needs design request 1 · /m)
    assert.match(text, /4:5 designer 2026-01-02T00:00:00Z: At 320 the label wraps\. \(\+1\)/)
    assert.match(text, /1:1 designer 2026-01-02T00:00:00Z: This page needs a name\./)
  } finally {
    fixture.dispose()
  }
})

// A count of "answered" threads is only worth printing if it means answered:
// a deferred, conflicting, duplicated or out-of-scope card is a decision about
// the point, and a pending one has not been read yet.
test("only an answering disposition settles a thread", () => {
  const answers = {
    imported: 1,
    recorded: 1,
    deferred: 0,
    conflict: 0,
    "out-of-scope": 0,
    pending: 0,
  }
  for (const [disposition, answered] of Object.entries(answers)) {
    const fixture = catalogue({
      "src/catalog/figma/rules.json": oneRule("I4:4;4:9", disposition, {
        guide: "apps/storybook/src/guides/widget.md",
      }),
    })
    try {
      withLocal(fixture, {
        "comments.json": commentsSnapshot(thread("t1", "4:4", "Align the icon with the label.")),
      })
      const card = nodeCard(workspaceAt(fixture.root), "4:4")
      assert.equal(card.comments.answeredBySource, answered, `disposition ${disposition}`)
      assert.equal(card.comments.needsDesignRequest, 1 - answered, `disposition ${disposition}`)
    } finally {
      fixture.dispose()
    }
  }
})

// A variant the live file added has no accepted record, and it is the change a
// session most needs to see: scoping the delta to the accepted ids hid exactly
// those additions.
test("a variant the live file added is part of the delta", () => {
  const live = {
    fileKey: "file",
    components: [
      {
        nodeId: "4:4",
        name: "Widget",
        type: "COMPONENT_SET",
        pageId: "1:1",
        pageName: "• Components",
        properties: inventory.components[0].properties,
        variants: [
          inventory.components[0].variants[0],
          inventory.components[0].variants[1],
          {
            nodeId: "4:7",
            name: "Device=Tablet",
            device: "tablet",
            box: { width: 768, height: 40 },
            designFingerprint: "f".repeat(64),
          },
        ],
      },
    ],
  }
  const fixture = catalogue()
  try {
    withLocal(fixture, { "live-rest.json": live })
    const card = nodeCard(workspaceAt(fixture.root), "4:4")
    assert.deepEqual(card.delta, {
      variants: [{ nodeId: "4:7", class: "added" }],
      changed: ["variants"],
    })
    assert.match(formatNodeCard(card).join("\n"), /^delta +4:7 added · variants$/m)
  } finally {
    fixture.dispose()
  }
})

// A component without variants pins its own PNG, so its own fingerprint is the
// one the manifest carries. Indexing only the variants reported that pin stale
// on every read.
test("a component without variants pins its own evidence", () => {
  const component = {
    nodeId: "5:5",
    name: "Spinner",
    type: "COMPONENT",
    pageId: "1:1",
    pageName: "• Components",
    designFingerprint: "e".repeat(64),
  }
  // The committed inventory already carries the Spinner: the case is the
  // component's own design, which is what the manifest pins for it.
  const withSpinner = (fingerprint) => ({
    ...inventory,
    components: inventory.components.map((entry) =>
      entry.nodeId === component.nodeId ? { ...component, designFingerprint: fingerprint } : entry,
    ),
  })
  const pin = (designFingerprint) => ({
    ...manifest,
    cases: {
      spinner: {
        png: "references/spinner.png",
        sha256: "f".repeat(64),
        nodeId: "5:5",
        // A component without variants pins itself, so the manifest's variant
        // is the component's own node id.
        variant: "5:5",
        designFingerprint,
        width: 40,
        height: 40,
      },
    },
  })
  const plain = catalogue({
    "src/catalog/figma/inventory.json": withSpinner(component.designFingerprint),
    "docs/figma-parity/manifest.json": pin(component.designFingerprint),
  })
  try {
    const card = nodeCard(workspaceAt(plain.root), "5:5")
    assert.deepEqual(card.evidence, [
      { path: "docs/figma-parity/references/spinner.png", stale: false },
    ])
    assert.match(
      formatNodeCard(card).join("\n"),
      /^evidence +docs\/figma-parity\/references\/spinner\.png$/m,
    )
  } finally {
    plain.dispose()
  }

  const drifted = catalogue({
    "src/catalog/figma/inventory.json": withSpinner(component.designFingerprint),
    "docs/figma-parity/manifest.json": pin("0".repeat(64)),
  })
  try {
    assert.deepEqual(nodeCard(workspaceAt(drifted.root), "5:5").evidence, [
      { path: "docs/figma-parity/references/spinner.png", stale: true },
    ])
  } finally {
    drifted.dispose()
  }
})

// The registry's own read is the gate that catches a node naming a module, a
// story or an export that does not exist. It is hermetic — the committed
// inventory and registry, never the live file — so the card stays cheap.
test("a registry diagnostic naming the node reaches the verdict", () => {
  const fixture = catalogue({
    "src/pagopa-ui.ts": "export const Widget = 1\n",
    "src/components/widget.tsx": "export const Other = 1\n",
    "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "file"\n',
    "src/catalog/figma/registry.json": {
      entries: {
        "4:4": {
          status: "implemented",
          target: { module: "src/components/widget.tsx", export: "Widget" },
        },
      },
      bulkRules: [],
    },
  })
  try {
    const card = nodeCard(workspaceAt(fixture.root), "4:4")
    assert.ok(
      card.verdict.some((line) =>
        line.startsWith(
          'catalogue registry 4:4: export "Widget" not found in src/components/widget.tsx',
        ),
      ),
      card.verdict.join("\n"),
    )
    assert.ok(
      card.verdict.some((line) =>
        line.startsWith("catalogue registry 4:4: implemented requires target.story"),
      ),
      card.verdict.join("\n"),
    )
  } finally {
    fixture.dispose()
  }
})

// A rule diagnostic names the *card*, and a card id does not always carry the
// node id it targets, so matching node ids alone dropped the failures of the
// node's own rules.
test("a rule diagnostic that names the card id reaches the verdict", () => {
  const fixture = catalogue({
    "src/catalog/figma/rules.json": {
      schemaVersion: 1,
      fileKey: "file",
      cards: {
        ...oneRule("I4:9;4:2", "imported", {
          guide: "apps/storybook/src/guides/missing.md",
        }).cards,
        // Another card, on a node this one does not own: its failure stays out.
        ...oneRule("I7:7;7:1", "recorded", { targets: ["9:9"] }).cards,
      },
    },
  })
  try {
    const card = nodeCard(workspaceAt(fixture.root), "4:4")
    assert.ok(
      card.verdict.some((line) =>
        line.startsWith(
          "rules I4:9;4:2: guide apps/storybook/src/guides/missing.md does not exist",
        ),
      ),
      card.verdict.join("\n"),
    )
    assert.ok(
      !card.verdict.some((line) => line.includes("I7:7;7:1")),
      "a rule on another node stays out of this verdict",
    )
  } finally {
    fixture.dispose()
  }
})

// The device line states the width the source declares: the variant's own box,
// else the width a case captured, else the policy's canonical width, which is a
// default rather than a measurement of this component.
test("the device line reads the source width before the canonical one", () => {
  const widget = inventory.components[0]
  const fixture = catalogue({
    "src/catalog/figma/inventory.json": {
      ...inventory,
      components: [
        {
          ...widget,
          variants: [
            { ...widget.variants[0], box: { width: 360, height: 40 } },
            { ...widget.variants[1], box: undefined },
          ],
        },
        inventory.components[1],
      ],
    },
    "src/catalog/figma/parity-cases.json": [
      { ...cases[0], width: 320, viewport: 320 },
      { ...cases[1], width: 1280, viewport: 1280 },
    ],
  })
  try {
    const card = nodeCard(workspaceAt(fixture.root), "4:4")
    assert.deepEqual(card.devices, [
      { device: "mobile", width: 360 },
      { device: "desktop", width: 1280 },
    ])
    assert.match(formatNodeCard(card).join("\n"), /^devices {4}mobile 360 · desktop 1280$/m)
  } finally {
    fixture.dispose()
  }

  // With no capture and no box, the policy's canonical width is all there is.
  const bare = catalogue({
    "src/catalog/figma/inventory.json": {
      ...inventory,
      components: [
        { ...widget, variants: widget.variants.map(({ box: _box, ...rest }) => rest) },
        inventory.components[1],
      ],
    },
    "src/catalog/figma/parity-cases.json": [],
  })
  try {
    assert.deepEqual(nodeCard(workspaceAt(bare.root), "4:4").devices, [
      { device: "mobile", width: 320 },
      { device: "desktop", width: 1200 },
    ])
  } finally {
    bare.dispose()
  }
})

// The ceiling is an acceptance criterion on the committed inventory, not only
// on a fixture and not only on the node the budget check happens to pick.
test("every node of the committed inventory fits the ceiling", { timeout: 300_000 }, () => {
  const workspace = workspaceAt(DESIGN_SYSTEM)
  const inventory = readInventory(committedFile("inventory", workspace.root))
  const nodes = inventory.components.flatMap((component) => [
    component.nodeId,
    ...(component.variants ?? []).map((variant) => variant.nodeId),
  ])
  assert.ok(nodes.length > 0)
  const gates = readNodeCardGates(workspace)
  const oversized = []
  for (const node of nodes) {
    const bytes = Buffer.byteLength(
      formatNodeCard(buildNodeCard(workspace, node, { local: false, gates })).join("\n"),
      "utf8",
    )
    if (bytes > CARD_BUDGET) oversized.push(`${node}: ${bytes} bytes`)
  }
  assert.deepEqual(oversized, [])
})

// The gate that guards the registry used to read a registry it could not load
// as "no problems": the loader returned null for any failure and the gate
// mapped that null to []. An unreadable committed record is a gate line.
test("an unreadable registry is a gate line, not an absence of problems", () => {
  const corrupt = catalogue({ "src/catalog/figma/registry.json": { entries: { "4:4": {} } } })
  const missing = catalogue({ "src/catalog/figma/registry.json": null })
  try {
    for (const fixture of [corrupt, missing]) {
      const gates = readNodeCardGates(workspaceAt(fixture.root)).catalogue
      assert.equal(gates.length, 1)
      assert.match(gates[0], /^registry unreadable: .*registry\.json/)
    }
  } finally {
    corrupt.dispose()
    missing.dispose()
  }
})
