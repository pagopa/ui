import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

import { RULES } from "../../src/checks/foundation.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

function zeroCounts() {
  return Object.fromEntries(Object.keys(RULES).map((rule) => [rule, 0]))
}

function fixture(run, { files = {}, baseline, exceptions } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-foundation-"))
  const sources = {
    "src/manifest.json": JSON.stringify({
      schemaVersion: 2,
      foundations: {
        "spacing-4": { category: "spacing", value: 4, theme: { namespace: "spacing", key: "1" } },
        "spacing-8": { category: "spacing", value: 8, theme: { namespace: "spacing", key: "2" } },
        "spacing-12": { category: "spacing", value: 12, theme: { namespace: "spacing", key: "3" } },
        "spacing-16": { category: "spacing", value: 16, theme: { namespace: "spacing", key: "4" } },
      },
    }),
    "src/foundation-baseline.json": JSON.stringify(
      baseline ?? { schemaVersion: 1, counts: zeroCounts() },
    ),
    "src/foundation-exceptions.json": JSON.stringify(
      exceptions ?? { schemaVersion: 1, exceptions: [] },
    ),
    "src/components/clean.tsx":
      'export const clean = <p className="text-body text-primary p-4" />\n',
    ...files,
  }
  try {
    for (const [file, source] of Object.entries(sources)) {
      const target = path.join(root, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, source)
    }
    return run({
      root,
      run: (...args) =>
        spawnSync(process.execPath, [script, "check", "foundation", ...args], {
          cwd: root,
          encoding: "utf8",
          env: fixtureEnv(root),
        }),
      read: (file) => fs.readFileSync(path.join(root, file), "utf8"),
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("a component tree that consumes the scale passes", () => {
  fixture(({ run }) => {
    const result = run()
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /foundation OK/)
  })
})

test("a value above the ceiling fails with the rule", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /tailwind-text-size: 1 occurrences, the ceiling is 0/)
    },
    { files: { "src/components/bad.tsx": 'export const bad = <p className="text-sm" />\n' } },
  )
})

test("a count below the ceiling asks to lower it", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(
        result.stderr,
        /tailwind-text-size: 0 occurrences, the ceiling is 1 — lower the ceiling to 0/,
      )
    },
    {
      baseline: { schemaVersion: 1, counts: { ...zeroCounts(), "tailwind-text-size": 1 } },
    },
  )
})

test("a registered exception is exempt and reported", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.equal(result.status, 0, result.stderr)
      assert.match(result.stdout, /1 registered exceptions/)
      const measure = run("--measure")
      const measured = JSON.parse(measure.stdout)
      assert.equal(measured.counts["tailwind-text-size"], 0)
      assert.equal(measured.raw["tailwind-text-size"], 1)
    },
    {
      files: { "src/components/bad.tsx": 'export const bad = <p className="text-sm" />\n' },
      exceptions: {
        schemaVersion: 1,
        exceptions: [
          {
            rule: "tailwind-text-size",
            file: "src/components/bad.tsx",
            match: "text-sm",
            nodeId: "1:2",
            reason: "registered for the test",
          },
        ],
      },
    },
  )
})

test("the Storybook page templates are scanned too", () => {
  fixture(
    ({ run }) => {
      const result = run("--measure")
      assert.equal(result.status, 0, result.stderr)
      const measured = JSON.parse(result.stdout)
      assert.equal(measured.raw["hex-color"], 1)
      assert.equal(measured.raw["tailwind-text-size"], 1)
    },
    {
      files: {
        "apps/storybook/src/templates/Demo.tsx":
          'export const demo = <p className="text-sm" style={{ color: "#ffffff" }} />\n',
      },
    },
  )
  fixture(
    ({ run }) => {
      const result = run("--measure")
      assert.equal(result.status, 0, result.stderr)
      const measured = JSON.parse(result.stdout)
      assert.equal(measured.counts["hex-color"], 0)
      assert.equal(measured.raw["hex-color"], 1)
      const check = run()
      assert.equal(check.status, 0, check.stderr)
    },
    {
      files: {
        "apps/storybook/src/templates/Demo.tsx":
          'export const demo = <p className="text-body" style={{ color: "#ffffff" }} />\n',
      },
      exceptions: {
        schemaVersion: 1,
        exceptions: [
          {
            rule: "hex-color",
            file: "apps/storybook/src/templates/Demo.tsx",
            match: "#ffffff",
            nodeId: "1:2",
            reason: "registered for the test",
          },
        ],
      },
    },
  )
})

test("a stale exception fails", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /stale exception/)
    },
    {
      exceptions: {
        schemaVersion: 1,
        exceptions: [
          {
            rule: "tailwind-text-size",
            file: "src/components/clean.tsx",
            match: "text-sm",
            nodeId: "1:2",
            reason: "no longer present",
          },
        ],
      },
    },
  )
})

test("an exception without a node or a reason fails", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /nodeId and reason are required/)
    },
    {
      files: { "src/components/bad.tsx": 'export const bad = <p className="text-sm" />\n' },
      exceptions: {
        schemaVersion: 1,
        exceptions: [
          { rule: "tailwind-text-size", file: "src/components/bad.tsx", match: "text-sm" },
        ],
      },
    },
  )
})

