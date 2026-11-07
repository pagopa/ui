import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { createWorkspace } from "../../src/adapters/workspace.ts"
import { repeated } from "../../src/commands/args.ts"
import { fixtureTree, runCli } from "../helpers/cli.mjs"

test("an unknown command is a usage error", async () => {
  const result = await runCli(["nope"])
  assert.equal(result.status, 2)
  assert.match(result.stderr, /Unknown command nope/)
})

test("--help prints the usage of the named command and exits 0", async () => {
  const result = await runCli(["check", "--help"])
  assert.equal(result.status, 0)
  assert.match(result.stdout, /USAGE ui-cli check/)
})

test("PAGOPA_UI_ROOT names the root, relative to the working directory", () => {
  const tree = fixtureTree({ "pkg/src/index.ts": "" })
  try {
    const workspace = createWorkspace({ env: { PAGOPA_UI_ROOT: "pkg" }, cwd: tree.root })
    assert.equal(workspace.root, path.join(tree.root, "pkg"))
    assert.equal(workspace.path("src/index.ts"), path.join(tree.root, "pkg/src/index.ts"))
  } finally {
    tree.dispose()
  }
})

test("a workspace resolves the sibling packages and both identity bases", () => {
  const tree = fixtureTree({
    "pnpm-workspace.yaml": "",
    "packages/pagopa-ui/src/a.ts": "",
    "packages/artwork/package.json": "{}",
    "apps/storybook/src/b.tsx": "",
  })
  try {
    const workspace = createWorkspace({
      env: { PAGOPA_UI_ROOT: "packages/pagopa-ui" },
      cwd: tree.root,
    })
    assert.equal(workspace.workspaceRoot, tree.root)
    assert.equal(workspace.artworkRoot, path.join(tree.root, "packages/artwork"))
    // No tokens package: a fixture owns its data, so the root stands in.
    assert.equal(workspace.tokensRoot, workspace.root)
    assert.equal(workspace.storiesRoot, path.join(tree.root, "apps/storybook"))
    assert.equal(
      workspace.path("apps/storybook/src/b.tsx"),
      path.join(tree.root, "apps/storybook/src/b.tsx"),
    )
    assert.equal(workspace.identity(workspace.path("src/a.ts")), "src/a.ts")
    assert.equal(
      workspace.identity(path.join(tree.root, "apps/storybook/src/b.tsx")),
      "apps/storybook/src/b.tsx",
    )
    assert.ok(fs.existsSync(workspace.path("src/a.ts")))
  } finally {
    tree.dispose()
  }
})

test("repeated flags keep every value in order", () => {
  assert.deepEqual(repeated(["--click", "a", "--node", "1:2", "--click=b"], "click"), ["a", "b"])
  assert.deepEqual(repeated(["--node", "1:2"], "click"), [])
})
