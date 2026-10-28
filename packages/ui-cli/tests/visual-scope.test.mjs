import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../src/lib/paths.ts"
import { visualScope } from "../src/test/visual.ts"

const script = fileURLToPath(new URL("../src/cli.ts", import.meta.url))

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
  "apps/storybook/.storybook/preview.tsx": 'import "../src/preview.css"\n',
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-visual-scope-"))
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

function runCli(root, args) {
  // The tooling audits the design-system package; the workspace is the tree
  // that holds it.
  return spawnSync(process.execPath, [script, "test", "visual", ...args], {
    cwd: root,
    encoding: "utf8",
    env: fixtureEnv(root, { PAGOPA_UI_ROOT: path.join(root, "packages/pagopa-ui") }),
  })
}

test("the diff against a ref becomes the scope file the runner reads", () => {
  const fixture = workspace()
  write(fixture.root, "apps/storybook/dist/index.json", JSON.stringify(fixture.index))
  git(fixture.root, ["init", "-q"])
  const base = commit(fixture.root, "base")
  write(fixture.root, "packages/pagopa-ui/src/components/card.tsx", "export const Card = () => 1\n")
  commit(fixture.root, "card")

  const result = runCli(fixture.root, ["--since", base, "--out", "scope.json"])
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

  const result = runCli(fixture.root, ["--all", "--json"])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), { mode: "all", changed: [] })
})

test("an unreadable ref and a missing index are refusals, not empty runs", () => {
  const fixture = workspace()
  git(fixture.root, ["init", "-q"])
  commit(fixture.root, "base")

  const missingIndex = runCli(fixture.root, ["--all"])
  assert.equal(missingIndex.status, 2)
  assert.match(missingIndex.stderr, /build the Storybook first/)

  write(fixture.root, "apps/storybook/dist/index.json", JSON.stringify(fixture.index))
  const unknownRef = runCli(fixture.root, ["--since", "origin/absent"])
  assert.equal(unknownRef.status, 2)
  assert.match(unknownRef.stderr, /cannot diff origin\/absent/)

  const noTarget = runCli(fixture.root, [])
  assert.equal(noTarget.status, 2)
  assert.match(noTarget.stderr, /--since <ref> or --all/)
})
