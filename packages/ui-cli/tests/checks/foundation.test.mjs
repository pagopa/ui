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
