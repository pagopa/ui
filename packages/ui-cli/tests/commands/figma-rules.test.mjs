import assert from "node:assert/strict"
import { test } from "node:test"
import { fixtureTree, runCli } from "../helpers/cli.mjs"
import { sourceHash } from "../../src/figma/rules.ts"

const component = {
  nodeId: "4:4",
  name: "Button",
  type: "COMPONENT",
  pageId: "1:1",
  pageName: "Page",
}
const card = {
  nodeId: "I1:2;3:3",
  title: "Spacing",
  body: "Keep 8px",
  status: "Ok!",
  section: "Consolidate",
  placeholder: false,
}
const ledgerCard = {
  pageId: "1:1",
  page: "Page",
  container: "1:2",
  section: "Consolidate",
  status: "Ok!",
  title: "Spacing",
  sourceHash: sourceHash(card.title, card.body),
  targets: ["4:4"],
  scope: "component",
  disposition: "pending",
  provisionalTargets: false,
}
const files = {
  "src/catalog/figma/inventory.json": {
    fileKey: "file",
    syncedAt: "2026-01-01",
    components: [component],
  },
  "src/catalog/figma/registry.json": {
    entries: {
      "4:4": {
        status: "pending",
        target: {
          module: "src/button.tsx",
          export: "Button",
          story: "Button",
          storyExports: ["Default"],
        },
      },
    },
  },
  "src/catalog/figma/rules.json": {
    schemaVersion: 1,
    fileKey: "file",
    cards: { "I1:2;3:3": ledgerCard },
  },
  ".figma/rules.json": {
    fileKey: "file",
    version: "42",
    fetchedAt: "2026-01-01",
    pages: [{ pageId: "1:1", pageName: "Page", containers: [{ nodeId: "1:2", cards: [card] }] }],
  },
  ".figma/comments.json": {
    fileKey: "file",
    version: "42",
    fetchedAt: "2026-01-01",
    threads: [
      {
        id: "c",
        nodeId: "4:4",
        author: "Designer",
        createdAt: "2026-01-01",
        resolvedAt: null,
        message: "Question",
        replies: [],
      },
    ],
  },
  "docs/design-requests/request.md": "Node 4:4 needs a decision.",
}

async function usingFixture(run) {
  const fixture = fixtureTree(files, "rules-contract-")
  try {
    await run(fixture.root)
  } finally {
    fixture.dispose()
  }
}

test("brief preserves target, comments and design requests", async () =>
  usingFixture(async (root) => {
    const result = await runCli(["figma", "brief", "--node", "4:4", "--json"], { root })
    assert.equal(result.status, 0, result.stderr)
    const brief = JSON.parse(result.stdout)
    assert.equal(brief.target.story, "Button")
    assert.deepEqual(brief.designRequests, ["docs/design-requests/request.md"])
    assert.equal(brief.openComments[0].message, "Question")
  }))

test("comments and rule views keep their JSON contracts", async () =>
  usingFixture(async (root) => {
    const comments = await runCli(["figma", "comments", "--node", "4:4", "--open", "--json"], {
      root,
    })
    assert.equal(comments.status, 0, comments.stderr)
    assert.equal(JSON.parse(comments.stdout).threads.length, 1)
    const node = await runCli(["figma", "rules", "node", "4:4", "--json"], { root })
    assert.equal(JSON.parse(node.stdout)[0].disposition, "pending")
    const show = await runCli(["figma", "rules", "show", "I1:2;3:3", "--json"], { root })
    assert.equal(JSON.parse(show.stdout).card.title, "Spacing")
    const plan = await runCli(["figma", "rules", "plan", "--json"], { root })
    assert.deepEqual(JSON.parse(plan.stdout).new, [])
  }))

test("rules strict gate can be relaxed without suppressing its counts", async () =>
  usingFixture(async (root) => {
    const strict = await runCli(["check", "rules", "--json"], { root })
    const relaxed = await runCli(["check", "rules", "--no-strict", "--json"], { root })
    assert.equal(strict.status, 1, strict.stderr)
    const reported = JSON.parse(strict.stdout).errors.join("\n")
    assert.match(reported, /pending rule on Spacing/)
    assert.match(reported, /pnpm nx run pagopa-ui-cli:check:rules/)
    assert.equal(relaxed.status, 0, relaxed.stderr)
    assert.equal(JSON.parse(relaxed.stdout).counts.pending, 1)
  }))
