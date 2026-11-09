import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { testingAdapters } from "../../src/adapters/testing.ts"
import { missingVisualBaselines, runVisual, visualScope } from "../../src/testing/visual.ts"
import { UNSTABLE_VISUAL_STORIES } from "../../src/testing/visual-cases.ts"

const FILES = {
  "pnpm-workspace.yaml": "packages:\n  - packages/*\n  - apps/*\n",
  "package.json": '{ "name": "fixture", "private": true }\n',
  "packages/pagopa-ui/package.json": '{ "name": "@pagopa/ui", "private": true }\n',
  // The design-system stylesheet chain: a change here reaches every story
  // through the preview, not through an import a story writes itself.
  "packages/pagopa-ui/src/index.css": '@import "./base.css";\n',
  "packages/pagopa-ui/src/base.css": "html { color: black }\n",
  "packages/pagopa-ui/src/components/button.tsx":
    'import "./button.css"\n\nexport const Button = () => null\n',
  "packages/pagopa-ui/src/components/button.css": ".button { color: red }\n",
  "packages/pagopa-ui/src/components/card.tsx":
    "export interface CardProps { title: string }\n\nexport const Card = () => null\n",
  "packages/pagopa-ui/src/components/logo.svg": '<svg viewBox="0 0 1 1"></svg>\n',
  "apps/storybook/vite.config.ts": "export default {}\n",
  "apps/storybook/.storybook/main.ts": "export default { stories: [] }\n",
  "apps/storybook/.storybook/preview.tsx": 'import "../../src/preview.css"\n',
  "apps/storybook/src/preview.css": '@import "../../../packages/pagopa-ui/src/index.css";\n',
  "apps/storybook/src/button.stories.tsx":
    'import { Button } from "@/components/button"\n\nexport const Primary = () => null\nexport const Secondary = () => null\n',
  "apps/storybook/src/card.stories.tsx":
    'import { Card } from "@/components/card"\n\nexport const Plain = () => null\n',
  // A type-only import is erased: the card's shape cannot move this story.
  "apps/storybook/src/typed.stories.tsx":
    'import type { CardProps } from "@/components/card"\n\nexport const Typed = () => null\n',
  // A Vite suffix names the same module: the `.svg` before `?raw` is the file.
  "apps/storybook/src/logo.stories.tsx":
    'import logo from "@/components/logo.svg?raw"\n\nexport const Logo = () => null\n',
}

const INDEX = {
  entries: {
    "components-button--primary": {
      id: "components-button--primary",
      type: "story",
      importPath: "./src/button.stories.tsx",
    },
    "components-button--secondary": {
      id: "components-button--secondary",
      type: "story",
      importPath: "./src/button.stories.tsx",
    },
    "components-card--plain": {
      id: "components-card--plain",
      type: "story",
      importPath: "./src/card.stories.tsx",
    },
    "components-card--typed": {
      id: "components-card--typed",
      type: "story",
      importPath: "./src/typed.stories.tsx",
    },
    "components-logo--logo": {
      id: "components-logo--logo",
      type: "story",
      importPath: "./src/logo.stories.tsx",
    },
    "components-card--docs": {
      id: "components-card--docs",
      type: "story",
      importPath: "./src/card.stories.tsx",
      tags: ["no-visual"],
    },
    "docs-introduction--page": { type: "docs", importPath: "./src/card.stories.tsx" },
  },
}

// A workspace-shaped tree: the stories app, the design system beside it and the
// two manifests the tooling reads.
function workspace() {
  const root = fixtureTree({}, "pagopa-visual-scope-").root
  for (const [file, content] of Object.entries(FILES)) {
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }
  return {
    root,
    // Each test may add a story of its own: the index stays the shared shape.
    index: structuredClone(INDEX),
    roots: {
      storiesRoot: path.join(root, "apps/storybook"),
      designSystem: path.join(root, "packages/pagopa-ui/src"),
      workspace: root,
    },
  }
}

// A file the fixture did not lay down: the index and a changed component.
function write(root, file, content) {
  const target = path.join(root, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content)
  return target
}

