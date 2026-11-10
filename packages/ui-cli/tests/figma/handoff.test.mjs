import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveHandoff, checkoutHandoff, handoffBrief } from "../../src/figma/handoff.ts"
import { createHandoffMedia } from "../../src/figma/handoff-media.ts"
import { fixtureTree, workspaceAt } from "../helpers/cli.mjs"
import fs from "node:fs"
import path from "node:path"

const openPr = {
  number: 12,
  headRefName: "figma-drift/2026-11-08",
  state: "OPEN",
  url: "https://github.com/acme/ui/pull/12",
  body: "",
}

const mediaFiles = {
  "src/catalog/figma/inventory.json": {
    fileKey: "file",
    syncedAt: "2026-01-01",
    components: [
      { nodeId: "4:4", name: "Button", type: "COMPONENT", pageId: "1:1", pageName: "Page" },
    ],
  },
  "src/catalog/figma/registry.json": {
    entries: {
      "4:4": {
        status: "implemented",
        note: "Reviewed render.",
        target: {
          module: "src/button.tsx",
          export: "Button",
          story: "apps/storybook/src/Button.stories.tsx",
          storyExports: ["Default"],
        },
      },
    },
    bulkRules: [],
  },
  "src/catalog/figma/parity-cases.json": [
    {
      id: "button-default",
      nodeId: "4:4",
      export: "Button",
      storyId: "button--default",
      width: 320,
      viewport: 320,
      height: 900,
      root: "#storybook-root",
    },
  ],
  "packages/pagopa-ui/src/catalog/figma/inventory.json": {
    fileKey: "file",
    syncedAt: "2026-01-01",
    components: [
      { nodeId: "4:4", name: "Button", type: "COMPONENT", pageId: "1:1", pageName: "Page" },
    ],
  },
  "packages/pagopa-ui/src/catalog/figma/registry.json": {
    entries: {
      "4:4": {
        status: "implemented",
        note: "Reviewed render.",
        target: {
          module: "src/button.tsx",
          export: "Button",
          story: "apps/storybook/src/Button.stories.tsx",
          storyExports: ["Default"],
        },
      },
    },
    bulkRules: [],
  },
  "packages/pagopa-ui/src/catalog/figma/parity-cases.json": [
    {
      id: "button-default",
      nodeId: "4:4",
      export: "Button",
      storyId: "button--default",
      width: 320,
      viewport: 320,
      height: 900,
      root: "#storybook-root",
    },
  ],
  "packages/pagopa-ui/src/button.tsx": "current implementation\n",
}

function mediaGit(root) {
  return (args) => {
    if (args[0] === "status") return ""
    if (args[0] === "diff") return "packages/pagopa-ui/src/button.tsx\n"
    if (args[0] === "remote") return "git@github.com:acme/ui.git\n"
    if (args[0] === "show") {
      const [refFile] = args.slice(1)
      if (refFile.endsWith(":packages/pagopa-ui/src/catalog/figma/registry.json"))
        return JSON.stringify({
          entries: {
            "4:4": {
              status: "implemented",
              note: "Reviewed render.",
              target: {
                module: "src/button.tsx",
                export: "Button",
                story: "apps/storybook/src/Button.stories.tsx",
                storyExports: ["Default"],
              },
            },
          },
          bulkRules: [],
        })
      if (refFile.endsWith(":packages/pagopa-ui/src/catalog/figma/parity-cases.json"))
        return JSON.stringify(mediaFiles["packages/pagopa-ui/src/catalog/figma/parity-cases.json"])
      if (refFile === "base:packages/pagopa-ui/src/button.tsx") return "before implementation\n"
      if (refFile === "HEAD:packages/pagopa-ui/src/button.tsx")
        return fs.readFileSync(path.join(root, "packages/pagopa-ui/src/button.tsx"), "utf8")
    }
    throw new Error(`unexpected git ${args.join(" ")}`)
  }
}

test("handoff resolve selects the one open drift PR and rejects closed PRs", () => {
  const fixture = fixtureTree({}, "handoff-resolve-")
  try {
    const workspace = workspaceAt(fixture.root)
    const pr = resolveHandoff(workspace, undefined, {
      gh: () => JSON.stringify([openPr]),
      git: () => "",
      pnpm: () => "",
    })
    assert.equal(pr.number, 12)
    assert.throws(
      () =>
        resolveHandoff(workspace, "12", {
          gh: () => JSON.stringify({ ...openPr, state: "MERGED" }),
          git: () => "",
          pnpm: () => "",
        }),
      /merged/,
    )
  } finally {
    fixture.dispose()
  }
})

