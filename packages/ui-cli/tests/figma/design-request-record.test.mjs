import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  answeredRecordSource,
  openRecord,
  readDesignRequestRecord,
} from "../../src/figma/design-request-record.ts"
import {
  DEFAULT_REQUESTS_DIR,
  designPaths,
  parseFigmaConfig,
  readFigmaConfig,
  requestPointer,
} from "../../src/figma/config.ts"

// The test runs from packages/ui-cli, and the config lives in the design-system
// package next to it: walk up until the file is in sight.
function configSource() {
  let directory = process.cwd()
  for (;;) {
    const candidate = path.join(directory, "packages/pagopa-ui/figma-to-code.yaml")
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8")
    const sibling = path.join(directory, "figma-to-code.yaml")
    if (fs.existsSync(sibling) && directory.endsWith("pagopa-ui"))
      return fs.readFileSync(sibling, "utf8")
    const parent = path.dirname(directory)
    if (parent === directory) throw new Error("figma-to-code.yaml not found")
    directory = parent
  }
}

const record = (status, extra = "") =>
  [
    "# Paper stroke values",
    "",
    "- Type: design",
    "- Issue: https://github.com/pagopa/ui/issues/42",
    status,
    "",
    "## Context",
    "",
    "The card disagrees with the drawing.",
    extra,
  ].join("\n")

test("a record with a readable status reports it", () => {
  assert.deepEqual(
    { state: readDesignRequestRecord(record("- Status: open")).state },
    { state: "open" },
  )
  assert.equal(readDesignRequestRecord(record("- Status: answered")).state, "answered")
})

test("a record with no status line is unreadable, not open and not answered", () => {
  const parsed = readDesignRequestRecord(record(""))
  assert.equal(parsed.state, "unreadable")
  assert.equal(parsed.raw, null)
})

test("a misspelled status is unreadable and keeps the word for the diagnosis", () => {
  const parsed = readDesignRequestRecord(record("- Status: awnsered"))
  assert.equal(parsed.state, "unreadable")
  assert.equal(parsed.raw, "awnsered")
})

test("the issue URL and the decision text are read from the record", () => {
  const parsed = readDesignRequestRecord(
    record("- Status: answered", "\n## Decision\n\nUse 2px.\n"),
  )
  assert.equal(parsed.issueUrl, "https://github.com/pagopa/ui/issues/42")
  assert.equal(parsed.decision, "Use 2px.")
})

test("closing an unreadable record refuses instead of moving it to answered", () => {
  assert.throws(() => answeredRecordSource(record(""), "Use 2px."), /no readable "- Status:" line/)
  assert.throws(
    () => answeredRecordSource(record("- Status: awnsered"), "Use 2px."),
    /found "awnsered"/,
  )
})

test("closing an answered record refuses to answer it twice", () => {
  assert.throws(
    () => answeredRecordSource(record("- Status: answered"), "Use 2px."),
    /already answered/,
  )
})

