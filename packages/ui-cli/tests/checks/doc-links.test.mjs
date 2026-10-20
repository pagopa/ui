import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))
const SKILL = ".agents/skills/figma-to-code"

function check(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-doc-links-"))
  try {
    for (const [file, source] of Object.entries(files)) {
      const target = path.join(root, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, source)
    }
    return spawnSync(process.execPath, [script, "check", "docs"], {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnv(root),
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("resolving links, code spans, config paths and script references pass", () => {
  const result = check({
    "AGENTS.md": "See [the skill](.agents/skills/figma-to-code/SKILL.md) and `src/index.css:12`.",
    [`${SKILL}/SKILL.md`]: "Read [init](references/init.md), then `figma-to-code.yaml`.",
    [`${SKILL}/references/init.md`]: "Run `pnpm figma:check` from `scripts/`.",
    "figma-to-code.yaml":
      "catalog:\n  registry: src/index.css\nstorybook:\n  url: http://localhost:6006\nfigma:\n  snapshot: .figma/live-rest.json\n",
    "src/index.css": "",
    "scripts/tool.mjs": 'const hint = "load the skill in AGENTS.md"',
  })
  assert.equal(result.status, 0, result.stderr)
})

test("a markdown link to a deleted document fails", () => {
  const result = check({ "README.md": "[old](docs/reports/gone.md)" })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /README\.md:1: missing link docs\/reports\/gone\.md/)
})

test("a code span naming a missing repository path fails", () => {
  const result = check({ "CONTRIBUTING.md": "Edit `scripts/gone.mjs`.", "scripts/keep.mjs": "" })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing path `scripts\/gone\.mjs`/)
})

test("historical documents are checked on links only", () => {
  const result = check({
    "docs/plans/next.md": "Will add `scripts/future.mjs`.",
    "scripts/keep.mjs": "",
  })
  assert.equal(result.status, 0, result.stderr)
})

test("a config path that does not exist fails", () => {
  const result = check({
    "figma-to-code.yaml": "catalog:\n  registry: src/catalog/registry.json\n",
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /figma-to-code\.yaml:2: missing path src\/catalog\/registry\.json/)
})

test("a script that points to a removed skill or document fails", () => {
  const result = check({
    "scripts/tool.mjs": 'const hint = ".agents/skills/old-skill/references/x.md"',
    ".agents/skills/figma-to-code/SKILL.md": "",
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing document \.agents\/skills\/old-skill\/references\/x\.md/)
  assert.match(result.stderr, /missing skill old-skill/)
})

test("the figma-to-code skill stays agnostic", () => {
  const result = check({
    [`${SKILL}/SKILL.md`]: "Like docs/decisions say (ADR-0001), node 123:4567 uses Banner.",
    "src/components/feedback/banner.tsx": "export function Banner() { return null }",
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /cites a docs\/ path/)
  assert.match(result.stderr, /cites an ADR/)
  assert.match(result.stderr, /names a node id 123:4567/)
  assert.match(result.stderr, /names the component Banner/)
})

test("other skills may name components and the shadcn skill is skipped", () => {
  const result = check({
    ".agents/skills/other/SKILL.md": "Banner lives in `src/components/feedback/banner.tsx`.",
    ".agents/skills/shadcn/SKILL.md": "[x](missing.md)",
    "src/components/feedback/banner.tsx": "export function Banner() { return null }",
  })
  assert.equal(result.status, 0, result.stderr)
})
