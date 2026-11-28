import assert from "node:assert/strict"
import { test } from "node:test"
import fs from "node:fs"
import path from "node:path"
import {
  closeDesignRequest,
  listDesignRequests,
  openDesignRequest,
  requestIssueUrl,
} from "../../src/figma/design-requests.ts"
import { fixtureTree, workspaceAt } from "../helpers/cli.mjs"

const files = {
  "figma-to-code.yaml": `design:\n  owners:\n    - designer-one\n  preview:\n    url: https://preview.example.test\n    pr: 19\n    branch: feedback/previews\n`,
  "src/catalog/figma/inventory.json": {
    fileKey: "file",
    syncedAt: "2026-01-01",
    components: [
      { nodeId: "4:4", name: "Button", type: "COMPONENT", pageId: "1:1", pageName: "Page" },
    ],
  },
  "src/catalog/figma/registry.json": {
    entries: { "4:4": { status: "pending", note: "Existing residue." } },
    bulkRules: [],
  },
  "packages/ui-cli/request.json": {
    slug: "button-focus-ring",
    title: "How should the focus ring appear?",
    type: "design",
    question: "How should the focus ring appear?",
    context: "The source does not specify the ring.",
    options: [
      { key: "a", label: "Thin" },
      { key: "b", label: "Thick" },
    ],
    recommendation: "Use the thin ring.",
    ask: "Which focus ring should we use?",
    when: "does not block the release",
    nodeId: "4:4",
  },
}

/** A `gh` that answers the duplicate-title read with nothing, so `open` can proceed. */
function noOpenQuestion(args) {
  return args[0] === "issue" && args[1] === "list" ? "[]" : ""
}

test("request open dry-run plans the create and writes nothing", () => {
  const fixture = fixtureTree(files, "design-request-dry-")
  const calls = []
  try {
    const result = openDesignRequest(
      workspaceAt(fixture.root),
      path.join(fixture.root, "packages/ui-cli/request.json"),
      true,
      (args) => {
        calls.push(args)
        return noOpenQuestion(args)
      },
    )
    assert.equal(result.dryRun, true)
    assert.equal(result.issueUrl, null)
    assert.match(result.actions.join("\n"), /gh issue create/)
    assert.match(result.actions.join("\n"), /write registry note for 4:4/)
    // The duplicate-title guard is a read: a dry run asks the tracker, and creates nothing.
    assert.equal(calls.length, 1)
    assert.equal(calls[0][1], "list")
    const registry = fs.readFileSync(
      path.join(fixture.root, "src/catalog/figma/registry.json"),
      "utf8",
    )
    assert.match(registry, /Existing residue\./)
    assert.doesNotMatch(registry, /Design request/)
  } finally {
    fixture.dispose()
  }
})

test("request open validates the rules card before it creates anything", () => {
  const fixture = fixtureTree(files, "design-request-card-")
  const calls = []
  try {
    // `.figma/rules.json` is absent, so the card cannot be validated — and a
    // create that ran first could not be undone by the failure that follows.
    const input = { ...files["packages/ui-cli/request.json"], rulesCard: "R-999" }
    const inputFile = path.join(fixture.root, "packages/ui-cli/request.json")
    fs.writeFileSync(inputFile, JSON.stringify(input))
    assert.throws(
      () =>
        openDesignRequest(workspaceAt(fixture.root), inputFile, false, (args) => {
          calls.push(args)
          return noOpenQuestion(args)
        }),
      /\.figma\/rules\.json is missing/,
    )
    assert.deepEqual(calls, [])
    const registry = fs.readFileSync(
      path.join(fixture.root, "src/catalog/figma/registry.json"),
      "utf8",
    )
    assert.doesNotMatch(registry, /Design request/)
  } finally {
    fixture.dispose()
  }
})