test("closing an open record rewrites the status and fills the decision", () => {
  const updated = answeredRecordSource(record("- Status: open", "\n## Decision\n"), "Use 2px.\n")
  const parsed = readDesignRequestRecord(updated)
  assert.equal(parsed.state, "answered")
  assert.equal(parsed.decision, "Use 2px.")
  assert.match(updated, /## Context\n\nThe card disagrees with the drawing\./)
})

test("a decision containing replacement patterns is written literally", () => {
  const decision = "Keep $$ and $& and $1 in the example."
  const updated = answeredRecordSource(record("- Status: open", "\n## Decision\n"), decision)
  const parsed = readDesignRequestRecord(updated)
  assert.equal(parsed.state, "answered")
  assert.equal(parsed.decision, decision)
})

test("a CRLF record takes the decision and keeps its line endings", () => {
  const source = record("- Status: open", "\n## Decision\n").replace(/\n/g, "\r\n")
  const updated = answeredRecordSource(source, "Use 2px.\n")
  assert.equal(readDesignRequestRecord(updated).state, "answered")
  assert.equal(readDesignRequestRecord(updated).decision, "Use 2px.")
  assert.match(updated, /## Decision\r\n\r\nUse 2px\.\r\n$/)
  assert.doesNotMatch(updated, /(?<!\r)\n/)
})

test("a record ending at the Decision heading takes the decision", () => {
  const updated = answeredRecordSource(record("- Status: open", "\n## Decision"), "Use 2px.")
  const parsed = readDesignRequestRecord(updated)
  assert.equal(parsed.state, "answered")
  assert.equal(parsed.decision, "Use 2px.")
})

test("closing a record with no Decision section refuses rather than losing the answer", () => {
  assert.throws(
    () => answeredRecordSource(record("- Status: open"), "Use 2px."),
    /no Decision section/,
  )
})

test("opening a record writes the status the parser reads back", () => {
  const source = openRecord({
    title: "Paper stroke values",
    type: "design",
    issueUrl: "https://github.com/pagopa/ui/issues/42",
    owners: ["gunzip"],
    preview: "https://example.test/?path=/story/reviews-paper-stroke--option-a",
    context: "The card disagrees with the drawing.",
    options: "- A — keep 1px",
  })
  const parsed = readDesignRequestRecord(source)
  assert.equal(parsed.state, "open")
  assert.equal(parsed.decision, "")
  assert.match(source, /- Decision owner: @gunzip/)
})

// The config declares the design paths the readers resolve, and these are the
// values the modules fall back on. The parse is only worth reading if it
// resolves the same strings, so the duplication is asserted rather than trusted.
test("the config resolves the design paths the readers use", () => {
  assert.deepEqual(designPaths(parseFigmaConfig(configSource())), {
    requests: "docs/design-requests",
    owners: ["gunzip"],
    preview: "https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net",
    previewBranch: "feedback/previews",
  })
})

test("the config parser refuses a broken document rather than reading a partial one", () => {
  assert.throws(
    () => parseFigmaConfig("figma:\n  snapshot: .figma/x.json\n\tbad: ["),
    /figma-to-code\.yaml/,
  )
  assert.throws(() => parseFigmaConfig("- item\n"), /figma-to-code\.yaml/)
  assert.throws(() => parseFigmaConfig("design:\n  owners: gunzip\n"), /design\.owners/)
})

test("a nested key is read through the block it sits in", () => {
  const config = parseFigmaConfig("design:\n  preview:\n    url: a\n    branch: b\n  requests: c\n")
  assert.deepEqual(designPaths(config), {
    requests: "c",
    owners: [],
    preview: "a",
    previewBranch: "b",
  })
})

test("a list of scalars is read as a list", () => {
  const config = parseFigmaConfig("design:\n  owners:\n    - gunzip\n    - someone\n")
  assert.deepEqual(designPaths(config).owners, ["gunzip", "someone"])
})

test("a comment after a value is not part of it", () => {
  const config = parseFigmaConfig("design:\n  requests: docs/questions  # moved here\n")
  assert.equal(designPaths(config).requests, "docs/questions")
})

test("a workspace with no config falls back on the default path", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ui-cli-config-"))
  try {
    const workspace = { root, workspaceRoot: root, path: (file) => path.join(root, file) }
    assert.deepEqual(designPaths(readFigmaConfig(workspace)), {
      requests: DEFAULT_REQUESTS_DIR,
      owners: [],
      preview: "none",
      previewBranch: "",
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("requestPointer finds the pointers under the folder it is given, and no others", () => {
  const note =
    "Open design question: docs/design-requests/2026-11-08-button-focus-ring.md. Also design/questions/2026-01-01-ring.md."
  assert.deepEqual(
    note.match(requestPointer("docs/design-requests"))?.map((match) => match),
    ["docs/design-requests/2026-11-08-button-focus-ring.md"],
  )
  // A config that moved the requests moves every reader with it.
  assert.deepEqual(note.match(requestPointer("design/questions")), [
    "design/questions/2026-01-01-ring.md",
  ])
  // The trailing slash a config may carry does not double up.
  assert.equal(
    requestPointer("docs/design-requests/").test("docs/design-requests/2026-11-08-ring.md"),
    true,
  )
  // A folder that starts with a non-word character still follows a space.
  assert.equal(
    requestPointer("./docs/questions").test("Design request: ./docs/questions/2026-11-08-ring.md"),
    true,
  )
  // The same folder does not match inside a longer path.
  assert.equal(
    requestPointer("docs/design-requests").test("Design request: other/docs/design-requests/x.md"),
    false,
  )
})
