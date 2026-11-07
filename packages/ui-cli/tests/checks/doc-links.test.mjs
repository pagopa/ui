import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { checkDocLinks } from "../../src/checks/doc-links.ts"
import { createContext } from "../../src/commands/context.ts"
import { createCli } from "../../src/commands/index.ts"
import { unresolvedCliTokens } from "../../src/commands/resolve.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

const SKILL = ".agents/skills/figma-to-code"

function cliCommand(tokens, root) {
  const context = createContext({ env: {}, cwd: root, io: { out() {}, err() {} } })
  return unresolvedCliTokens(createCli(context), tokens)
}

function check(files) {
  const tree = fixtureTree(files)
  const nx = path.join(tree.root, "node_modules/.bin/nx")
  if (fs.existsSync(nx)) fs.chmodSync(nx, 0o755)
  try {
    return checkDocLinks(workspaceAt(tree.root), {
      env: {},
      cliCommand: (tokens) => cliCommand(tokens, tree.root),
    })
  } finally {
    tree.dispose()
  }
}

const problems = (report) => report.problems.join("\n")

test("resolving links, code spans, config paths and script references passes", () => {
  const result = check({
    "AGENTS.md": "See [the skill](.agents/skills/figma-to-code/SKILL.md) and `src/index.css:12`.",
    [`${SKILL}/SKILL.md`]: "Read [init](references/init.md), then `figma-to-code.yaml`.",
    [`${SKILL}/references/init.md`]: "Run `pnpm check:catalogue` from `scripts/`.",
    "figma-to-code.yaml":
      "catalog:\n  registry: src/index.css\nstorybook:\n  url: http://localhost:6006\nfigma:\n  snapshot: .figma/live-rest.json\n",
    "src/index.css": "",
    "scripts/tool.mjs": 'const hint = "load the skill in AGENTS.md"',
  })
  assert.deepEqual(result.problems, [])
  assert.match(result.summary, /documents, config and scripts resolve/)
})

test("a markdown link to a deleted document fails", () => {
  assert.match(
    problems(check({ "README.md": "[old](docs/reports/gone.md)" })),
    /README\.md:1: missing link docs\/reports\/gone\.md/,
  )
})

test("a code span naming a missing repository path fails", () => {
  assert.match(
    problems(check({ "CONTRIBUTING.md": "Edit `scripts/gone.mjs`.", "scripts/keep.mjs": "" })),
    /missing path `scripts\/gone\.mjs`/,
  )
})

test("historical documents are checked on links only", () => {
  assert.deepEqual(
    check({ "docs/plans/next.md": "Will add `scripts/future.mjs`.", "scripts/keep.mjs": "" })
      .problems,
    [],
  )
})

test("a config path that does not exist fails", () => {
  assert.match(
    problems(check({ "figma-to-code.yaml": "catalog:\n  registry: src/catalog/registry.json\n" })),
    /figma-to-code\.yaml:2: missing path src\/catalog\/registry\.json/,
  )
})

test("the review pull request number and branch are not path claims", () => {
  assert.deepEqual(
    check({
      "figma-to-code.yaml":
        "design:\n  preview:\n    url: https://example.azurestaticapps.net\n    pr: 42\n    branch: feedback/previews\n",
    }).problems,
    [],
  )
})

test("a script that points to a removed skill or document fails", () => {
  const result = problems(
    check({
      "scripts/tool.mjs": 'const hint = ".agents/skills/old-skill/references/x.md"',
      [`${SKILL}/SKILL.md`]: "",
    }),
  )
  assert.match(result, /missing document \.agents\/skills\/old-skill\/references\/x\.md/)
  assert.match(result, /missing skill old-skill/)
})

test("the figma-to-code skill stays agnostic", () => {
  const result = problems(
    check({
      [`${SKILL}/SKILL.md`]: "Like docs/decisions say (ADR-0001), node 123:4567 uses Banner.",
      "src/components/feedback/banner.tsx": "export function Banner() { return null }",
    }),
  )
  assert.match(result, /cites a docs\/ path/)
  assert.match(result, /cites an ADR/)
  assert.match(result, /names a node id 123:4567/)
  assert.match(result, /names the component Banner/)
})

