import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

const WORKSPACE = path.resolve(import.meta.dirname, "../../../..")
const STORYBOOK = path.join(WORKSPACE, "apps", "storybook")
const COMPONENTS = path.join(WORKSPACE, "packages", "pagopa-ui", "src", "components")
const CALENDAR = path.join(COMPONENTS, "primitives", "calendar.tsx")

// The gates belong to the stories app: the test reads the object the Chromium
// coverage pass receives, so a retargeted or corrected gate is the thing under
// test, not a copy of it.
async function gates() {
  const config = await import(path.join(STORYBOOK, "vite.config.ts"))
  const { thresholds } = config.default({ mode: "coverage" }).test.coverage
  return Object.entries(thresholds)
}

async function perFileGates() {
  return (await gates()).filter(([, gate]) => typeof gate === "object")
}

function modules(directory) {
  return fs
    .readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name))
}

// Vitest matches a gate against the file path relative to the app that runs the
// pass, and a path that starts by stepping out of the app is not what a leading
// `**/` stands for: the test resolves the path the same way, so a gate no file
// reaches fails here as it fails to protect anything in the pass.
function reached(glob, module) {
  return path.matchesGlob(path.relative(STORYBOOK, module), glob)
}

test("every per-file coverage gate names a module that exists", async () => {
  const sources = modules(COMPONENTS)
  const stale = (await perFileGates())
    .map(([glob]) => glob)
    .filter((glob) => !sources.some((module) => reached(glob, module)))
  assert.deepEqual(stale, [], `coverage gates no file reaches:\n  ${stale.join("\n  ")}`)
})

test("the calendar's per-file gate targets the primitives calendar module", async () => {
  const gate = (await perFileGates()).find(([glob]) => reached(glob, CALENDAR))
  assert.ok(gate, `${path.relative(WORKSPACE, CALENDAR)} has no per-file coverage gate`)
  const [glob, thresholds] = gate
  assert.equal(thresholds.perFile, true, `${glob} does not gate the file on its own`)
  for (const metric of ["statements", "branches", "functions", "lines"]) {
    assert.equal(typeof thresholds[metric], "number", `${glob} sets no ${metric} threshold`)
  }
})

test("the coverage gates keep their thresholds", async () => {
  const named = (await gates()).map(([glob, gate]) => [
    glob.replace(/^(\.\.\/)+\*\*\//, ""),
    typeof gate === "object" ? gate : { threshold: gate },
  ])
  assert.deepEqual(Object.fromEntries(named), {
    statements: { threshold: 90 },
    branches: { threshold: 83 },
    functions: { threshold: 90 },
    lines: { threshold: 90 },
    "src/components/inputs/{autocomplete,select-field,drag-and-drop}.tsx": {
      perFile: true,
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
    "src/components/inputs/field-utils.ts": {
      statements: 100,
      branches: 85,
      functions: 100,
      lines: 100,
    },
    "src/components/primitives/form-control-utils.ts": {
      statements: 100,
      branches: 85,
      functions: 100,
      lines: 100,
    },
    "src/components/primitives/button.tsx": {
      statements: 95,
      branches: 90,
      functions: 100,
      lines: 95,
    },
    "src/components/{inputs/date-picker,primitives/calendar}.tsx": {
      perFile: true,
      statements: 95,
      branches: 90,
      functions: 100,
      lines: 95,
    },
  })
})
