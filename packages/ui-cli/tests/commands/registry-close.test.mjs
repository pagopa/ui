import assert from "node:assert/strict"
import { test } from "node:test"
import { fixtureTree, runCli } from "../helpers/cli.mjs"
import { closeWorkflow } from "../../src/figma/close.ts"

const files = {
  "src/catalog/figma/inventory.json": {
    fileKey: "file",
    syncedAt: "2026-01-01",
    components: [
      { nodeId: "4:4", name: "Button", type: "COMPONENT", pageId: "1:1", pageName: "Page" },
    ],
  },
  "src/catalog/figma/registry.json": { entries: { "4:4": { status: "pending", note: "Waiting" } } },
  "src/catalog/figma/page-surface.json": {
    fileKey: "file",
    readAt: "today",
    note: "Census",
    pages: [
      {
        pageId: "1:1",
        pageName: "Page",
        identities: [
          {
            nodeId: "4:4",
            name: "Button",
            kind: "COMPONENT",
            inLibrary: true,
            decision: "pending",
            reason: "Waiting",
          },
        ],
        compositions: [],
      },
    ],
  },
}

test("registry dry run validates and describes proposed decision", async () => {
  const fixture = fixtureTree(files, "registry-set-")
  try {
    const result = await runCli(
      [
        "figma",
        "registry",
        "set",
        "4:4",
        "--status",
        "excluded",
        "--reason",
        "Out of scope",
        "--dry-run",
        "--json",
      ],
      { root: fixture.root },
    )
    assert.equal(result.status, 0, result.stderr)
    const report = JSON.parse(result.stdout)
    assert.equal(report.entry.status, "excluded")
    assert.equal(report.entry.reason, "Out of scope")
    assert.equal(report.surface.decision, "excluded")
  } finally {
    fixture.dispose()
  }
})

test("registry rejects unknown nodes and long notes", async () => {
  const fixture = fixtureTree(files, "registry-invalid-")
  try {
    let result = await runCli(["figma", "registry", "set", "9:9", "--status", "pending"], {
      root: fixture.root,
    })
    assert.equal(result.status, 2)
    result = await runCli(
      ["figma", "registry", "set", "4:4", "--status", "pending", "--note", "x".repeat(601)],
      { root: fixture.root },
    )
    assert.equal(result.status, 1)
  } finally {
    fixture.dispose()
  }
})

test("close continues and classifies worst result", async () => {
  const order = []
  const result = await closeWorkflow(
    { nodes: ["4:4"], source: "explicit", files: [], skipChain: true },
    {
      run: async (name) => {
        order.push(name)
        return name === "check rules" ? 1 : name.startsWith("parity") ? 3 : 0
      },
      storybook: async () => true,
    },
  )
  assert.deepEqual(order, [
    "check catalogue",
    "check rules",
    "check devices",
    "check evidence",
    "parity check --node 4:4 --saved",
    "check docs",
  ])
  assert.equal(result.exitCode, 1)
  assert.equal(result.steps.at(-1).result, "skipped")
})

test("registry writes the decision and surface and lowers the note ratchet", async () => {
  const { readFileSync } = await import("node:fs")
  const { join } = await import("node:path")
  const fixture = fixtureTree(
    {
      ...files,
      "src/catalog/figma/registry.json": {
        entries: { "4:4": { status: "pending", note: "x".repeat(601) } },
      },
      "src/catalog/figma/note-length-baseline.json": {
        maxLength: 600,
        overLimit: 1,
        note: "Existing",
      },
    },
    "registry-write-",
  )
  try {
    const result = await runCli(
      [
        "figma",
        "registry",
        "set",
        "4:4",
        "--status",
        "excluded",
        "--reason",
        "Out of scope",
        "--note",
        "Short",
        "--json",
      ],
      { root: fixture.root },
    )
    const report = JSON.parse(result.stdout)
    assert.equal(result.status, report.check.exitCode)
    const read = (file) => JSON.parse(readFileSync(join(fixture.root, file), "utf8"))
    assert.equal(read("src/catalog/figma/registry.json").entries["4:4"].reason, "Out of scope")
    assert.equal(
      read("src/catalog/figma/page-surface.json").pages[0].identities[0].decision,
      "excluded",
    )
    assert.equal(read("src/catalog/figma/note-length-baseline.json").overLimit, 0)
  } finally {
    fixture.dispose()
  }
})

test("registry enforces target, mock note and excluded reason", async () => {
  const fixture = fixtureTree(files, "registry-validation-")
  try {
    for (const status of ["implemented", "excluded"]) {
      const result = await runCli(
        ["figma", "registry", "set", "4:4", "--status", status, "--dry-run"],
        { root: fixture.root },
      )
      assert.equal(result.status, 2, result.stderr)
    }
    const result = await runCli(
      [
        "figma",
        "registry",
        "set",
        "4:4",
        "--status",
        "implemented",
        "--module",
        "src/Button.tsx",
        "--export",
        "Button",
        "--story",
        "src/Button.stories.tsx",
        "--story-exports",
        "Example",
        "--dry-run",
        "--json",
      ],
      { root: fixture.root },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout).entry.target.storyExports, ["Example"])
  } finally {
    fixture.dispose()
  }
})

test("close marks unavailable Storybook not run and drift outranks not run", async () => {
  const result = await closeWorkflow(
    { nodes: ["4:4"], source: "explicit", files: [], skipChain: true },
    { run: async (name) => (name === "check docs" ? 3 : 0), storybook: async () => false },
  )
  assert.equal(result.exitCode, 3)
  assert.equal(result.steps.find((step) => step.step.startsWith("parity")).result, "not run")
})

test("registry dry run does not touch any files", async () => {
  const { readFileSync } = await import("node:fs")
  const { join } = await import("node:path")
  const fixture = fixtureTree(files, "registry-dry-")
  try {
    const names = ["src/catalog/figma/registry.json", "src/catalog/figma/page-surface.json"]
    const before = names.map((name) => readFileSync(join(fixture.root, name), "utf8"))
    const result = await runCli(
      ["figma", "registry", "set", "4:4", "--status", "excluded", "--reason", "Out", "--dry-run"],
      { root: fixture.root },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(
      names.map((name) => readFileSync(join(fixture.root, name), "utf8")),
      before,
    )
  } finally {
    fixture.dispose()
  }
})

test("close CLI returns a JSON table and marks unavailable capture not run", async () => {
  const fixture = fixtureTree(files, "close-cli-")
  try {
    const result = await runCli(["figma", "close", "--nodes", "4:4", "--skip-chain", "--json"], {
      root: fixture.root,
      env: { STORYBOOK_URL: "http://127.0.0.1:1" },
    })
    const data = JSON.parse(result.stdout)
    assert.equal(data.source, "explicit")
    assert.equal(data.steps.find((step) => step.step.startsWith("parity")).result, "not run")
    assert.equal(data.steps.at(-1).result, "skipped")
    assert.equal(data.exitCode, result.status)
    assert.match(data.report, /Per device verdict/)
  } finally {
    fixture.dispose()
  }
})
