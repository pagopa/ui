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
    assert.deepEqual(JSON.parse(result.stdout).queue.implementationOrder, ["4:4"])
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
    assert.notEqual(result.status, 2, result.stderr)
    assert.match(result.stdout, /would update/)
    assert.equal(
      JSON.parse(
        await (
          await import("node:fs/promises")
        ).readFile(`${fixture.root}/src/catalog/figma/page-surface.json`, "utf8"),
      ).pages.length,
      0,
    )
  } finally {
    fixture.dispose()
  }
})
