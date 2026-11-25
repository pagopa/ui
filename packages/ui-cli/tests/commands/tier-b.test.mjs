import assert from "node:assert/strict"
import { test } from "node:test"
import { fixtureTree, runCli } from "../helpers/cli.mjs"

const pr = {
  number: 12,
  headRefName: "figma-drift/2026-11-08",
  state: "OPEN",
  url: "https://github.com/acme/ui/pull/12",
  body: '```json\n{"implementationOrder":["4:4"]}\n```',
}
const shared = {
  "src/catalog/figma/inventory.json": {
    fileKey: "file",
    syncedAt: "2026-01-01",
    components: [
      { nodeId: "4:4", name: "Button", type: "COMPONENT", pageId: "1:1", pageName: "Page" },
    ],
  },
  "src/catalog/figma/registry.json": { entries: { "4:4": { status: "pending" } }, bulkRules: [] },
}

function ghExternal(calls) {
  return {
    gh: (args) => {
      calls.push(args)
      return args[0] === "pr" && args[1] === "list" ? JSON.stringify([pr]) : JSON.stringify(pr)
    },
    git: () => "",
    pnpm: () => "",
    fetchUrl: async () => "{}",
  }
}

test("figma handoff resolve has an in-process CLI contract", async () => {
  const fixture = fixtureTree(shared, "cli-handoff-resolve-")
  const calls = []
  try {
    const result = await runCli(["figma", "handoff", "resolve", "12", "--json"], {
      root: fixture.root,
      external: ghExternal(calls),
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).headRefName, pr.headRefName)
    assert.equal(calls.length, 1)
  } finally {
    fixture.dispose()
  }
})

