import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveHandoff, checkoutHandoff, handoffBrief } from "../../src/figma/handoff.ts"
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

test("handoff brief's JSON surface does not grow with the artifact it read", () => {
  const fixture = fixtureTree({}, "handoff-brief-summary-")
  try {
    const queue = {
      implementationOrder: ["1:1"],
      items: [{ nodeId: "1:1", class: "pending", devices: [], brief: { node: "1:1" } }],
    }
    // A saved delta carries a whole snapshot beside the order. The brief must not
    // re-expand it: the printed surface stays the same size whatever the snapshot
    // holds, or the JSON read passes the engine's maximum string length.
    const artifact = (entries) => ({
      implementationOrder: ["1:1"],
      pending: Array.from({ length: entries }, (_, index) => ({
        nodeId: `9:${index}`,
        note: "x".repeat(250),
      })),
    })
    const huge = artifact(120_000)
    const small = handoffBrief(
      workspaceAt(fixture.root),
      { ...openPr, body: "" },
      queue,
      artifact(10),
    )
    const result = handoffBrief(workspaceAt(fixture.root), { ...openPr, body: "" }, queue, huge)
    assert.ok(JSON.stringify(huge).length > 20_000_000)
    assert.deepEqual(result.delta, {
      source: "body",
      path: null,
      implementationOrder: ["1:1"],
    })
    assert.equal(JSON.stringify(result, null, 2).length, JSON.stringify(small, null, 2).length)
    assert.ok(JSON.stringify(result, null, 2).length < 1_000)
  } finally {
    fixture.dispose()
  }
})

test("handoff brief names the local snapshot it read without embedding it", () => {
  const fixture = fixtureTree(
    {
      ".figma/delta.json": {
        implementationOrder: ["1:1"],
        pending: Array.from({ length: 5000 }, (_, index) => ({
          nodeId: `9:${index}`,
          note: "x".repeat(200),
        })),
      },
    },
    "handoff-brief-file-",
  )
  try {
    const queue = {
      implementationOrder: ["1:1"],
      items: [{ nodeId: "1:1", class: "pending", devices: [], brief: { node: "1:1" } }],
    }
    const result = handoffBrief(workspaceAt(fixture.root), { ...openPr, body: "" }, queue)
    assert.deepEqual(result.delta, {
      source: "file",
      path: ".figma/delta.json",
      implementationOrder: ["1:1"],
    })
    assert.equal(result.orderSource, "delta")
    assert.ok(JSON.stringify(result, null, 2).length < 1_000)
  } finally {
    fixture.dispose()
  }
})

test("handoff brief never orders itself by a saved catalogue plan", () => {
  const fixture = fixtureTree(
    {
      ".figma/plan.json": {
        implementationOrder: ["2:2", "1:1"],
        pending: Array.from({ length: 5000 }, (_, index) => ({
          nodeId: `9:${index}`,
          note: "x".repeat(200),
        })),
      },
    },
    "handoff-brief-plan-",
  )
  try {
    const queue = {
      implementationOrder: ["1:1", "2:2"],
      items: [
        { nodeId: "1:1", class: "pending", devices: [], brief: { node: "1:1" } },
        { nodeId: "2:2", class: "changed", devices: ["mobile"], brief: { node: "2:2" } },
      ],
    }
    const result = handoffBrief(workspaceAt(fixture.root), { ...openPr, body: "" }, queue)
    // A plan orders the whole catalogue's work set, not this pull request's delta.
    assert.equal(result.delta, null)
    assert.equal(result.orderSource, "queue")
    assert.deepEqual(result.queue.implementationOrder, ["1:1", "2:2"])
    assert.deepEqual(result.dropped, [])
    assert.ok(JSON.stringify(result, null, 2).length < 1_000)
  } finally {
    fixture.dispose()
  }
})
