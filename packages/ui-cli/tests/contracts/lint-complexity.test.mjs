import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../../", import.meta.url))
const oxlint = path.join(root, "node_modules", ".bin", "oxlint")

// The config is JSONC: the grandfather note is a full-line comment.
function readConfig(file) {
  const source = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n")
  return JSON.parse(source)
}

const config = readConfig(path.join(root, ".oxlintrc.json"))
const size = config.overrides.find((override) => override.files.includes("src/**/*.ts"))
// A rule set to "off" grandfathers the functions its files already had.
const grandfathers = config.overrides
  .flatMap((override) =>
    Object.values(override.rules).every((rule) => rule === "off") ? override.files : [],
  )
  .map((file) => path.join(root, file))

function lint(files, { denyWarnings, directory, rules }) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "oxlint-contract-"))
  const file = path.join(base, "oxlintrc.json")
  fs.writeFileSync(
    file,
    JSON.stringify({
      plugins: config.plugins,
      ignorePatterns: [],
      rules: { ...config.rules, ...rules },
      overrides: [{ files: [`${directory}/**/*.ts`], rules }],
    }),
  )
  const result = spawnSync(
    oxlint,
    [...(denyWarnings ? ["--deny-warnings"] : []), "-c", file, ...files],
    {
      cwd: base,
      encoding: "utf8",
    },
  )
  fs.rmSync(base, { recursive: true, force: true })
  assert.ifError(result.error)
  return result
}

function probe(source) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "oxlint-probe-"))
  const file = path.join(directory, "probe.ts")
  fs.writeFileSync(file, source)
  return {
    directory,
    file,
    run: (options) => lint([file], { directory, ...options }),
    close: () => fs.rmSync(directory, { recursive: true, force: true }),
  }
}

const BRANCHES = Array.from(
  { length: 22 },
  (_, index) => `  if (value === ${index}) return ${index}`,
)

test("lint-complexity: the tooling sources are held to the pagopa-ui thresholds", () => {
  const library = readConfig(path.join(root, "..", "pagopa-ui", ".oxlintrc.json")).rules
  assert.ok(size, "the size rules must cover src/**/*.ts")
  assert.deepEqual(size.rules.complexity, library.complexity)
  assert.deepEqual(size.rules["max-lines-per-function"], library["max-lines-per-function"])
  // A warning the chain ignores is not a gate: --deny-warnings is what fails it.
  const scripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts
  for (const script of ["lint", "lint:check"]) {
    assert.match(scripts[script], /--deny-warnings/, `${script} must fail on a size violation`)
  }
})

test("lint-complexity: an over-complex function fails the lint gate", () => {
  const tree = probe(
    `export function overComplex(value: number): number {\n${BRANCHES.join("\n")}\n  return 0\n}\n`,
  )
  try {
    const gated = tree.run({ denyWarnings: true, rules: size.rules })
    assert.equal(gated.status, 1, gated.stdout)
    assert.match(gated.stdout, /eslint\(complexity\)/)
    assert.match(gated.stdout, /overComplex/)
    // Without the flag the same function is a warning, which is the severity
    // the config declares: the gate is the flag, not the rule.
    assert.equal(tree.run({ denyWarnings: false, rules: size.rules }).status, 0)
    // Under the threshold neither form reports.
    const short = probe(`export function simple(value: number): number {\n  return value\n}\n`)
    try {
      assert.equal(short.run({ denyWarnings: true, rules: size.rules }).status, 0)
    } finally {
      short.close()
    }
  } finally {
    tree.close()
  }
})

test("lint-complexity: a function past the line ceiling fails the lint gate", () => {
  const body = Array.from({ length: 210 }, (_, index) => `  const step${index} = ${index}`)
  const tree = probe(
    `export function longOne(): number {\n${body.join("\n")}\n  return step209\n}\n`,
  )
  try {
    const gated = tree.run({ denyWarnings: true, rules: size.rules })
    assert.equal(gated.status, 1, gated.stdout)
    assert.match(gated.stdout, /eslint\(max-lines-per-function\)/)
  } finally {
    tree.close()
  }
})

test("lint-complexity: every grandfathered file still breaks the rule it is excused from", () => {
  // The list only shrinks: an entry that no longer violates stops holding
  // functions out of the gate, so it has to go with the function that shrank.
  assert.ok(grandfathers.length > 0, "the grandfather list must not be empty")
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "oxlint-fresh-"))
  try {
    const result = lint(grandfathers, {
      denyWarnings: true,
      directory: root,
      rules: size.rules,
    })
    assert.equal(result.status, 1, "a grandfathered file reported nothing at all")
    for (const file of grandfathers) {
      assert.ok(
        result.stdout.includes(file),
        `${path.relative(root, file)} no longer violates its rule — drop the entry`,
      )
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
