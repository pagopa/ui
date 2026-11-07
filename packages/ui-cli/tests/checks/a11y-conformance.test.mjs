import assert from "node:assert/strict"
import { test } from "node:test"

import { checkA11yConformance } from "../../src/checks/a11y-conformance.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

const REPORT = `## API Report File for "@pagopa/ui"

\`\`\`ts
export function Button(input: { label: string }): null;
export const UIProvider: (input: { children: unknown }) => null;
export function useLinkComponent(): unknown;
export interface ButtonProps {
    label: string;
}
\`\`\`
`

const GUIDE = `The library targets WCAG 2.2 AA.

## Criteria by component type

| Component type | Criteria | Verification | Current outcome |
| -------------- | -------- | ------------ | --------------- |
| Button         | 2.1.1    | axe.         | Passing.        |
| Field          | 1.3.1    | axe.         | Passing.        |

## What this flow changed
`

const MAP = {
  types: ["Button", "Field"],
  components: {
    Button: { type: "Button" },
    UIProvider: { type: null, reason: "renders no UI" },
  },
}

function fixture({ report = REPORT, guide = GUIDE, map = MAP } = {}) {
  return fixtureTree({
    "etc/pagopa-ui.api.md": report,
    "apps/storybook/src/guides/accessibility.md": guide,
    "apps/storybook/src/a11y/conformance.json": map,
  })
}

test("a complete map passes and ignores types and lowercase exports", () => {
  const tree = fixture()
  try {
    const result = checkA11yConformance(workspaceAt(tree.root))
    assert.deepEqual(result.problems, [])
    assert.equal(result.summary, "2 components, 2 types")
  } finally {
    tree.dispose()
  }
})

test("a runtime export with no entry fails", () => {
  const tree = fixture({
    report: REPORT.replace(
      "export function Button",
      "export declare function Probe(): null;\nexport function Button",
    ),
  })
  try {
    assert.ok(
      checkA11yConformance(workspaceAt(tree.root)).problems.some((problem) =>
        problem.includes('"Probe" has no conformance entry'),
      ),
    )
  } finally {
    tree.dispose()
  }
})

test("an entry naming an export that no longer exists fails", () => {
  const tree = fixture({
    map: { ...MAP, components: { ...MAP.components, Gone: { type: "Button" } } },
  })
  try {
    assert.ok(
      checkA11yConformance(workspaceAt(tree.root)).problems.some((problem) =>
        problem.includes('"Gone" is not a runtime export'),
      ),
    )
  } finally {
    tree.dispose()
  }
})

test("a type outside the declared list fails", () => {
  const tree = fixture({
    map: { ...MAP, components: { ...MAP.components, Button: { type: "Link" } } },
  })
  try {
    assert.ok(
      checkA11yConformance(workspaceAt(tree.root)).problems.some((problem) =>
        problem.includes('"Button" names the type "Link"'),
      ),
    )
  } finally {
    tree.dispose()
  }
})

test("a declared type that is not a row of the guide table fails", () => {
  const tree = fixture({ map: { ...MAP, types: [...MAP.types, "Link"] } })
  try {
    assert.ok(
      checkA11yConformance(workspaceAt(tree.root)).problems.some((problem) =>
        problem.includes('"Link" is not a component type'),
      ),
    )
  } finally {
    tree.dispose()
  }
})

test("a null type without a reason fails", () => {
  const tree = fixture({
    map: { ...MAP, components: { ...MAP.components, UIProvider: { type: null } } },
  })
  try {
    assert.ok(
      checkA11yConformance(workspaceAt(tree.root)).problems.some((problem) =>
        problem.includes('"UIProvider" has no type and no reason'),
      ),
    )
  } finally {
    tree.dispose()
  }
})

test("check a11y prints the report name and verdict", async () => {
  const tree = fixture()
  try {
    const result = await runCli(["check", "a11y"], { root: tree.root })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /^a11y conformance: OK — 2 components, 2 types$/)
  } finally {
    tree.dispose()
  }
})