test("request open creates the issue, points the note at it and keeps the node pending", () => {
  const fixture = fixtureTree(files, "design-request-open-")
  const calls = []
  try {
    const result = openDesignRequest(
      workspaceAt(fixture.root),
      path.join(fixture.root, "packages/ui-cli/request.json"),
      false,
      (args) => {
        calls.push(args)
        return args[1] === "create"
          ? "https://github.com/acme/ui/issues/42\n"
          : noOpenQuestion(args)
      },
    )
    assert.equal(result.issueUrl, "https://github.com/acme/ui/issues/42")
    const create = calls.find((args) => args[1] === "create")
    assert.ok(create.includes("type/design-question"))
    assert.ok(create.includes("status/needs-answer"))
    assert.ok(create.includes("[design] How should the focus ring appear?"))
    assert.ok(create.includes("designer-one"))
    const registry = JSON.parse(
      fs.readFileSync(path.join(fixture.root, "src/catalog/figma/registry.json"), "utf8"),
    )
    assert.equal(registry.entries["4:4"].status, "pending")
    assert.equal(
      registry.entries["4:4"].note,
      "Existing residue.\nDesign request: https://github.com/acme/ui/issues/42",
    )
  } finally {
    fixture.dispose()
  }
})

test("request open refuses a title the tracker already asks and names the issue", () => {
  const fixture = fixtureTree(files, "design-request-duplicate-")
  const calls = []
  try {
    assert.throws(
      () =>
        openDesignRequest(
          workspaceAt(fixture.root),
          path.join(fixture.root, "packages/ui-cli/request.json"),
          false,
          (args) => {
            calls.push(args)
            return args[1] === "list"
              ? JSON.stringify([
                  {
                    number: 42,
                    title: "[design] How should the focus ring appear?",
                    url: "https://github.com/acme/ui/issues/42",
                  },
                ])
              : ""
          },
        ),
      /https:\/\/github\.com\/acme\/ui\/issues\/42 already asks this question — answer it, or open a new slug/,
    )
    assert.equal(
      calls.some((args) => args[1] === "create"),
      false,
    )
    assert.doesNotMatch(
      fs.readFileSync(path.join(fixture.root, "src/catalog/figma/registry.json"), "utf8"),
      /Design request/,
    )
  } finally {
    fixture.dispose()
  }
})

test("request open refuses a node that is not pending", () => {
  const fixture = fixtureTree(
    {
      ...files,
      "src/catalog/figma/registry.json": {
        entries: { "4:4": { status: "implemented", note: "Done." } },
        bulkRules: [],
      },
    },
    "design-request-blocked-",
  )
  try {
    assert.throws(
      () =>
        openDesignRequest(
          workspaceAt(fixture.root),
          path.join(fixture.root, "packages/ui-cli/request.json"),
          true,
          () => {
            throw new Error("a node that is not pending must not reach gh")
          },
        ),
      /4:4 must remain pending while its design request is open/,
    )
  } finally {
    fixture.dispose()
  }
})