test("comments and prose do not count", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.equal(result.status, 0, result.stderr)
    },
    {
      files: {
        "src/components/prose.tsx": [
          "// text-sm and #ffffff stay in prose",
          "/* border-red-500 is documentation, not a class */",
          'export const prose = <p className="text-body" />',
          "",
        ].join("\n"),
      },
    },
  )
})

test("spacing steps backed by a foundation token are allowed", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.equal(result.status, 0, result.stderr)
    },
    {
      files: {
        "src/components/tokens.tsx":
          'export const token = <div className="p-3 gap-3 px-3 py-3" />\n',
      },
    },
  )
  fixture(
    ({ run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /off-scale-spacing: 1 occurrences/)
      assert.match(result.stderr, /mt-7/)
    },
    {
      files: {
        "src/components/off.tsx": 'export const off = <div className="mt-7" />\n',
      },
    },
  )
})

test("template literal class strings count", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /tailwind-text-size: 1 occurrences/)
    },
    {
      files: {
        "src/components/conditional.tsx": [
          "export const conditional = (on: boolean) => (",
          "  <p className={`text-sm ${on ? 'text-primary' : 'text-muted'}`} />",
          ")",
          "",
        ].join("\n"),
      },
    },
  )
})

test("a Tailwind shadow counts, a token shadow does not", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /shadow-scale: 1 occurrences, the ceiling is 0/)
      assert.match(result.stderr, /shadow-md/)
    },
    {
      files: {
        "src/components/elevated.tsx":
          'export const elevated = <div className="rounded-xl bg-card shadow-md" />\n',
      },
    },
  )
  fixture(
    ({ run }) => {
      const result = run()
      assert.equal(result.status, 0, result.stderr)
    },
    {
      files: {
        "src/components/token-shadow.tsx":
          'export const tokenShadow = <div className="rounded-xl bg-card shadow-elevation" />\n',
      },
    },
  )
})

test("a Tailwind breakpoint variant counts, the Figma ones do not", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /default-breakpoint: 6 occurrences, the ceiling is 0/)
      assert.match(result.stderr, /2xl:/)
    },
    {
      files: {
        "src/components/responsive.tsx":
          'export const responsive = <div className="sm:flex md:grid lg:p-4 xl:mt-2 2xl:flex max-lg:hidden" />\n',
      },
    },
  )
  fixture(
    ({ run }) => {
      const result = run()
      assert.equal(result.status, 0, result.stderr)
    },
    {
      // `@md/alert:` is a default container query: it proves the breakpoint
      // rule's lookbehind, and it is exempted here so this fixture isolates one
      // rule.
      baseline: { schemaVersion: 1, counts: { ...zeroCounts(), "default-container-query": 1 } },
      files: {
        "src/components/figma.tsx": [
          'export const figma = <div className="tablet:flex max-w-screen-sm" />',
          'export const container = <div className="@md/alert:flex" />',
          'export const state = <div className="data-[state=open]:flex" />',
          "",
        ].join("\n"),
      },
    },
  )
})

test("a mobile typography pair counts, the plain scale classes do not", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /mobile-text-class: 2 occurrences, the ceiling is 0/)
      assert.match(result.stderr, /text-title-lg-mobile/)
    },
    {
      files: {
        "src/components/titles.tsx":
          'export const titles = <h2 className="text-title-lg-mobile text-title-md-mobile" />\n',
      },
    },
  )
  fixture(
    ({ run }) => {
      const result = run()
      assert.equal(result.status, 0, result.stderr)
    },
    {
      files: {
        "src/components/titles.tsx":
          'export const titles = <h2 className="text-title-lg text-body" />\n',
      },
    },
  )
})

test("a default container size counts, a Figma viewport variant does not", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /default-container-query: 3 occurrences, the ceiling is 0/)
      assert.match(result.stderr, /@4xl\/footer:/)
    },
    {
      files: {
        "src/components/containers.tsx":
          'export const containers = <div className="@sm:flex @md/alert:grid @4xl/footer:grid" />\n',
      },
    },
  )
  fixture(
    ({ run }) => {
      const result = run()
      assert.equal(result.status, 0, result.stderr)
    },
    {
      files: {
        "src/components/containers.tsx":
          'export const containers = <div className="@container tablet:flex" />\n',
      },
    },
  )
})

test("a centred scroll container counts, the safe and split forms do not", () => {
  fixture(
    ({ run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /center-overflow: 2 occurrences, the ceiling is 0/)
    },
    {
      files: {
        "src/components/centred.tsx": [
          'export const centred = <ul className="flex justify-center overflow-y-auto" />',
          'export const reversed = <ul className="flex overflow-x-scroll justify-center" />',
          "",
        ].join("\n"),
      },
    },
  )
  fixture(
    ({ run }) => {
      const result = run()
      assert.equal(result.status, 0, result.stderr)
    },
    {
      files: {
        "src/components/safe.tsx": [
          'export const safe = <ul className="flex justify-center-safe overflow-y-auto" />',
          'export const split = <ul className="justify-center"><li className="overflow-y-auto" /></ul>',
          "",
        ].join("\n"),
      },
    },
  )
})
