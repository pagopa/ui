import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnvironment, fixtureTree, workspaceAt } from "../helpers/cli.mjs"
import { RulesLedgerSchema, RulesSnapshotSchema } from "../../src/schemas/rules.ts"
import {
  check,
  componentRulesFirst,
  extractContainer,
  hasComponentRules,
  mark,
  plan,
  readRulesSnapshot,
  refresh,
  sourceHash,
  sync,
} from "../../src/figma/rules.ts"

// The `.Regole` container as Figma exports it: a frame holding two labelled
// section frames, each a list of card instances. The card is a `Frame 5` tree
// whose two leading texts are the title and the body.
function text(value) {
  return { type: "TEXT", name: "Welcome", characters: value }
}

function card(id, title, body, status) {
  return {
    id,
    type: "INSTANCE",
    name: ".Regole",
    children: [
      {
        type: "FRAME",
        name: "Frame 5",
        children: [
          {
            type: "FRAME",
            name: "Frame 12",
            children: [
              {
                type: "FRAME",
                name: "Frame 2",
                children: [text(title), text(body)],
              },
              {
                type: "FRAME",
                name: "Frame 4",
                children: [
                  text("Status"),
                  { type: "FRAME", name: "Frame 1004", children: [text(status)] },
                ],
              },
            ],
          },
          {
            type: "FRAME",
            name: "Frame 1005",
            children: [{ type: "FRAME", name: "Frame 9", children: [text("AUTORE")] }],
          },
        ],
      },
    ],
  }
}

const container = {
  id: "1:2",
  type: "INSTANCE",
  name: ".Regole",
  children: [
    {
      type: "FRAME",
      name: "Regole",
      children: [
        text("Regole componente"),
        {
          type: "FRAME",
          name: "Frame 1011",
          children: [
            {
              type: "FRAME",
              name: "Frame 1012",
              children: [
                text("Consolidate"),
                card("I1:2;3:3", "Spacing between buttons", "Keep 8px between buttons.", "Ok!"),
                card(
                  "I1:2;3:4",
                  "Nome della regola",
                  "Spiegazione della regola a beneficio dei colleghi.",
                  "Ok!",
                ),
              ],
            },
            {
              type: "FRAME",
              name: "Frame 1013",
              children: [
                text("Da commentare"),
                card("I1:2;3:5", "Draft rule", "Still to discuss.", "Da approvare"),
              ],
            },
          ],
        },
      ],
    },
  ],
}

test("extractContainer reads the two sections, the status and the placeholder", () => {
  const extracted = extractContainer(container)
  assert.equal(extracted.nodeId, "1:2")
  assert.equal(extracted.cards.length, 3)
  assert.deepEqual(
    extracted.cards.map((entry) => [entry.nodeId, entry.section, entry.status, entry.placeholder]),
    [
      ["I1:2;3:3", "Consolidate", "Ok!", false],
      ["I1:2;3:4", "Consolidate", "Ok!", true],
      ["I1:2;3:5", "Da commentare", "Da approvare", false],
    ],
  )
})

test("extractContainer keeps a card without a labelled section as unfiled", () => {
  const floating = card("I9:9;1:1", "Loose rule", "No section frame.", "Ok!")
  const extracted = extractContainer({ id: "9:9", type: "INSTANCE", children: [floating] })
  assert.equal(extracted.cards[0].section, null)
})

test("sourceHash ignores whitespace noise but not wording", () => {
  const base = sourceHash("Spacing", "Keep  8px\nbetween buttons.")
  assert.equal(base, sourceHash("Spacing ", "Keep 8px between buttons."))
  assert.notEqual(base, sourceHash("Spacing", "Keep 12px between buttons."))
})

const snapshot = RulesSnapshotSchema.parse({
  fileKey: "file",
  version: "42",
  fetchedAt: "2026-10-24T00:00:00.000Z",
  pages: [
    {
      pageId: "1:1",
      pageName: "Page",
      containers: [
        {
          nodeId: "1:2",
          cards: [
            {
              nodeId: "I1:2;3:3",
              title: "Spacing",
              body: "Keep 8px between buttons.",
              status: "Ok!",
              section: "Consolidate",
              placeholder: false,
            },
          ],
        },
      ],
    },
  ],
})