test("visual request bodies link each option and embed width-labelled review captures", () => {
  const visual = {
    ...files["packages/ui-cli/request.json"],
    visual: true,
    options: [
      {
        key: "a",
        label: "Thin",
        captures: [320, 1200].map((width) => ({
          width,
          url: `https://raw.githubusercontent.com/acme/ui/feedback/previews/apps/storybook/src/reviews/button-focus-ring/option-a-${width}.png`,
        })),
      },
      {
        key: "b",
        label: "Thick",
        captures: [320, 1200].map((width) => ({
          width,
          url: `https://raw.githubusercontent.com/acme/ui/feedback/previews/apps/storybook/src/reviews/button-focus-ring/option-b-${width}.png`,
        })),
      },
    ],
  }
  const fixture = fixtureTree(
    { ...files, "packages/ui-cli/request.json": visual },
    "design-request-visual-",
  )
  try {
    const result = openDesignRequest(
      workspaceAt(fixture.root),
      path.join(fixture.root, "packages/ui-cli/request.json"),
      true,
      noOpenQuestion,
    )
    const command = result.actions[0]
    assert.match(command, /## What we are deciding/)
    assert.match(
      command,
      /https:\/\/preview\.example\.test\/\?path=\/story\/reviews-button-focus-ring--option-a/,
    )
    assert.match(
      command,
      /!\[Thin at 320px\]\(https:\/\/raw\.githubusercontent\.com\/acme\/ui\/feedback\/previews/,
    )
    assert.match(command, /!\[Thick at 1200px\]/)
  } finally {
    fixture.dispose()
  }
})

test("visual request rejects captures outside the configured review branch", () => {
  const visual = {
    ...files["packages/ui-cli/request.json"],
    visual: true,
    options: [
      {
        key: "a",
        label: "Thin",
        captures: [
          { width: 1200, url: "https://raw.githubusercontent.com/acme/ui/main/option-a.png" },
        ],
      },
      {
        key: "b",
        label: "Thick",
        captures: [
          { width: 1200, url: "https://raw.githubusercontent.com/acme/ui/main/option-b.png" },
        ],
      },
    ],
  }
  const fixture = fixtureTree(
    { ...files, "packages/ui-cli/request.json": visual },
    "design-request-branch-",
  )
  try {
    assert.throws(
      () =>
        openDesignRequest(
          workspaceAt(fixture.root),
          path.join(fixture.root, "packages/ui-cli/request.json"),
          true,
          noOpenQuestion,
        ),
      /design.preview.branch/,
    )
  } finally {
    fixture.dispose()
  }
})

test("request list selects the open answer-state label", () => {
  const fixture = fixtureTree(files, "design-request-list-")
  let args = []
  try {
    const result = listDesignRequests(workspaceAt(fixture.root), "answered", (input) => {
      args = input
      return "[]"
    })
    assert.deepEqual(result, [])
    assert.deepEqual(args.slice(0, 6), [
      "issue",
      "list",
      "--label",
      "status/answered",
      "--state",
      "open",
    ])
  } finally {
    fixture.dispose()
  }
})

test("request close dry-run plans the label move, the answer and the close", () => {
  const fixture = fixtureTree(files, "design-request-close-dry-")
  let calls = 0
  try {
    const result = closeDesignRequest(
      workspaceAt(fixture.root),
      "https://github.com/acme/ui/issues/42",
      "Use the thin ring.",
      "abc1234",
      true,
      () => {
        calls++
        return ""
      },
    )
    assert.equal(calls, 0)
    assert.equal(result.dryRun, true)
    assert.equal(result.commitUrl, "https://github.com/acme/ui/commit/abc1234")
    assert.deepEqual(result.actions, [
      "gh issue edit https://github.com/acme/ui/issues/42 --remove-label status/needs-answer --add-label status/answered",
      'gh issue comment https://github.com/acme/ui/issues/42 --body "<decision> — Recorded in https://github.com/acme/ui/commit/abc1234"',
      "gh issue close https://github.com/acme/ui/issues/42",
    ])
  } finally {
    fixture.dispose()
  }
})

test("request close comments the answer with its commit and closes the issue", () => {
  const fixture = fixtureTree(files, "design-request-close-")
  const calls = []
  try {
    closeDesignRequest(
      workspaceAt(fixture.root),
      "https://github.com/acme/ui/issues/42",
      "Use the thin ring.",
      "abc1234",
      false,
      (args) => {
        calls.push(args)
        return ""
      },
    )
    assert.deepEqual(
      calls.map((args) => args[1]),
      ["edit", "comment", "close"],
    )
    assert.equal(
      calls[1][4],
      "Use the thin ring.\n\nRecorded in https://github.com/acme/ui/commit/abc1234",
    )
  } finally {
    fixture.dispose()
  }
})

test("request close resolves an issue number through gh", () => {
  const fixture = fixtureTree(files, "design-request-close-number-")
  try {
    assert.equal(
      requestIssueUrl(workspaceAt(fixture.root), " 42 ", (args) => {
        assert.deepEqual(args, ["issue", "view", "42", "--json", "url", "--jq", ".url"])
        return "https://github.com/acme/ui/issues/42\n"
      }),
      "https://github.com/acme/ui/issues/42",
    )
  } finally {
    fixture.dispose()
  }
})

test("request close refuses a positional that is neither an issue nor a number", () => {
  const fixture = fixtureTree(files, "design-request-close-bad-")
  try {
    assert.throws(
      () =>
        closeDesignRequest(
          workspaceAt(fixture.root),
          "docs/design-requests/2026-11-08-button-focus-ring.md",
          "Use the thin ring.",
          "abc1234",
          true,
          () => {
            throw new Error("a retired record path must not reach gh")
          },
        ),
      /is neither an issue URL nor an issue number/,
    )
  } finally {
    fixture.dispose()
  }
})
