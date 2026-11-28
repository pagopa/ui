import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

process.env.NX_DAEMON = "false"
process.env.NX_NO_CLOUD = "true"
process.env.NX_TUI = "false"

const workspace = fileURLToPath(new URL("../../../../", import.meta.url))
const require = createRequire(import.meta.url)
const { createProjectGraphAsync } = require("nx/src/devkit-exports")
const { createTaskGraph } = require("nx/src/tasks-runner/create-task-graph")
const nxPackage = require.resolve("nx/package.json")
const nx = path.join(path.dirname(nxPackage), JSON.parse(fs.readFileSync(nxPackage, "utf8")).bin.nx)

let graph
function project(name) {
  const result = spawnSync(process.execPath, [nx, "show", "project", name, "--json"], {
    cwd: workspace,
    env: { ...process.env, NX_LOAD_DOT_ENV_FILES: "false", FORCE_COLOR: "0" },
    encoding: "utf8",
    timeout: 60_000,
  })
  assert.ifError(result.error)
  assert.equal(result.status, 0, `${name}: ${result.stderr}`)
  return JSON.parse(result.stdout)
}

// The tasks the graph schedules for an aggregate: the same resolved nodes a run
// creates, including every dependency Nx derives, without executing anything.
async function scheduled(target) {
  graph ??= await createProjectGraphAsync()
  const { tasks } = createTaskGraph(graph, {}, ["workspace"], [target], undefined, {})
  return Object.keys(tasks)
}

// A dependsOn entry naming a target the graph cannot resolve becomes no task at
// all, so the chain would lose a gate without failing. The invocation is the
// one Nx command the entrypoint runs after the toolchain pin.
function invoked(command) {
  const match = /^pnpm nx run workspace:(\S+)$/.exec(command)
  assert.ok(match, `${command}: the chain must be one Nx invocation`)
  return match[1]
}

function chain(contract) {
  const [toolchain, ...rest] = contract.commands
  assert.equal(toolchain, "mise install --locked node pnpm", "the toolchain pin must run first")
  assert.equal(rest.length, 1, "the chain must be one Nx invocation after the toolchain pin")
  return invoked(rest[0])
}

const STATIC = [
  "workspace:check:format",
  "pagopa-ui:typecheck",
  "pagopa-ui:format:check",
  "pagopa-ui:lint:check",
  "pagopa-ui:docs",
  "pagopa-ui:check:catalogue",
  "pagopa-ui:foundation:check",
  "pagopa-ui:layers:check",
  "pagopa-ui:build",
  "pagopa-ui:test",
  "pagopa-ui-artwork:typecheck",
  "pagopa-ui-artwork:format:check",
  "pagopa-ui-artwork:lint:check",
  "pagopa-ui-artwork:test",
  "pagopa-ui-tokens:typecheck",
  "pagopa-ui-tokens:format:check",
  "pagopa-ui-tokens:lint:check",
  "pagopa-ui-tokens:test",
  "pagopa-ui-cli:typecheck",
  "pagopa-ui-cli:format:check",
  "pagopa-ui-cli:lint:check",
  "pagopa-ui-cli:test",
]

// The tail verify-fast stops before: the Storybook app's own gates, browser
// suites included.
const TAIL = [
  "pagopa-ui-storybook:typecheck",
  "pagopa-ui-storybook:test:coverage",
  "pagopa-ui-storybook:test:stories",
  "pagopa-ui-storybook:build",
  "pagopa-ui:library:check",
]

// The rules card drift is reported, never gated: an informational report cannot
// hold the chain, so it stays on demand and nothing schedules it.
test("verify-chain: the rules report is not a chain gate", async () => {
  const fast = project("workspace").targets.verify.configurations?.fast
  const scheduledTasks = await scheduled(chain(fast))
  assert.ok(!scheduledTasks.includes("pagopa-ui-cli:check:rules"))
  assert.ok(project("pagopa-ui-cli").targets["check:rules"], "the report stays available")
})

test("verify-chain: the full chain schedules every gate the sequence ran", async () => {
  const verify = project("workspace").targets.verify
  assert.equal(verify.cache, false, "the toolchain pin cannot be a cached task")
  const scheduledTasks = await scheduled(chain(verify.options))
  for (const gate of [...STATIC, ...TAIL]) {
    assert.ok(scheduledTasks.includes(gate), `the full chain dropped ${gate}`)
  }
  assert.ok(scheduledTasks.includes("workspace:verify-full"), "the aggregate must run a task")
})

test("verify-chain: the fast chain schedules the static gates without browsers", async () => {
  const fast = project("workspace").targets.verify.configurations?.fast
  assert.ok(fast, "workspace:verify must keep a fast configuration")
  const scheduledTasks = await scheduled(chain(fast))
  for (const gate of STATIC) {
    assert.ok(scheduledTasks.includes(gate), `the fast chain dropped ${gate}`)
  }
  for (const gate of TAIL) {
    assert.ok(!scheduledTasks.includes(gate), `the fast chain must not run ${gate}`)
  }
})