const pending = {
  pageId: "1:1",
  page: "Page",
  container: "1:2",
  section: "Consolidate",
  status: "Ok!",
  title: "Spacing",
  sourceHash: sourceHash("Spacing", "Keep 8px between buttons."),
  targets: ["4:4"],
  scope: "component",
  disposition: "pending",
  provisionalTargets: false,
}

test("plan reports a card the ledger has not seen, a stale hash and a removed card", () => {
  const empty = RulesLedgerSchema.parse({ schemaVersion: 1, fileKey: "file", cards: {} })
  assert.deepEqual(plan(snapshot, empty).fresh, ["I1:2;3:3"])

  const current = RulesLedgerSchema.parse({
    schemaVersion: 1,
    fileKey: "file",
    cards: { "I1:2;3:3": pending },
  })
  const same = plan(snapshot, current)
  assert.deepEqual([same.fresh, same.stale, same.removed], [[], [], []])

  const changed = RulesLedgerSchema.parse({
    schemaVersion: 1,
    fileKey: "file",
    cards: { "I1:2;3:3": { ...pending, sourceHash: "0000000000000000" } },
  })
  assert.deepEqual(plan(snapshot, changed).stale, ["I1:2;3:3"])

  const missing = RulesLedgerSchema.parse({
    schemaVersion: 1,
    fileKey: "file",
    cards: { "I1:2;9:9": pending },
  })
  assert.deepEqual(plan(snapshot, missing).removed, ["I1:2;9:9"])
})

test("a partial snapshot scopes removal detection and sync to the pages it covers", () => {
  const partialSnapshot = RulesSnapshotSchema.parse({
    ...snapshot,
    partial: true,
  })
  const ledger = RulesLedgerSchema.parse({
    schemaVersion: 1,
    fileKey: "file",
    cards: {
      "I1:2;3:3": pending,
      "I1:2;9:9": { ...pending, pageId: "1:1" },
      "I2:2;8:8": { ...pending, pageId: "2:2", page: "Other page", container: "2:2" },
    },
  })
  const diff = plan(partialSnapshot, ledger)
  assert.deepEqual(diff.removed, ["I1:2;9:9"])
  const removed = sync(ledger, partialSnapshot)
  assert.equal(removed, 1)
  assert.equal(ledger.cards["I1:2;9:9"].disposition, "removed")
  assert.equal(ledger.cards["I2:2;8:8"].disposition, "pending")
})

// A scoped refresh reads one page; the pages it did not read are unknown, not
// empty. The snapshot says so until a full refresh covers the file.
test("a scoped refresh with no prior snapshot stays partial, and a full refresh clears it", async () => {
  const canvas = (id, name, containerId) => ({
    id,
    type: "CANVAS",
    name,
    children: [{ id: containerId, type: "INSTANCE", name: ".Regole", children: [] }],
  })
  const pages = {
    "1:1": canvas("1:1", "Page", "1:2"),
    "2:2": canvas("2:2", "Other page", "2:3"),
  }
  const containers = {
    "1:2": {
      id: "1:2",
      type: "INSTANCE",
      name: ".Regole",
      children: [card("I1:2;3:3", "Spacing", "Keep 8px.", "Ok!")],
    },
    "2:3": {
      id: "2:3",
      type: "INSTANCE",
      name: ".Regole",
      children: [card("I2:3;4:4", "Radius", "Round the corners.", "Ok!")],
    },
  }
  const tree = fixtureTree(
    { "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "fixture"\n' },
    "pagopa-rules-refresh-",
  )
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = new URL(input)
    if (url.pathname.endsWith("/nodes")) {
      const depth = Number(url.searchParams.get("depth"))
      const ids = url.searchParams.get("ids").split(",")
      const documents = Object.fromEntries(
        ids.map((id) => [id, { document: depth <= 2 ? pages[id] : containers[id] }]),
      )
      return Response.json({ nodes: documents })
    }
    return Response.json({
      version: "7",
      document: { id: "0:0", name: "Fixture", children: [pages["1:1"], pages["2:2"]] },
    })
  }
  try {
    const workspace = workspaceAt(tree.root)
    const first = await refresh(workspace, "fixture-token", { pageId: "1:1" })
    assert.equal(first.partial, true)
    assert.deepEqual(
      first.pages.map((page) => [page.pageId, page.containers[0].cards[0].nodeId]),
      [["1:1", "I1:2;3:3"]],
    )
    assert.equal(readRulesSnapshot(tree.root).partial, true)

    // A second scope merges into the first: the unread page is preserved and
    // the snapshot stays partial.
    const second = await refresh(workspace, "fixture-token", { pageId: "2:2" })
    assert.equal(second.partial, true)
    assert.deepEqual(
      second.pages.map((page) => page.pageId),
      ["1:1", "2:2"],
    )

    // A full refresh covers every page and drops the flag.
    const full = await refresh(workspace, "fixture-token", {})
    assert.equal(full.partial, undefined)
    assert.deepEqual(
      full.pages.map((page) => page.pageId),
      ["1:1", "2:2"],
    )
    assert.deepEqual(
      readRulesSnapshot(tree.root).pages.map((page) => page.pageId),
      ["1:1", "2:2"],
    )
  } finally {
    globalThis.fetch = originalFetch
    tree.dispose()
  }
})

