// The node card: one bounded record per node, rendered as text and as JSON.
// The seams under test are the card's own output — the record `buildNodeCard`
// returns, the text `formatNodeCard` renders and the bytes the budget check
// measures — plus the `figma brief --card` command contract. Nothing here
// reaches inside the builder: a refactor that keeps the rendered card identical
// must keep these tests green.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { CONTEXT_BUDGET_LIMITS, measureContextBudget } from "../../src/checks/context-budget.ts"
import { buildNodeCard, formatNodeCard } from "../../src/figma/card.ts"
import { readInventory } from "../../src/figma/brief.ts"
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

function cardLines(fixture) {
  return formatNodeCard(buildNodeCard(workspaceAt(fixture.root), "4:4"))
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
      "rules      2 (1 pending) · I4:4;4:9 recorded · I4:4;4:10 pending · guide apps/storybook/src/guides/widget.md",
      "comments   (no snapshot: run figma comments --refresh)",
      "requests   docs/design-requests/2026-01-02-widget-width.md",
      "delta      (no live snapshot: figma pull to compare)",
      "verdict    devices desktop has no reviewed case",
      "evidence   docs/figma-parity/references/widget-mobile.png",
      "note       Reviewed 2026-01-02: one composition at every device.",
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
    assert.equal(text.stdout.trimEnd(), cardLines(fixture).join("\n"))

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
    assert.deepEqual(formatNodeCard(buildNodeCard(workspaceAt(fixture.root), "5:5")), [
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
      "delta      (no live snapshot: figma pull to compare)",
      "verdict    no check names this node",
      "evidence   (no evidence: run figma evidence)",
      "note       (no registry note)",
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
    const lines = formatNodeCard(buildNodeCard(workspaceAt(fixture.root), "4:4"))
    const text = lines.join("\n")
    assert.ok(Buffer.byteLength(text, "utf8") <= 1536, `card is ${Buffer.byteLength(text)} bytes`)
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
    const first = formatNodeCard(buildNodeCard(workspace, "4:4"))
    const second = formatNodeCard(buildNodeCard(workspaceAt(fixture.root), "4:4"))
    assert.deepEqual(second, first)
    assert.ok(!first.join("\n").includes(fixture.root), "the card prints no absolute path")
    assert.deepEqual(
      buildNodeCard(workspaceAt(fixture.root), "4:4"),
      buildNodeCard(workspaceAt(fixture.root), "4:4"),
    )
  } finally {
    fixture.dispose()
  }
})

// The budget must measure the card, and must measure it as a clean checkout
// renders it: `.figma/` holds gitignored exports, so a laptop that has run
// `figma pull` or `figma comments --refresh` must measure the same bytes as CI.
test("the budget measures the card and ignores the gitignored exports", () => {
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
      "delta      (no live snapshot: figma pull to compare)",
      "verdict    no check names this node",
      "evidence   (no evidence: run figma evidence)",
      "note       (no registry note)",
    ].join("\n")
    const card = (root) => {
      const entry = measureContextBudget(workspaceAt(root), { routes: [] }).entries.find(
        (candidate) => candidate.kind === "card",
      )
      return entry.bytes
    }
    const clean = card(fixture.root)
    assert.equal(clean, Buffer.byteLength(expected, "utf8"))
    assert.ok(clean <= 1536, `the measured card is ${clean} bytes`)

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
      JSON.stringify({ nodes: { "4:4": { name: "Widget" } } }),
    )
    assert.equal(card(fixture.root), clean)
  } finally {
    fixture.dispose()
  }
})

// The ceiling is an acceptance criterion on the committed inventory, not only
// on a fixture and not only on the node the budget check happens to pick.
test("every node of the committed inventory fits the ceiling", { timeout: 300_000 }, () => {
  const workspace = workspaceAt(DESIGN_SYSTEM)
  const inventory = readInventory(workspace)
  const nodes = inventory.components.flatMap((component) => [
    component.nodeId,
    ...(component.variants ?? []).map((variant) => variant.nodeId),
  ])
  assert.ok(nodes.length > 0)
  const oversized = []
  for (const node of nodes) {
    const bytes = Buffer.byteLength(
      formatNodeCard(buildNodeCard(workspace, node, { local: false })).join("\n"),
      "utf8",
    )
    if (bytes > CONTEXT_BUDGET_LIMITS.card) oversized.push(`${node}: ${bytes} bytes`)
  }
  assert.deepEqual(oversized, [])
})
