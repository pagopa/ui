import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  designPaths,
  issuePointers,
  parseFigmaConfig,
  readFigmaConfig,
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

// The config declares the design values the readers resolve, and these are the
// values the modules fall back on. The parse is only worth reading if it
// resolves the same strings, so the duplication is asserted rather than trusted.
test("the config resolves the design values the readers use", () => {
  assert.deepEqual(designPaths(parseFigmaConfig(configSource())), {
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
  const config = parseFigmaConfig("design:\n  preview:\n    url: a\n    branch: b\n")
  assert.deepEqual(designPaths(config), {
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
  const config = parseFigmaConfig(
    "design:\n  preview:\n    branch: feedback/previews  # moved here\n",
  )
  assert.equal(designPaths(config).previewBranch, "feedback/previews")
})

test("a workspace with no config falls back on the values the modules used", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ui-cli-config-"))
  try {
    const workspace = { root, workspaceRoot: root, path: (file) => path.join(root, file) }
    assert.deepEqual(designPaths(readFigmaConfig(workspace)), {
      owners: [],
      preview: "none",
      previewBranch: "",
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// The pointer is the issue URL, because the tracker is the only home: a note, a
// rule card, a census row and a foundation exception all say the same thing.
test("issuePointers reads every issue URL a note names, once each", () => {
  const note = [
    "Design request: https://github.com/pagopa/ui/issues/27",
    "Follow-up: https://github.com/pagopa/ui/issues/144.",
    "and https://github.com/pagopa/ui/issues/27 again",
  ].join("\n")
  assert.deepEqual(issuePointers(note), [
    "https://github.com/pagopa/ui/issues/27",
    "https://github.com/pagopa/ui/issues/144",
  ])
})

test("issuePointers finds nothing in a note that points at no issue", () => {
  assert.deepEqual(issuePointers("Design request: docs/design-requests/x.md"), [])
  assert.deepEqual(issuePointers(null), [])
  // A pull request is not a design request.
  assert.deepEqual(issuePointers("https://github.com/pagopa/ui/pull/214"), [])
})