function scopeOf(fixture, changed) {
  process.env.PAGOPA_UI_ROOT = fixture.root
  try {
    return visualScope(changed, fixture.index, fixture.roots)
  } finally {
    delete process.env.PAGOPA_UI_ROOT
  }
}

test("a component change names only the stories that import it", () => {
  const fixture = workspace()
  const scope = scopeOf(fixture, ["packages/pagopa-ui/src/components/button.tsx"])

  assert.equal(scope.mode, "stories")
  assert.deepEqual(scope.stories, ["components-button--primary", "components-button--secondary"])
})

test("a stylesheet the component imports is followed", () => {
  const fixture = workspace()
  const scope = scopeOf(fixture, ["packages/pagopa-ui/src/components/button.css"])

  assert.deepEqual(scope.stories, ["components-button--primary", "components-button--secondary"])
})

test("a shared stylesheet reaches every story", () => {
  const fixture = workspace()
  const scope = scopeOf(fixture, ["packages/pagopa-ui/src/base.css"])

  // `base.css` is reached from `index.css`, which the preview imports, so no
  // story file mentions it.
  assert.deepEqual(scope.stories, [
    "components-button--primary",
    "components-button--secondary",
    "components-card--plain",
    "components-card--typed",
    "components-logo--logo",
  ])
})

test("a type-only import does not tie a story to the change", () => {
  const fixture = workspace()
  const scope = scopeOf(fixture, ["packages/pagopa-ui/src/components/card.tsx"])

  assert.deepEqual(scope.stories, ["components-card--plain"])
})

test("a Vite suffix names the module it decorates", () => {
  const fixture = workspace()
  const scope = scopeOf(fixture, ["packages/pagopa-ui/src/components/logo.svg"])

  assert.deepEqual(scope.stories, ["components-logo--logo"])
})

test("a story file reaches only the stories it declares", () => {
  const fixture = workspace()
  const scope = scopeOf(fixture, ["apps/storybook/src/card.stories.tsx"])

  // The `no-visual` story declared in the same file is never captured, so it is
  // never named; the type-only story lives elsewhere.
  assert.deepEqual(scope.stories, ["components-card--plain"])
})

test("a change that can move every screenshot runs everything", () => {
  const fixture = workspace()
  for (const changed of [
    "pnpm-lock.yaml",
    "packages/tokens/src/figma.generated.css",
    "packages/artwork/src/logo.svg",
    "packages/pagopa-ui/src/assets/font.woff2",
    "apps/storybook/.storybook/preview.tsx",
    "apps/storybook/visual/visual.spec.ts",
    "packages/ui-cli/src/testing/visual-cases.ts",
  ]) {
    const scope = scopeOf(fixture, [changed])
    assert.equal(scope.mode, "all", changed)
    assert.equal(scope.reason, changed)
  }
})

test("a deleted source runs everything", () => {
  const fixture = workspace()
  fs.rmSync(path.join(fixture.root, "packages/pagopa-ui/src/components/card.tsx"))
  const scope = scopeOf(fixture, [
    "packages/pagopa-ui/src/components/card.tsx",
    "packages/pagopa-ui/src/components/button.css",
  ])

  // The import that pointed at the file no longer resolves: the walk cannot see
  // which story lost it, so it names none and lets everything run.
  assert.equal(scope.mode, "all")
  assert.equal(scope.reason, "deleted packages/pagopa-ui/src/components/card.tsx")
})

test("a deleted document outside the built trees does not widen the scope", () => {
  const fixture = workspace()
  const scope = scopeOf(fixture, ["README.md", "packages/pagopa-ui/src/components/card.tsx"])

  assert.equal(scope.mode, "stories")
  assert.deepEqual(scope.stories, ["components-card--plain"])
})

test("a committed baseline does not widen the scope", () => {
  const fixture = workspace()
  const scope = scopeOf(fixture, [
    "apps/storybook/visual/__screenshots__/components-card--plain-600.png",
    "packages/pagopa-ui/src/components/card.tsx",
  ])

  assert.equal(scope.mode, "stories")
  assert.deepEqual(scope.changed, ["packages/pagopa-ui/src/components/card.tsx"])
  assert.deepEqual(scope.stories, ["components-card--plain"])
})