test("handoff checkout dry-run describes fetch, worktree and install without running them", () => {
  const fixture = fixtureTree({}, "handoff-checkout-")
  const commands = []
  try {
    const result = checkoutHandoff(workspaceAt(fixture.root), openPr, true, {
      gh: () => "",
      git: (args) => {
        commands.push(["git", args])
        return ""
      },
      pnpm: (args) => {
        commands.push(["pnpm", args])
        return ""
      },
    })
    assert.equal(commands.length, 0)
    assert.equal(result.branch, openPr.headRefName)
    // The fresh checkout, the reuse a real run falls back to, and the install.
    assert.equal(result.actions.length, 4)
    assert.match(result.actions[2], /if figma-drift\/.* exists already/)
  } finally {
    fixture.dispose()
  }
})

test("handoff checkout gives each drift branch its own sibling worktree", () => {
  const fixture = fixtureTree({}, "handoff-checkout-slug-")
  try {
    const workspace = workspaceAt(fixture.root)
    const adapters = { gh: () => "", git: () => "", pnpm: () => "" }
    const first = checkoutHandoff(workspace, openPr, true, adapters)
    const second = checkoutHandoff(
      workspace,
      { ...openPr, number: 13, headRefName: "figma-drift/2026-12-01" },
      true,
      adapters,
    )
    assert.equal(first.path, path.resolve(fixture.root, "..", "pagopa-ui-drift-2026-11-08"))
    assert.equal(second.path, path.resolve(fixture.root, "..", "pagopa-ui-drift-2026-12-01"))
  } finally {
    fixture.dispose()
  }
})

test("handoff checkout reuses the worktree that already holds the branch", () => {
  const fixture = fixtureTree({}, "handoff-checkout-reuse-")
  try {
    const workspace = workspaceAt(fixture.root)
    const destination = path.resolve(fixture.root, "..", "pagopa-ui-drift-2026-11-08")
    fs.mkdirSync(destination, { recursive: true })
    fs.writeFileSync(path.join(destination, ".git"), "gitdir: /dev/null\n")
    const commands = []
    try {
      const result = checkoutHandoff(workspace, openPr, false, {
        gh: () => "",
        git: (args) => commands.push(args),
        pnpm: (args) => commands.push(args),
      })
      assert.equal(result.path, destination)
      assert.equal(result.branch, openPr.headRefName)
      assert.deepEqual(commands, [])
    } finally {
      fs.rmSync(destination, { recursive: true, force: true })
    }
  } finally {
    fixture.dispose()
  }
})

test("handoff brief follows the order in the included delta", () => {
  const fixture = fixtureTree({}, "handoff-brief-")
  try {
    const queue = {
      implementationOrder: ["1:1", "2:2"],
      items: [
        { nodeId: "1:1", class: "pending", devices: [], brief: { node: "1:1" } },
        { nodeId: "2:2", class: "changed", devices: ["mobile"], brief: { node: "2:2" } },
      ],
    }
    const result = handoffBrief(workspaceAt(fixture.root), { ...openPr, body: "" }, queue, {
      implementationOrder: ["2:2"],
    })
    assert.deepEqual(result.queue.implementationOrder, ["2:2"])
    assert.equal(result.queue.items[0].brief.node, "2:2")
  } finally {
    fixture.dispose()
  }
})

test("handoff brief sources its order from the queue when the artifact names none", () => {
  const fixture = fixtureTree({}, "handoff-brief-queue-order-")
  try {
    const queue = {
      implementationOrder: ["1:1", "2:2", "3:3"],
      items: [
        { nodeId: "1:1", class: "pending", devices: [], brief: { node: "1:1" } },
        { nodeId: "2:2", class: "changed", devices: ["mobile"], brief: { node: "2:2" } },
      ],
    }
    const result = handoffBrief(workspaceAt(fixture.root), { ...openPr, body: "" }, queue, {})
    assert.equal(result.orderSource, "queue")
    assert.deepEqual(result.queue.implementationOrder, ["1:1", "2:2", "3:3"])
    // `3:3` is missing from the items because the queue cap truncated it, not
    // because an artifact asked for a node that is gone.
    assert.deepEqual(result.dropped, [])
  } finally {
    fixture.dispose()
  }
})

