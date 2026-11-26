import assert from "node:assert/strict"
import fs from "node:fs"
import { test } from "node:test"

import {
  checkPublicTokens,
  publicTokenNames,
  updatePublicTokens,
} from "../../src/checks/public-tokens.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

const CSS = `:root {
  --pui-primary: #0b3ee3;
  --pui-border: #e8ebf1;
}

/* Internal Figma primitives (internal, deprecated) */
:root {
  /* Color/Blue/Blue 100 */
  --figma-color-blue-100: #ced8f9;
  /* Foundations/z-50 */
  --figma-z-50: 50;
}
`
const SEMANTIC = `export const semanticTokens: SemanticToken[] = [
  {
    cssName: "--pui-primary",
  },
  {
    cssName: "--pui-border",
  },
]
`
const INVENTORY = `export const figmaTokens: FigmaToken[] = [
  {
    cssName: "--figma-color-blue-100",
  },
  {
    cssName: "text-body",
  },
]
`
const CONTRACT = [
  "--figma-color-blue-100",
  "--figma-z-50",
  "--pui-border",
  "--pui-primary",
  "js:--figma-color-blue-100",
  "js:--pui-border",
  "js:--pui-primary",
  "js:text-body",
  "",
].join("\n")

function fixture(files = {}) {
  const tree = fixtureTree({
    "src/tokens.generated.css": CSS,
    "src/figma-tokens.generated.ts": INVENTORY,
    "src/pui-tokens.generated.ts": SEMANTIC,
    "etc/tokens.txt": CONTRACT,
    ...files,
  })
  return { ...tree, workspace: workspaceAt(tree.root, { PAGOPA_UI_TOKENS_ROOT: tree.root }) }
}

test("identical CSS and typed lists pass", async () => {
  const tree = fixture()
  try {
    const result = await checkPublicTokens(tree.workspace)
    assert.deepEqual(result.problems, [])
    assert.equal(result.summary, "4 CSS names, 4 typed names, 8 in etc/tokens.txt")
    assert.deepEqual(await publicTokenNames(tree.root), {
      css: ["--pui-primary", "--pui-border", "--figma-color-blue-100", "--figma-z-50"],
      js: ["js:--pui-primary", "js:--pui-border", "js:--figma-color-blue-100", "js:text-body"],
    })
  } finally {
    tree.dispose()
  }
})

test("a removed token fails as a breaking change", async () => {
  const tree = fixture({ "etc/tokens.txt": CONTRACT.replace("--figma-z-50\n", "") })
  try {
    const result = await checkPublicTokens(tree.workspace)
    assert.match(result.summary, /1 added, 0 removed/)
    assert.ok(result.problems.includes("+ --figma-z-50"))
    assert.match(result.summary, /a removed or renamed token is a breaking change/)
  } finally {
    tree.dispose()
  }
})

test("removing a semantic token is a breaking change of the contract", async () => {
  const tree = fixture({ "etc/tokens.txt": CONTRACT.replace("--pui-border\n", "") })
  try {
    const result = await checkPublicTokens(tree.workspace)
    assert.match(result.summary, /1 added, 0 removed/)
    assert.ok(result.problems.includes("+ --pui-border"))
  } finally {
    tree.dispose()
  }
})

test("a stale name in the contract is reported as removed", async () => {
  const tree = fixture({ "etc/tokens.txt": `${CONTRACT}js:text-retired\n` })
  try {
    const result = await checkPublicTokens(tree.workspace)
    assert.match(result.summary, /0 added, 1 removed/)
    assert.ok(result.problems.includes("- js:text-retired"))
  } finally {
    tree.dispose()
  }
})

test("new CSS and typed names are reported as added", async () => {
  const tree = fixture({
    "src/tokens.generated.css": CSS.replace(
      "  --figma-z-50: 50;",
      "  --figma-z-50: 50;\n  --figma-spacing-4: 4px;",
    ),
    "src/figma-tokens.generated.ts": INVENTORY.replace(
      'cssName: "text-body",',
      'cssName: "text-body",\n  },\n  {\n    cssName: "text-label",',
    ),
  })
  try {
    const result = await checkPublicTokens(tree.workspace)
    assert.match(result.summary, /2 added, 0 removed/)
    assert.ok(result.problems.includes("+ --figma-spacing-4"))
    assert.ok(result.problems.includes("+ js:text-label"))
  } finally {
    tree.dispose()
  }
})

test("updatePublicTokens records the accepted list and the check passes afterwards", async () => {
  const tree = fixture({ "etc/tokens.txt": "--figma-color-blue-100\n" })
  try {
    assert.match(await updatePublicTokens(tree.workspace), /public tokens written: 8 names/)
    const result = await checkPublicTokens(tree.workspace)
    assert.deepEqual(result.problems, [])
    assert.equal(fs.readFileSync(tree.workspace.path("etc/tokens.txt"), "utf8"), CONTRACT)
  } finally {
    tree.dispose()
  }
})

test("a missing contract starts with every generated name added", async () => {
  const tree = fixture({ "etc/tokens.txt": null })
  try {
    const result = await checkPublicTokens(tree.workspace)
    assert.match(result.summary, /8 added, 0 removed/)
  } finally {
    tree.dispose()
  }
})

test("check and update public-tokens expose their formatted contracts", async () => {
  const tree = fixture()
  try {
    const checked = await runCli(["check", "public-tokens"], {
      root: tree.root,
      env: { PAGOPA_UI_TOKENS_ROOT: tree.root },
    })
    assert.equal(checked.status, 0)
    assert.match(
      checked.stdout,
      /^public tokens: OK — 4 CSS names, 4 typed names, 8 in etc\/tokens\.txt$/,
    )
    const updated = await runCli(["update", "public-tokens"], {
      root: tree.root,
      env: { PAGOPA_UI_TOKENS_ROOT: tree.root },
    })
    assert.equal(updated.status, 0)
    assert.match(updated.stdout, /^public tokens written: 8 names/)
  } finally {
    tree.dispose()
  }
})
