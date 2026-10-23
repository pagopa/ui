import assert from "node:assert/strict"
import { test } from "node:test"

import { RulesLedgerSchema, RulesSnapshotSchema } from "../../src/schemas/rules.ts"
import {
  componentRulesFirst,
  extractContainer,
  hasComponentRules,
  plan,
  sourceHash,
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