test("figma handoff checkout dry-run has an in-process CLI contract", async () => {
  const fixture = fixtureTree(shared, "cli-handoff-checkout-")
  const calls = []
  try {
    const result = await runCli(["figma", "handoff", "checkout", "12", "--dry-run"], {
      root: fixture.root,
      external: ghExternal(calls),
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /git fetch origin figma-drift/)
    assert.equal(calls.length, 1)
  } finally {
    fixture.dispose()
  }
})

test("figma handoff brief has an in-process CLI contract", async () => {
  const fixture = fixtureTree(shared, "cli-handoff-brief-")
  const calls = []
  try {
    const result = await runCli(["figma", "handoff", "brief", "12", "--json"], {
      root: fixture.root,
      external: ghExternal(calls),
    })
    assert.equal(result.status, 0, result.stderr)
    const brief = JSON.parse(result.stdout)
    assert.deepEqual(brief.queue.implementationOrder, ["4:4"])
    // The JSON surface carries the artifact's identity and order, not its bytes.
    assert.deepEqual(brief.delta, {
      source: "body",
      path: null,
      implementationOrder: ["4:4"],
    })
  } finally {
    fixture.dispose()
  }
})

test("figma handoff brief prints past a saved plan it must not read", async () => {
  const fixture = fixtureTree(
    {
      ...shared,
      // The snapshot that made the JSON read die: a catalogue plan beside the
      // queue, in a pull request that carries no artifact of its own.
      ".figma/plan.json": {
        implementationOrder: ["4:4"],
        pending: Array.from({ length: 20_000 }, (_, index) => ({
          nodeId: `9:${index}`,
          note: "x".repeat(250),
        })),
      },
    },
    "cli-handoff-brief-plan-",
  )
  const calls = []
  try {
    const result = await runCli(["figma", "handoff", "brief", "12", "--json"], {
      root: fixture.root,
      external: {
        ...ghExternal(calls),
        gh: (args) => {
          calls.push(args)
          return JSON.stringify({ ...pr, body: "" })
        },
      },
    })
    assert.equal(result.status, 0, result.stderr)
    const brief = JSON.parse(result.stdout)
    assert.equal(brief.delta, null)
    assert.equal(brief.orderSource, "queue")
    assert.deepEqual(brief.queue.implementationOrder, ["4:4"])
    assert.ok(result.stdout.length < 5_000)
  } finally {
    fixture.dispose()
  }
})

test("figma handoff media dry-run has an in-process CLI contract", async () => {
  const fixture = fixtureTree(
    {
      ...shared,
      "src/catalog/figma/parity-cases.json": [
        {
          id: "button-default",
          nodeId: "4:4",
          export: "Button",
          storyId: "button--default",
          width: 320,
        },
      ],
      "packages/pagopa-ui/src/catalog/figma/inventory.json":
        shared["src/catalog/figma/inventory.json"],
      "packages/pagopa-ui/src/catalog/figma/registry.json":
        shared["src/catalog/figma/registry.json"],
      "packages/pagopa-ui/src/catalog/figma/parity-cases.json": [
        {
          id: "button-default",
          nodeId: "4:4",
          export: "Button",
          storyId: "button--default",
          width: 320,
        },
      ],
      "packages/pagopa-ui/src/button.tsx": "after\n",
    },
    "cli-handoff-media-",
  )
  const calls = []
  const external = {
    ...ghExternal(calls),
    git: (args) => {
      calls.push(["git", ...args])
      if (args[0] === "status") return ""
      if (args[0] === "diff") return "packages/pagopa-ui/src/button.tsx\n"
      if (args[0] === "remote") return "git@github.com:acme/ui.git\n"
      if (
        args[0] === "show" &&
        args[1].endsWith(":packages/pagopa-ui/src/catalog/figma/registry.json")
      )
        return JSON.stringify({ entries: { "4:4": { status: "implemented" } } })
      if (
        args[0] === "show" &&
        args[1].endsWith(":packages/pagopa-ui/src/catalog/figma/parity-cases.json")
      )
        return "[]"
      if (args[0] === "show" && args[1] === "base:packages/pagopa-ui/src/button.tsx")
        return "before\n"
      if (args[0] === "show" && args[1] === "HEAD:packages/pagopa-ui/src/button.tsx")
        return "after\n"
      throw new Error(`unexpected git ${args.join(" ")}`)
    },
  }
  try {
    const result = await runCli(
      ["figma", "handoff", "media", "--pr", "12", "--base", "base", "--dry-run"],
      { root: fixture.root, env: { STORYBOOK_URL: "https://storybook.example.test" }, external },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /would attach/)
    assert.equal(
      calls.some((call) => call[0] === "gh" && call[1] === "pr" && call[2] === "comment"),
      false,
    )
  } finally {
    fixture.dispose()
  }
})

test("figma request open dry-run has an in-process CLI contract", async () => {
  const fixture = fixtureTree(
    {
      ...shared,
      "figma-to-code.yaml":
        "design:\n  requests: docs/design-requests\n  owners:\n    - designer\n  preview:\n    url: https://preview.example.test\n",
      "request.json": {
        slug: "focus-ring",
        title: "Focus ring",
        type: "design",
        question: "Focus ring?",
        context: "Context",
        options: [
          { key: "a", label: "A" },
          { key: "b", label: "B" },
        ],
        recommendation: "A",
        ask: "Which?",
        when: "does not block the release",
      },
    },
    "cli-request-open-",
  )
  const calls = []
  try {
    const result = await runCli(
      ["figma", "request", "open", "--input", "request.json", "--dry-run"],
      {
        root: fixture.root,
        external: {
          ...ghExternal(calls),
          gh: () => {
            calls.push("gh")
            return ""
          },
        },
      },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /would open/)
    assert.equal(calls.length, 0)
  } finally {
    fixture.dispose()
  }
})

test("figma request list has an in-process CLI contract", async () => {
  const fixture = fixtureTree(
    { ...shared, "figma-to-code.yaml": "design:\n  requests: docs/design-requests\n" },
    "cli-request-list-",
  )
  const calls = []
  try {
    const result = await runCli(["figma", "request", "list", "--waiting", "--json"], {
      root: fixture.root,
      external: {
        ...ghExternal(calls),
        gh: (args) => {
          calls.push(args)
          return "[]"
        },
      },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), [])
    assert.ok(calls[0].includes("status/needs-answer"))
  } finally {
    fixture.dispose()
  }
})

test("figma surface sync accepts a supplied page tree and supports dry-run", async () => {
  const fixture = fixtureTree(
    {
      ...shared,
      "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "file"\n',
      "src/catalog/figma/page-surface.json": {
        fileKey: "file",
        readAt: "2026-01-01",
        note: "Census.",
        pages: [],
      },
      "page.json": {
        id: "1:1",
        name: "Page",
        type: "CANVAS",
        children: [{ id: "4:4", name: "Button", type: "COMPONENT" }],
      },
    },
    "cli-surface-sync-",
  )
  try {
    const result = await runCli(
      ["figma", "surface", "sync", "--page", "1:1", "--input", "page.json", "--dry-run"],
      { root: fixture.root },
    )
    // The fixture has no component sources, so the catalogue check fails and
    // only the sync output under test is reported: the run exits 1, not 0.
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stdout, /would update/)
    assert.equal(
      JSON.parse(
        await (
          await import("node:fs/promises")
        ).readFile(`${fixture.root}/src/catalog/figma/page-surface.json`, "utf8"),
      ).pages.length,
      0,
    )

    const uncensused = await runCli(
      ["figma", "surface", "sync", "--uncensused", "--input", "page.json", "--dry-run"],
      { root: fixture.root },
    )
    assert.equal(uncensused.status, 1, uncensused.stderr)
    assert.match(uncensused.stdout, /would update: 1:1 Page/)

    const all = await runCli(
      ["figma", "surface", "sync", "--all", "--input", "page.json", "--dry-run"],
      { root: fixture.root },
    )
    assert.equal(all.status, 1, all.stderr)
    assert.match(all.stdout, /would update: 1:1 Page/)

    // One unique explicit page keeps the legacy single-page JSON shape.
    const legacy = await runCli(
      ["figma", "surface", "sync", "--page", "1:1,1:1", "--input", "page.json", "--json"],
      { root: fixture.root },
    )
    assert.equal(legacy.status, 1, legacy.stderr)
    const legacyPlan = JSON.parse(legacy.stdout)
    assert.equal(legacyPlan.page.pageId, "1:1")
    assert.equal("pages" in legacyPlan, false)

    const conflict = await runCli(
      ["figma", "surface", "sync", "--page", "1:1", "--all", "--input", "page.json"],
      { root: fixture.root },
    )
    assert.equal(conflict.status, 2)
    assert.match(conflict.stderr, /choose only one of --page/)
  } finally {
    fixture.dispose()
  }
})