test("other skills may name components and the shadcn skill is skipped", () => {
  assert.deepEqual(
    check({
      ".agents/skills/other/SKILL.md": "Banner lives in `src/components/feedback/banner.tsx`.",
      ".agents/skills/shadcn/SKILL.md": "[x](missing.md)",
      "src/components/feedback/banner.tsx": "export function Banner() { return null }",
    }).problems,
    [],
  )
})

const fakeNx = `#!/bin/sh
case "$1 $2" in
  "show projects") printf '["alpha","beta"]\\n' ;;
  "show project") printf '{"targets":{"build":{},"test":{},"lint":{},"typecheck":{}}}\\n' ;;
  *) exit 1 ;;
esac
`

function projectTree(extra = {}) {
  return {
    "nx.json": '{"targetDefaults":{}}',
    "package.json": JSON.stringify({ name: "root", scripts: { lint: "oxlint", fmt: "oxfmt" } }),
    "node_modules/.bin/nx": fakeNx,
    "apps/alpha/project.json": JSON.stringify({ name: "alpha", targets: { build: {} } }),
    "apps/alpha/package.json": JSON.stringify({ name: "alpha" }),
    ...extra,
  }
}

test("commands naming an existing Nx target and a root script pass", () => {
  const result = check(
    projectTree({
      "AGENTS.md":
        "Run `pnpm nx run alpha:build`, `pnpm nx run-many -p alpha,beta -t test` and `pnpm lint`.",
    }),
  )
  assert.deepEqual(result.problems, [])
})

test("an unknown Nx target, project or root script fails", () => {
  const result = problems(
    check(
      projectTree({
        "CONTRIBUTING.md":
          "Run `pnpm nx run alpha:deploy`, `pnpm nx run gamma:build` and `pnpm storybook`.",
      }),
    ),
  )
  assert.match(result, /unknown Nx target alpha:deploy/)
  assert.match(result, /unknown Nx project gamma/)
  assert.match(result, /unknown pnpm script storybook/)
})

test("run-many validates every project and target pair", () => {
  assert.match(
    problems(
      check(projectTree({ "README.md": "Run `pnpm nx run-many -p alpha -t build,deploy`." })),
    ),
    /unknown Nx target alpha:deploy/,
  )
})

test("a command with a placeholder is not validated and script-only fences are checked", () => {
  assert.deepEqual(
    check(
      projectTree({
        "AGENTS.md": "Use `pnpm nx run alpha:<target>`.\n\n```bash\npnpm nx run beta:test\n```\n",
      }),
    ).problems,
    [],
  )
})

test("without nx.json the Nx command check stays silent", () => {
  assert.deepEqual(check({ "AGENTS.md": "Run `pnpm nx run anything:anywhere`." }).problems, [])
})

test("an unknown ui-cli command in inline code fails", () => {
  assert.match(
    problems(check({ "README.md": "Run `pnpm ui-cli check missing`." })),
    /unknown ui-cli command "ui-cli check missing"/,
  )
})

test("an unknown ui-cli flag in a fenced command fails", () => {
  assert.match(
    problems(check({ "README.md": "```sh\npnpm ui-cli check text-defaults --mxa 3\n```" })),
    /unknown ui-cli flag --mxa/,
  )
})

test("a known ui-cli command with a placeholder flag value passes", () => {
  assert.deepEqual(
    check({ "README.md": "Use `pnpm ui-cli check text-defaults --max <n>`." }).problems,
    [],
  )
})

test("check docs prints the docs report contract", async () => {
  const tree = fixtureTree({ "README.md": "Documentation fixture." })
  try {
    const result = await runCli(["check", "docs"], { root: tree.root })
    assert.equal(result.status, 0)
    assert.match(result.stdout, /^docs: OK — \d+ documents, config and scripts resolve$/)
  } finally {
    tree.dispose()
  }
})