test("a source the walk cannot read runs everything", () => {
  const fixture = workspace()
  write(fixture.root, "packages/pagopa-ui/src/components/broken.tsx", "export const = 1\n")
  write(
    fixture.root,
    "apps/storybook/src/broken.stories.tsx",
    'import { broken } from "@/components/broken"\n',
  )
  fixture.index.entries["components-broken--broken"] = {
    id: "components-broken--broken",
    type: "story",
    importPath: "./src/broken.stories.tsx",
  }

  const scope = scopeOf(fixture, ["packages/pagopa-ui/src/components/broken.tsx"])

  assert.equal(scope.mode, "all")
  assert.match(scope.reason, /broken\.tsx/)
})

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

function commit(root, message) {
  git(root, ["add", "-A"])
  git(root, [
    "-c",
    "user.email=fixture@example.com",
    "-c",
    "user.name=Fixture",
    "commit",
    "-q",
    "-m",
    message,
  ])
  return git(root, ["rev-parse", "HEAD"])
}

function visual(root, options = {}) {
  try {
    const result = runVisual(
      workspaceAt(path.join(root, "packages/pagopa-ui")),
      options,
      testingAdapters({ PATH: process.env.PATH }),
    )
    return { status: result.code, stdout: result.out.join("\n"), stderr: result.err.join("\n") }
  } catch (error) {
    return { status: error.exitCode ?? 1, stdout: "", stderr: error.message }
  }
}

test("the diff against a ref becomes the scope file the runner reads", () => {
  const fixture = workspace()
  write(fixture.root, "apps/storybook/dist/index.json", JSON.stringify(fixture.index))
  git(fixture.root, ["init", "-q"])
  const base = commit(fixture.root, "base")
  write(fixture.root, "packages/pagopa-ui/src/components/card.tsx", "export const Card = () => 1\n")
  commit(fixture.root, "card")

  const result = visual(fixture.root, { since: base, out: "scope.json" })
  assert.equal(result.status, 0, result.stderr)

  const scope = JSON.parse(fs.readFileSync(path.join(fixture.root, "scope.json"), "utf8"))
  assert.deepEqual(scope, {
    mode: "stories",
    stories: ["components-card--plain"],
    changed: ["packages/pagopa-ui/src/components/card.tsx"],
  })
  // The `no-visual` story and the docs entry are not part of the count.
  assert.match(result.stdout, /1 of 5 stories/)
})

test("`--all` names no story and needs no diff", () => {
  const fixture = workspace()
  write(fixture.root, "apps/storybook/dist/index.json", JSON.stringify(fixture.index))

  const result = visual(fixture.root, { all: true, json: true })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), { mode: "all", changed: [] })
})

test("an unreadable ref and a missing index are refusals, not empty runs", () => {
  const fixture = workspace()
  git(fixture.root, ["init", "-q"])
  commit(fixture.root, "base")

  const missingIndex = visual(fixture.root, { all: true })
  assert.equal(missingIndex.status, 2)
  assert.match(missingIndex.stderr, /build the Storybook first/)

  write(fixture.root, "apps/storybook/dist/index.json", JSON.stringify(fixture.index))
  const unknownRef = visual(fixture.root, { since: "origin/absent" })
  assert.equal(unknownRef.status, 2)
  assert.match(unknownRef.stderr, /cannot diff origin\/absent/)

  const noTarget = visual(fixture.root, {})
  assert.equal(noTarget.status, 2)
  assert.match(noTarget.stderr, /--since <ref> or --all/)
})

test("baseline preflight selects the same stories and widths as the visual suite", () => {
  const fixture = workspace()
  const scope = { mode: "all", changed: [] }
  const missing = missingVisualBaselines(fixture.index, scope, fixture.roots.storiesRoot)
  assert.equal(missing.length, 15)
  assert.deepEqual(
    missing
      .filter((file) => file.includes("components-card--plain"))
      .map((file) => path.basename(file)),
    [
      "components-card--plain-320.png",
      "components-card--plain-600.png",
      "components-card--plain-1200.png",
    ],
  )
  assert.ok(missing.every((file) => !file.includes("--docs") && !file.includes("introduction")))

  for (const file of missing) write(fixture.root, path.relative(fixture.root, file), "")
  fs.rmSync(missing[0])
  assert.deepEqual(missingVisualBaselines(fixture.index, scope, fixture.roots.storiesRoot), [
    missing[0],
  ])
})