// `refresh` rewrites the snapshot; only `mark` re-stamps the ledger's
// sourceHash, which is what the gate compares. The diagnostic has to say so, or
// following it leaves the same failure in place.
test("a stale card points at show and mark, not refresh", () => {
  const tree = fixtureTree(
    {
      "src/catalog/figma/inventory.json": {
        fileKey: "file",
        syncedAt: "2026-10-21",
        components: [
          {
            nodeId: "4:4",
            name: "Button",
            type: "COMPONENT",
            pageId: "1:1",
            pageName: "Page",
          },
        ],
      },
      "apps/storybook/src/guides/keep.md": "# Placeholder\n",
    },
    "pagopa-rules-check-",
  )
  try {
    const ledger = RulesLedgerSchema.parse({
      schemaVersion: 1,
      fileKey: "file",
      cards: { "I1:2;3:3": { ...pending, sourceHash: "0000000000000000" } },
    })
    const informational = check(ledger, snapshot, tree.root, tree.root, false)
    const stale = informational.warnings.find(
      (warning) => warning.includes("I1:2;3:3") && warning.includes("stale"),
    )
    assert.ok(stale, "the report names the stale card")
    assert.deepEqual(informational.errors, [], "drift alone is not a failure")
    assert.match(stale, /`pnpm ui-cli figma rules show 'I1:2;3:3'`/)
    assert.match(stale, /`pnpm ui-cli figma rules mark 'I1:2;3:3' --disposition <disposition>`/)
    assert.doesNotMatch(stale, /rules refresh/)
    // A session that wants the card settled before it commits asks for the gate.
    const strict = check(ledger, snapshot, tree.root, tree.root, true)
    assert.ok(strict.errors.includes(stale), "strict turns the report back into a gate")
  } finally {
    tree.dispose()
  }
})

const block = [
  "<!-- component-rules:start -->",
  "## Component Rules",
  "",
  "- Keep 8px between actions.",
  "<!-- component-rules:end -->",
  "",
  "The rest of the guide.",
].join("\n")

test("the component-rules block is delimited by its markers", () => {
  assert.equal(hasComponentRules(block), true)
  assert.equal(hasComponentRules(block.replace("<!-- component-rules:end -->", "")), false)
  assert.equal(hasComponentRules("## Component Rules\n\n- No marker."), false)
})

test("the component-rules block opens the guide", () => {
  assert.equal(componentRulesFirst(block), true)
  assert.equal(componentRulesFirst(`\n\n${block}`), true)
  assert.equal(componentRulesFirst(`Intro first.\n\n${block}`), false)
})