test("figma surface sync reports an empty selection by scope", async () => {
  const fixture = fixtureTree(
    {
      "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "file"\n',
      "src/catalog/figma/inventory.json": {
        fileKey: "file",
        syncedAt: "2026-01-01",
        components: [],
      },
      "src/catalog/figma/registry.json": { entries: {}, bulkRules: [] },
      "src/catalog/figma/page-surface.json": {
        fileKey: "file",
        readAt: "2026-01-01",
        note: "Census.",
        pages: [],
      },
      "page.json": { id: "1:1", name: "Page", type: "CANVAS", children: [] },
    },
    "cli-surface-empty-",
  )
  try {
    const uncensused = await runCli(
      ["figma", "surface", "sync", "--uncensused", "--input", "page.json"],
      { root: fixture.root },
    )
    assert.equal(uncensused.status, 0, uncensused.stderr)
    assert.match(uncensused.stdout, /all published pages are already censused/)

    const all = await runCli(["figma", "surface", "sync", "--all", "--input", "page.json"], {
      root: fixture.root,
    })
    assert.equal(all.status, 0, all.stderr)
    assert.match(all.stdout, /no published or censused pages to refresh/)
    assert.doesNotMatch(all.stdout, /already censused/)

    // The empty plan keeps the multi-page shape, including the loaded surface.
    const json = await runCli(
      ["figma", "surface", "sync", "--all", "--input", "page.json", "--json"],
      { root: fixture.root },
    )
    assert.equal(json.status, 0, json.stderr)
    const plan = JSON.parse(json.stdout)
    assert.deepEqual(plan.pages, [])
    assert.deepEqual(plan.surface, {
      fileKey: "file",
      readAt: "2026-01-01",
      note: "Census.",
      pages: [],
    })
  } finally {
    fixture.dispose()
  }
})