test("handoff brief reports only the artifact ids the queue cannot carry as dropped", () => {
  const fixture = fixtureTree({}, "handoff-brief-dropped-")
  try {
    const queue = {
      implementationOrder: ["1:1"],
      items: [{ nodeId: "1:1", class: "pending", devices: [], brief: { node: "1:1" } }],
    }
    const result = handoffBrief(workspaceAt(fixture.root), { ...openPr, body: "" }, queue, {
      implementationOrder: ["1:1", "9:9"],
    })
    assert.equal(result.orderSource, "delta")
    assert.deepEqual(result.queue.implementationOrder, ["1:1"])
    assert.deepEqual(result.dropped, ["9:9"])
  } finally {
    fixture.dispose()
  }
})

test("handoff brief leaves a cap-truncated node to the queue's own notice", () => {
  const fixture = fixtureTree({}, "handoff-brief-cap-")
  try {
    // The cap keeps the order and drops the item, so the artifact naming the
    // same id is naming work the queue knows about, not a stale entry.
    const queue = {
      implementationOrder: ["1:1", "2:2"],
      items: [{ nodeId: "1:1", class: "pending", devices: [], brief: { node: "1:1" } }],
    }
    const result = handoffBrief(workspaceAt(fixture.root), { ...openPr, body: "" }, queue, {
      implementationOrder: ["1:1", "2:2"],
    })
    assert.deepEqual(result.dropped, [])
    assert.equal(result.orderSource, "delta")
  } finally {
    fixture.dispose()
  }
})

test("handoff media dry-run leaves source and external systems untouched", async () => {
  const fixture = fixtureTree(mediaFiles, "handoff-media-dry-")
  const original = fs.readFileSync(
    path.join(fixture.root, "packages/pagopa-ui/src/button.tsx"),
    "utf8",
  )
  let captures = 0
  let comments = 0
  try {
    const result = await createHandoffMedia(
      workspaceAt(fixture.root),
      { pr: 12, base: "base", baseUrl: "https://storybook.example.test", dryRun: true },
      {
        git: mediaGit(fixture.root),
        gh: () => {
          comments++
          return ""
        },
        capture: async () => {
          captures++
          return { screenshot: "", box: { x: 0, y: 0, width: 1, height: 1 } }
        },
        storybook: async () => true,
      },
    )
    assert.equal(result.dryRun, true)
    assert.equal(result.cases, 1)
    assert.equal(captures, 0)
    assert.equal(comments, 0)
    assert.equal(
      fs.readFileSync(path.join(fixture.root, "packages/pagopa-ui/src/button.tsx"), "utf8"),
      original,
    )
  } finally {
    fixture.dispose()
  }
})

test("handoff media restores source and verifies attached captures after commenting", async () => {
  const fixture = fixtureTree(mediaFiles, "handoff-media-live-")
  const source = path.join(fixture.root, "packages/pagopa-ui/src/button.tsx")
  const original = fs.readFileSync(source, "utf8")
  const ghCalls = []
  let captures = 0
  let postedBody = ""
  try {
    const result = await createHandoffMedia(
      workspaceAt(fixture.root),
      { pr: 12, base: "base", baseUrl: "https://storybook.example.test", dryRun: false },
      {
        git: mediaGit(fixture.root),
        gh: (args) => {
          ghCalls.push(args)
          if (args[0] === "pr" && args[1] === "comment") {
            postedBody = args[args.indexOf("--body") + 1]
            return ""
          }
          return JSON.stringify([
            {
              body: `${postedBody}\nhttps://github.com/user-attachments/assets/before\nhttps://github.com/user-attachments/assets/after`,
            },
          ])
        },
        capture: async (input) => {
          captures++
          fs.mkdirSync(path.dirname(input.screenshot), { recursive: true })
          fs.writeFileSync(input.screenshot, captures === 1 ? "before image" : "after image")
          return {
            screenshot: input.screenshot,
            box: { x: 0, y: 0, width: input.width, height: 10 },
          }
        },
        storybook: async () => true,
      },
    )
    assert.equal(result.moved, 1)
    assert.equal(result.cases, 1)
    assert.equal(captures, 2)
    assert.equal(ghCalls.length, 2)
    assert.equal(fs.readFileSync(source, "utf8"), original)
    assert.equal(fs.existsSync(path.join(fixture.root, ".cache/ui-cli/handoff-media/12")), false)
  } finally {
    fixture.dispose()
  }
})