// `mark` spreads the card it finds, so an imported card keeps its guide when
// it moves on. The new disposition does not need that guide, and nothing can
// clear it, so a guide deleted or stripped of its block must not block the move.
test("re-marking an imported card as recorded does not revalidate its guide", () => {
  const guide = "apps/storybook/src/guides/button.md"
  for (const files of [{}, { [guide]: "# Button\n" }]) {
    const tree = fixtureTree(files, "pagopa-rules-mark-")
    try {
      const ledger = RulesLedgerSchema.parse({
        schemaVersion: 1,
        fileKey: "file",
        cards: {
          "I1:2;3:3": {
            ...pending,
            titleEn: "Spacing",
            summary: "Keep 8px between buttons.",
            disposition: "imported",
            guide,
            reviewedAt: "2026-10-20",
          },
        },
      })
      const marked = mark(ledger, snapshot, tree.root, tree.root, {
        cardId: "I1:2;3:3",
        disposition: "recorded",
      })
      assert.equal(marked.disposition, "recorded")
      assert.equal(marked.guide, guide)
    } finally {
      tree.dispose()
    }
  }
})

const cli = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

// A fixture root holding the two files `--plan` reads: the live snapshot and
// the committed ledger. No token and no network, like the drift job after its
// refresh.
function runPlan({ ledger }) {
  const tree = fixtureTree({}, "pagopa-rules-plan-")
  const root = tree.root
  try {
    const files = [
      [".figma/rules.json", snapshot],
      ["src/catalog/figma/rules.json", ledger],
    ]
    for (const [file, value] of files) {
      const target = path.join(root, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, JSON.stringify(value))
    }
    return spawnSync(process.execPath, [cli, "figma", "rules", "plan"], {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnvironment(root),
    })
  } finally {
    tree.dispose()
  }
}

function runRulesCheck(ledger, flags = []) {
  const tree = fixtureTree(
    {
      ".figma/rules.json": snapshot,
      "src/catalog/figma/rules.json": ledger,
      "src/catalog/figma/inventory.json": {
        fileKey: "file",
        syncedAt: "2026-10-21",
        components: [
          { nodeId: "4:4", name: "Button", type: "COMPONENT", pageId: "1:1", pageName: "Page" },
        ],
      },
    },
    "pagopa-rules-check-cli-",
  )
  try {
    return spawnSync(process.execPath, [cli, "check", "rules", ...flags], {
      cwd: tree.root,
      encoding: "utf8",
      env: fixtureEnvironment(tree.root),
    })
  } finally {
    tree.dispose()
  }
}

// `.Regole` drift is information: the green chain reports it and moves on, and
// only the session that asks for the gate makes it fail.
test("the rules check reports drift and exits 0", () => {
  const behind = RulesLedgerSchema.parse({
    schemaVersion: 1,
    fileKey: "file",
    cards: {
      "I1:2;3:3": { ...pending, sourceHash: "0000000000000000" },
      "I1:2;9:9": pending,
    },
  })
  const result = runRulesCheck(behind)
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stderr, /I1:2;3:3: source changed since the review \(stale\)/)
  assert.match(result.stderr, /I1:2;9:9: card disappeared from Figma/)
  assert.equal(runRulesCheck(behind, ["--strict"]).status, 1)
})

test("rules --plan reports a new card and exits 0", () => {
  const empty = RulesLedgerSchema.parse({ schemaVersion: 1, fileKey: "file", cards: {} })
  const result = runPlan({ ledger: empty })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /cards: 1 new · 0 stale · 0 removed/)
  assert.match(result.stdout, /  new +I1:2;3:3 Spacing/)
})

test("rules --plan reports stale and removed cards and still exits 0", () => {
  // The drift job runs this command and must stay green, so a ledger behind by
  // any kind of card is a report and never a failure.
  const behind = RulesLedgerSchema.parse({
    schemaVersion: 1,
    fileKey: "file",
    cards: {
      "I1:2;3:3": { ...pending, sourceHash: "0000000000000000" },
      "I1:2;9:9": pending,
    },
  })
  const result = runPlan({ ledger: behind })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /cards: 0 new · 1 stale · 1 removed/)
  assert.match(result.stdout, /  stale I1:2;3:3 Spacing/)
  assert.match(result.stdout, /  removed I1:2;9:9 Spacing/)
})
