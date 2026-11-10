import assert from "node:assert/strict"
import { test } from "node:test"
import fs from "node:fs"
import path from "node:path"
import {
  closeDesignRequest,
  listDesignRequests,
  openDesignRequest,
} from "../../src/figma/design-requests.ts"
import { fixtureTree, workspaceAt } from "../helpers/cli.mjs"

const files = {
  "figma-to-code.yaml": `design:\n  requests: docs/design-requests\n  owners:\n    - designer-one\n  preview:\n    url: https://preview.example.test\n    pr: 19\n    branch: feedback/previews\n`,
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

test("request open dry-run prints all planned actions and never calls gh or writes", () => {
  const fixture = fixtureTree(files, "design-request-dry-")
  let calls = 0
  try {
    const result = openDesignRequest(
      workspaceAt(fixture.root),
      path.join(fixture.root, "packages/ui-cli/request.json"),
      "2026-11-08",
      true,
      () => {
        calls++
        return ""
      },
    )
    assert.equal(calls, 0)
    assert.equal(result.dryRun, true)
    assert.match(result.actions.join("\n"), /status\/needs-answer/)
    assert.match(result.actions.join("\n"), /write registry note for 4:4/)
    assert.equal(fs.existsSync(path.join(fixture.root, result.path)), false)
  } finally {
    fixture.dispose()
  }
})

test("request open creates the issue, writes its record and keeps the node pending", () => {
  const fixture = fixtureTree(files, "design-request-open-")
  const calls = []
  try {
    const result = openDesignRequest(
      workspaceAt(fixture.root),
      path.join(fixture.root, "packages/ui-cli/request.json"),
      "2026-11-08",
      false,
      (args) => {
        calls.push(args)
        return "https://github.com/acme/ui/issues/42\n"
      },
    )
    assert.equal(result.issueUrl, "https://github.com/acme/ui/issues/42")
    assert.equal(calls.length, 1)
    assert.ok(calls[0].includes("type/design-question"))
    assert.ok(calls[0].includes("status/needs-answer"))
    assert.ok(calls[0].includes("designer-one"))
    const record = fs.readFileSync(path.join(fixture.root, result.path), "utf8")
    assert.match(record, /- Issue: https:\/\/github.com\/acme\/ui\/issues\/42/)
    assert.match(record, /- Status: open/)
    const registry = JSON.parse(
      fs.readFileSync(path.join(fixture.root, "src/catalog/figma/registry.json"), "utf8"),
    )
    assert.equal(registry.entries["4:4"].status, "pending")
    assert.match(
      registry.entries["4:4"].note,
      /docs\/design-requests\/2026-11-08-button-focus-ring\.md/,
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
      "2026-11-08",
      true,
      () => "",
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
          "2026-11-08",
          true,
          () => "",
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

test("request close dry-run preserves the record and does not call gh", () => {
  const fixture = fixtureTree(
    {
      ...files,
      "docs/design-requests/2026-11-08-button-focus-ring.md":
        "# Focus ring\n\n- Type: design\n- Issue: https://github.com/acme/ui/issues/42\n- Status: open\n- Decision owner: @designer-one\n- Preview: https://preview.example.test\n\n## Context\n\nQuestion.\n\n## Options\n\n- Thin\n\n## Decision\n\n",
    },
    "design-request-close-",
  )
  let calls = 0
  try {
    const result = closeDesignRequest(
      workspaceAt(fixture.root),
      "docs/design-requests/2026-11-08-button-focus-ring.md",
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
    assert.equal(
      fs
        .readFileSync(
          path.join(fixture.root, "docs/design-requests/2026-11-08-button-focus-ring.md"),
          "utf8",
        )
        .includes("- Status: open"),
      true,
    )
    assert.equal(result.actions.length, 4)
  } finally {
    fixture.dispose()
  }
})

const resumedRecord = `# How should the focus ring appear?

- Type: design
- Issue: https://github.com/acme/ui/issues/42
- Status: open

## Context

The source does not specify the ring.

## Options

- A — Thin
- B — Thick

## Decision
`

test("request open resumes an existing open record instead of opening a second issue", () => {
  const fixture = fixtureTree(
    {
      ...files,
      "docs/design-requests/2026-11-08-button-focus-ring.md": resumedRecord,
    },
    "design-request-resume-",
  )
  let calls = 0
  try {
    const result = openDesignRequest(
      workspaceAt(fixture.root),
      path.join(fixture.root, "packages/ui-cli/request.json"),
      "2026-11-08",
      false,
      () => {
        calls++
        return ""
      },
    )
    assert.equal(calls, 0)
    assert.equal(result.resumed, true)
    assert.equal(result.issueUrl, "https://github.com/acme/ui/issues/42")
    assert.doesNotMatch(result.actions.join("\n"), /gh issue create/)
    assert.doesNotMatch(result.actions.join("\n"), /write docs\/design-requests/)
    // The record keeps what the previous run wrote, decision placeholder included.
    assert.equal(fs.readFileSync(path.join(fixture.root, result.path), "utf8"), resumedRecord)
    // The writes the previous run may not have reached are redone.
    const registry = JSON.parse(
      fs.readFileSync(path.join(fixture.root, "src/catalog/figma/registry.json"), "utf8"),
    )
    assert.equal(registry.entries["4:4"].status, "pending")
    assert.match(
      registry.entries["4:4"].note,
      /docs\/design-requests\/2026-11-08-button-focus-ring\.md/,
    )
  } finally {
    fixture.dispose()
  }
})

test("request open appends its registry pointer once however often it resumes", () => {
  const fixture = fixtureTree(
    {
      ...files,
      "docs/design-requests/2026-11-08-button-focus-ring.md": resumedRecord,
    },
    "design-request-resume-note-",
  )
  const input = path.join(fixture.root, "packages/ui-cli/request.json")
  try {
    openDesignRequest(workspaceAt(fixture.root), input, "2026-11-08", false, () => "")
    openDesignRequest(workspaceAt(fixture.root), input, "2026-11-08", false, () => "")
    const registry = JSON.parse(
      fs.readFileSync(path.join(fixture.root, "src/catalog/figma/registry.json"), "utf8"),
    )
    const note = registry.entries["4:4"].note
    assert.equal(note.match(/Design request:/g).length, 1)
    assert.match(note, /^Existing residue\./)
  } finally {
    fixture.dispose()
  }
})

test("request open dry-run on an existing record reports the resume and calls gh never", () => {
  const fixture = fixtureTree(
    {
      ...files,
      "docs/design-requests/2026-11-08-button-focus-ring.md": resumedRecord,
    },
    "design-request-resume-dry-",
  )
  let calls = 0
  try {
    const result = openDesignRequest(
      workspaceAt(fixture.root),
      path.join(fixture.root, "packages/ui-cli/request.json"),
      "2026-11-08",
      true,
      () => {
        calls++
        return ""
      },
    )
    assert.equal(calls, 0)
    assert.equal(result.dryRun, true)
    assert.equal(result.resumed, true)
    assert.match(result.actions.join("\n"), /write registry note for 4:4/)
  } finally {
    fixture.dispose()
  }
})

test("request open refuses a record that is no longer open", () => {
  for (const [status, name] of [
    ["answered", "answered"],
    ["opne", "unreadable"],
  ]) {
    const fixture = fixtureTree(
      {
        ...files,
        "docs/design-requests/2026-11-08-button-focus-ring.md": resumedRecord.replace(
          "- Status: open",
          `- Status: ${status}`,
        ),
      },
      `design-request-refuse-${name}-`,
    )
    let calls = 0
    try {
      assert.throws(
        () =>
          openDesignRequest(
            workspaceAt(fixture.root),
            path.join(fixture.root, "packages/ui-cli/request.json"),
            "2026-11-08",
            false,
            () => {
              calls++
              return ""
            },
          ),
        new RegExp(`is ${name} — open a new slug`),
      )
      assert.equal(calls, 0)
    } finally {
      fixture.dispose()
    }
  }
})

test("request open refuses a record that asks a different question", () => {
  const fixture = fixtureTree(
    {
      ...files,
      "docs/design-requests/2026-11-08-button-focus-ring.md": resumedRecord,
      "packages/ui-cli/request.json": {
        ...files["packages/ui-cli/request.json"],
        title: "How should the pressed ring appear?",
      },
    },
    "design-request-refuse-title-",
  )
  let calls = 0
  try {
    assert.throws(
      () =>
        openDesignRequest(
          workspaceAt(fixture.root),
          path.join(fixture.root, "packages/ui-cli/request.json"),
          "2026-11-08",
          false,
          () => {
            calls++
            return ""
          },
        ),
      /asks "How should the focus ring appear\?" — this input asks "How should the pressed ring appear\?"/,
    )
    assert.equal(calls, 0)
  } finally {
    fixture.dispose()
  }
})

test("request open resumes a record whose heading states no question", () => {
  const untitled = resumedRecord.replace("# How should the focus ring appear?\n\n", "")
  const fixture = fixtureTree(
    {
      ...files,
      "docs/design-requests/2026-11-08-button-focus-ring.md": untitled,
    },
    "design-request-resume-untitled-",
  )
  let calls = 0
  try {
    const result = openDesignRequest(
      workspaceAt(fixture.root),
      path.join(fixture.root, "packages/ui-cli/request.json"),
      "2026-11-08",
      false,
      () => {
        calls++
        return ""
      },
    )
    // A record with no `# ` heading states nothing to disagree with, so the
    // title guard has no evidence to refuse on and the run resumes.
    assert.equal(calls, 0)
    assert.equal(result.resumed, true)
  } finally {
    fixture.dispose()
  }
})

test("request open refuses a record that names no issue", () => {
  const fixture = fixtureTree(
    {
      ...files,
      "docs/design-requests/2026-11-08-button-focus-ring.md": resumedRecord.replace(
        "- Issue: https://github.com/acme/ui/issues/42\n",
        "",
      ),
    },
    "design-request-refuse-no-issue-",
  )
  try {
    assert.throws(
      () =>
        openDesignRequest(
          workspaceAt(fixture.root),
          path.join(fixture.root, "packages/ui-cli/request.json"),
          "2026-11-08",
          false,
          () => "",
        ),
      /names no issue/,
    )
  } finally {
    fixture.dispose()
  }
})
