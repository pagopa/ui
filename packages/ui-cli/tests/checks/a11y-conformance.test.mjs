import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

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

function check({ report = REPORT, guide = GUIDE, map = MAP } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-a11y-conformance-"))
  try {
    const files = {
      "pnpm-workspace.yaml": "packages:\n  - packages/*\n  - apps/*\n",
      "packages/pagopa-ui/etc/pagopa-ui.api.md": report,
      "apps/storybook/src/guides/accessibility.md": guide,
      "apps/storybook/src/a11y/conformance.json": JSON.stringify(map, null, 2),
    }
    for (const [file, source] of Object.entries(files)) {
      const target = path.join(root, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, source)
    }
    return spawnSync(process.execPath, [script, "check", "a11y-conformance"], {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnv(path.join(root, "packages/pagopa-ui")),
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("a complete map passes and ignores types and lowercase exports", () => {
  const result = check()
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /a11y-conformance OK \(2 components, 2 types\)/)
})

test("a runtime export with no entry fails", () => {
  const result = check({
    report: REPORT.replace(
      "export function Button",
      "export declare function Probe(): null;\nexport function Button",
    ),
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /"Probe" has no conformance entry/)
})

test("an entry naming an export that no longer exists fails", () => {
  const result = check({
    map: { ...MAP, components: { ...MAP.components, Gone: { type: "Button" } } },
  })
  assert.equal(result.status, 1)
  assert.match(
    result.stderr,
    /"Gone" is not a runtime export of packages\/pagopa-ui\/etc\/pagopa-ui\.api\.md/,
  )
})

test("a type outside the declared list fails", () => {
  const result = check({
    map: { ...MAP, components: { ...MAP.components, Button: { type: "Link" } } },
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /"Button" names the type "Link", which is not in "types"/)
})

test("a declared type that is not a row of the guide table fails", () => {
  const result = check({ map: { ...MAP, types: [...MAP.types, "Link"] } })
  assert.equal(result.status, 1)
  assert.match(
    result.stderr,
    /"Link" is not a component type of apps\/storybook\/src\/guides\/accessibility\.md/,
  )
})

test("a null type without a reason fails", () => {
  const result = check({
    map: { ...MAP, components: { ...MAP.components, UIProvider: { type: null } } },
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /"UIProvider" has no type and no reason/)
})