test("scoped, empty and unstable stories require only snapshots the suite will run", () => {
  const fixture = workspace()
  const scope = { mode: "stories", stories: ["components-card--plain"], changed: [] }
  const missing = missingVisualBaselines(fixture.index, scope, fixture.roots.storiesRoot)
  assert.equal(missing.length, 3)
  assert.ok(missing.every((file) => file.includes("components-card--plain")))
  assert.deepEqual(
    missingVisualBaselines(
      fixture.index,
      { mode: "stories", stories: [], changed: [] },
      fixture.roots.storiesRoot,
    ),
    [],
  )

  UNSTABLE_VISUAL_STORIES.add("components-card--plain")
  try {
    assert.deepEqual(missingVisualBaselines(fixture.index, scope, fixture.roots.storiesRoot), [])
  } finally {
    UNSTABLE_VISUAL_STORIES.delete("components-card--plain")
  }
})

test("the CLI fails before capture for missing scoped images but leaves update mode usable", () => {
  const fixture = workspace()
  write(fixture.root, "apps/storybook/dist/index.json", JSON.stringify(fixture.index))
  git(fixture.root, ["init", "-q"])
  const base = commit(fixture.root, "base")
  write(fixture.root, "packages/pagopa-ui/src/components/card.tsx", "export const Card = () => 1\n")

  const args = { since: base, out: "scope.json" }
  const checked = visual(fixture.root, { ...args, checkBaselines: true })
  assert.equal(checked.status, 1, checked.stderr)
  assert.match(checked.stderr, /3 scoped baseline\(s\) missing/)
  assert.match(checked.stderr, /components-card--plain-320\.png/)
  assert.doesNotMatch(checked.stderr, /components-button/)
  assert.match(checked.stderr, /visual:update/)
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(fixture.root, "scope.json"), "utf8")).stories,
    ["components-card--plain"],
  )

  const update = visual(fixture.root, args)
  assert.equal(update.status, 0, update.stderr)
  for (const width of [320, 600, 1200]) {
    write(
      fixture.root,
      `apps/storybook/visual/__screenshots__/components-card--plain-${width}.png`,
      "",
    )
  }
  const untracked = visual(fixture.root, { ...args, checkBaselines: true })
  assert.equal(untracked.status, 1, untracked.stderr)
  assert.match(untracked.stderr, /3 scoped baseline\(s\) exist but are not tracked/)
  git(fixture.root, ["add", "apps/storybook/visual/__screenshots__"])
  const complete = visual(fixture.root, { ...args, checkBaselines: true, json: true })
  assert.equal(complete.status, 0, complete.stderr)
  assert.deepEqual(JSON.parse(complete.stdout).stories, ["components-card--plain"])
})

test("the CI check uses preflight and the separate update job does not", () => {
  const workflow = fs.readFileSync(
    new URL("../../../../.github/workflows/visual.yml", import.meta.url),
    "utf8",
  )
  const [check, update] = workflow.split("\n  visual-update:")
  assert.match(check, /--since "\$BASE" --out "\$VISUAL_SCOPE" --check-baselines/)
  assert.match(check, /--all --out "\$VISUAL_SCOPE" --check-baselines/)
  assert.ok(update)
  assert.doesNotMatch(update, /--check-baselines/)
})

test("the visual adapter returns the selected story ids as JSON", async () => {
  const f = workspace()
  try {
    write(f.root, "apps/storybook/dist/index.json", JSON.stringify(f.index))
    const result = await runCli(["test", "visual", "--all", "--json"], {
      root: path.join(f.root, "packages/pagopa-ui"),
      cwd: f.root,
    })
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), { mode: "all", changed: [] })
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true })
  }
})
