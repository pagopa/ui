// The workflow seam: the run, its durable approval pause and its final report,
// driven through the production `run` with the SDK, the filesystem and every
// external command stubbed. Nothing here reaches inside a private helper: the
// test edits the same `decisions.json` a person edits and reads the same
// `report.md` and `status.json` a person reads.
import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import * as fs from "node:fs"
import { isAbsolute, join, relative, sep } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  VERIFICATION_FILES,
  VERIFICATION_TREES,
} from "../../../../.github/extensions/figma-align/verification-context.mjs"

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url))
const SENTINEL = "figma-token-sentinel"
const RUN_ID = "run-1"
const OUT_DIR = "packages/pagopa-ui/.figma/align/run-1"

// ---------------------------------------------------------------- virtual fs

function virtualWorkspace() {
  const nodes = new Map()
  const workspacePath = (path) => {
    const name = relative(ROOT, isAbsolute(path) ? path : join(ROOT, path))
      .split(sep)
      .join("/")
    assert.ok(name !== ".." && !name.startsWith("../"), `outside workspace: ${path}`)
    return name
  }
  const parentOf = (path) => path.split("/").slice(0, -1).join("/")
  const ensureDirectory = (path) => {
    if (!path || nodes.has(path)) return
    ensureDirectory(parentOf(path))
    nodes.set(path, { type: "directory" })
  }
  const write = (path, content) => {
    const name = workspacePath(path)
    ensureDirectory(parentOf(name))
    nodes.set(name, { type: "file", content: Buffer.from(content) })
  }
  const read = (path) => {
    const name = workspacePath(path)
    const entry = nodes.get(name)
    if (!entry) {
      const error = new Error(`ENOENT: no such file, '${name}'`)
      error.code = "ENOENT"
      throw error
    }
    assert.equal(entry.type, "file", name)
    return entry
  }
  const mock = {
    existsSync: (path) => nodes.has(workspacePath(path)),
    readdirSync: (path) => {
      const directory = workspacePath(path)
      assert.equal(nodes.get(directory)?.type, "directory", directory)
      return [...nodes]
        .filter(([name]) => name && parentOf(name) === directory)
        .map(([name, entry]) => ({
          name: name.slice(directory ? directory.length + 1 : 0),
          isFile: () => entry.type === "file",
          isDirectory: () => entry.type === "directory",
        }))
    },
    readFileSync: (path, encoding) => {
      // The fixture reads the real config first, then serves the virtual tree.
      if (!nodes.has(workspacePath(path))) return fs.readFileSync(path, encoding)
      const entry = read(path)
      return encoding ? entry.content.toString(encoding) : entry.content
    },
    mkdirSync: (path) => ensureDirectory(workspacePath(path)),
    writeFileSync: (path, content) => write(path, content),
    createWriteStream: () => ({ write: () => true, end: () => {}, pipe: () => {} }),
  }
  nodes.set("", { type: "directory" })
  return {
    mock,
    write,
    directory: (path) => ensureDirectory(workspacePath(path)),
    exists: (path) => nodes.has(workspacePath(path)),
    files: () => [...nodes].filter(([, entry]) => entry.type === "file").map(([name]) => name),
  }
}

// -------------------------------------------------------- external commands

function argumentLine(args) {
  return args.filter((arg) => !arg.startsWith("--output-style")).join(" ")
}

function childProcess({ respond, execFile }) {
  return {
    spawn(cmd, args) {
      const child = new EventEmitter()
      child.stdout = Object.assign(new EventEmitter(), { pipe: () => {} })
      child.stderr = Object.assign(new EventEmitter(), { pipe: () => {} })
      child.exitCode = null
      child.kill = () => {}
      const result = respond(cmd, args) ?? { code: 0, stdout: "", stderr: "" }
      queueMicrotask(() => {
        if (result.stdout) child.stdout.emit("data", result.stdout)
        if (result.stderr) child.stderr.emit("data", result.stderr)
        child.emit("close", result.code ?? 0)
      })
      return child
    },
    execFileSync: (cmd, args, options) => execFile(cmd, args, options),
  }
}

// --------------------------------------------------------------- the driver

// Every load is a distinct module instance, so each session binds to its own
// virtual filesystem and command stub.
let moduleNumber = 0

async function loadWorkflow(workspace, externals) {
  const extension = new URL(
    "../../../../.github/extensions/figma-align/extension.mjs",
    import.meta.url,
  )
  const helper = new URL(
    "../../../../.github/extensions/figma-align/verification-context.mjs",
    import.meta.url,
  )
  const instance = (moduleNumber += 1)
  const dataUrl = (source) =>
    `data:text/javascript,${encodeURIComponent(`${source}\n// instance ${instance}`)}`
  const fsUrl = dataUrl(`
    const fake = globalThis.__figmaAlignVirtualFs;
    export const {
      createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync
    } = fake;
  `)
  const childUrl = dataUrl(`
    const fake = globalThis.__figmaAlignChildProcess;
    export const { spawn, execFileSync } = fake;
  `)
  const sdkUrl = dataUrl(`
    export const defineWorkflow = (definition) => definition;
    export const joinSession = async () => {};
  `)
  const source = `${fs
    .readFileSync(extension, "utf8")
    .replace('from "node:fs"', `from "${fsUrl}"`)
    .replace('from "node:child_process"', `from "${childUrl}"`)
    .replace('from "@github/copilot-sdk/extension"', `from "${sdkUrl}"`)
    .replace('from "./verification-context.mjs"', `from "${helper.href}"`)
    .replace(
      "fileURLToPath(import.meta.url)",
      `fileURLToPath(${JSON.stringify(extension.href)})`,
    )} export { figmaAlign };`
  globalThis.__figmaAlignVirtualFs = workspace.mock
  globalThis.__figmaAlignChildProcess = childProcess(externals)
  const module = await import(dataUrl(source))
  ;(globalThis.__figmaAlignModules ??= []).push(module)
  return module.figmaAlign
}

function fixture({ registryStatus = "pending" } = {}) {
  const workspace = virtualWorkspace()
  for (const tree of VERIFICATION_TREES) workspace.directory(tree)
  for (const path of VERIFICATION_FILES) workspace.write(path, `fixture:${path}`)
  workspace.directory("docs/design-requests")
  const configuredPath = (path) =>
    /^(apps|packages)\//.test(path) ? path : `packages/pagopa-ui/${path}`
  for (const path of [
    "src/catalog/figma/file.ts",
    ".figma/live-rest.json",
    ".figma/live-mcp.json",
    ".figma/variables.json",
    "src/catalog/figma/inventory.json",
    "src/catalog/figma/registry.json",
    "src/catalog/figma/rules.json",
    "src/catalog/figma/parity-cases.json",
    "src/catalog/figma/page-surface.json",
    "src/catalog/figma/device-policy.json",
    "src/catalog/figma/device-exceptions.json",
    "src/catalog/figma/api-exceptions.json",
    "src/catalog/figma/evidence-exceptions.json",
    "apps/storybook/src/FigmaInventory.stories.tsx",
    "packages/tokens/src/manifest.json",
    "packages/tokens/src/figma.generated.css",
    "src/index.css",
    "packages/artwork/src/assets/figma-icons/manifest.json",
    "packages/artwork/src/components/icons/icon-assets.ts",
    "packages/artwork/src/assets/figma-pictograms/manifest.json",
    "packages/artwork/src/components/icons/pictogram-assets.ts",
    "src/pagopa-ui.ts",
  ]) {
    workspace.write(configuredPath(path), `fixture:${path}`)
  }
  for (const tree of ["src/components", "apps/storybook/src", "apps/storybook/src/guides"]) {
    workspace.directory(configuredPath(tree))
  }
  workspace.write(
    "packages/pagopa-ui/figma-to-code.yaml",
    fs.readFileSync(join(ROOT, "packages/pagopa-ui/figma-to-code.yaml")),
  )
  workspace.write(
    "CONTRIBUTING.md",
    "## The green chain\n\n```bash\npnpm nx run-many -t lint typecheck test build\n```\n",
  )
  const nodes = ["1:1", "1:2"]
  workspace.write(
    "packages/pagopa-ui/src/catalog/figma/registry.json",
    JSON.stringify({
      entries: Object.fromEntries(
        nodes.map((nodeId, index) => [
          nodeId,
          { status: registryStatus, target: { export: index ? "Beta" : "Alpha" } },
        ]),
      ),
    }),
  )
  return { workspace, nodes }
}

const analysis = (nodeId, name, decision = "implement") => ({
  nodeId,
  name,
  decision,
  reason: `${name} needs alignment`,
  devices: [{ device: "mobile", variantId: "v1", width: 360, height: 60, composition: "stack" }],
  dependencies: [],
  existingCases: [],
  rules: [],
  comments: [],
  deltas: [],
  plan: `plan ${name}`,
  openQuestions: [],
})

const alignment = (nodeId, name) => ({
  nodeId,
  status: "implemented",
  decision: "implement",
  summary: `${name} aligned`,
  cases: [
    { caseId: `${name}-default-mobile`, device: "mobile", verdict: "verified", residues: [] },
  ],
  rules: [],
  comments: [],
  designRequest: "",
  openPoints: [],
  commands: [],
})

const verified = (nodeId, name) => ({
  nodeId,
  pass: true,
  cases: [
    { caseId: `${name}-default-mobile`, device: "mobile", verdict: "verified", residues: [] },
  ],
  findings: [],
})

// A run is one attempt at the production `run`: the workflow throws out of the
// pause, exactly as the engine does, and the next attempt re-enters with the
// durable step cache the first attempt filled.
function session({
  agents = {},
  commands = {},
  storybookAnswers = true,
  token = SENTINEL,
  registryStatus = "pending",
  // The engine can drop a node's pipeline result; a run must report that node
  // rather than lose it.
  dropNode = null,
} = {}) {
  const steps = new Map()
  // A pause is durable: the engine resumes past it, so only the first call
  // throws and the re-entered run continues where it stopped.
  const pauses = new Set()
  const log = []
  // The test runner gives each file its own process: these stand in for the
  // shell the person runs the workflow from.
  globalThis.fetch = async () => ({ ok: storybookAnswers })
  if (token === null) delete process.env.FIGMA_TOKEN
  else process.env.FIGMA_TOKEN = token
  const calls = { agents: [], phases: [], paused: 0, checks: [] }
  const { workspace, nodes } = fixture({ registryStatus })
  const plan = {
    implementationOrder: nodes,
    pending: nodes,
    added: nodes,
    removed: [],
    changed: [],
    renamed: [],
    moved: [],
    affected: [],
    baseline: [],
    unverifiedDesign: [],
    surfaceWaiting: [],
    surfaceUnmirrored: [],
    surfaceUncensored: [],
  }
  const respond = (cmd, args) => {
    const line = argumentLine(args)
    if (line === "branch --show-current") return { stdout: "main\n" }
    if (line === "status --porcelain") return { stdout: "" }
    if (line.startsWith("ls-files -m")) return { stdout: "" }
    for (const [match, result] of Object.entries(commands)) {
      if (line.includes(match)) return typeof result === "function" ? result(line) : result
    }
    if (line.includes("figma:status")) {
      return {
        stdout: JSON.stringify({
          snapshot: { present: true, path: "packages/pagopa-ui/.figma/live-rest.json" },
          rules: { pending: 0, stale: 0 },
          comments: { open: 0 },
          requests: { open: 0, answered: 0 },
          next: "pnpm nx run pagopa-ui-cli:figma:plan",
        }),
      }
    }
    if (line.includes("figma:brief")) {
      return { stdout: `CARD ${line.split("--node ")[1]?.split(" ")[0]}\n` }
    }
    if (line.includes("figma plan")) return { stdout: JSON.stringify(plan) }
    if (line.includes("parity:queue")) {
      return {
        stdout: JSON.stringify({
          cases: nodes.map((nodeId, index) => ({
            nodeId,
            export: index ? "Beta" : "Alpha",
            storyIds: [`${index ? "beta" : "alpha"}--default`],
          })),
        }),
      }
    }
    return { code: 0, stdout: "", stderr: "" }
  }
  const execFile = (cmd, args) => {
    if (cmd === "git") return "packages/pagopa-ui/figma-to-code.yaml\n"
    const error = new Error(`${cmd} ${args.join(" ")} not stubbed`)
    error.code = 1
    throw error
  }

  let workflow
  const attempt = async (args, { reuse } = {}) => {
    const ctx = {
      runId: RUN_ID,
      args,
      signal: reuse?.signal ?? new AbortController().signal,
      phase: (title) => calls.phases.push(title),
      log: (line) => log.push(String(line)),
      step: async (key, fn) => {
        if (steps.has(key)) return steps.get(key)
        const value = await fn()
        steps.set(key, value)
        return value
      },
      agent: async (prompt, { label } = {}) => {
        calls.agents.push(label)
        const [kind, ...rest] = label.split(":")
        const verification = ["verify", "reverify", "final-verify"].includes(kind)
        const nodeId = verification ? rest.slice(0, -1).join(":") : rest.join(":")
        const name = nodeId === "1:2" ? "Beta" : "Alpha"
        // One handler per role: the fix round and the re-verification are the
        // same role as the first writer and the first verifier.
        const handler =
          agents[kind] ??
          (verification ? agents.verify : undefined) ??
          (kind === "fix" ? agents.align : undefined)
        if (typeof handler === "function") return handler(nodeId, label)
        if (kind === "mcp-gate") return { ok: true, call: "figma", message: "answered" }
        if (kind === "analyse") return analysis(nodeId, name)
        if (kind === "align" || kind === "fix") return alignment(nodeId, name)
        if (verification) return verified(nodeId, name)
        return null
      },
      parallel: async (tasks) => {
        const results = []
        for (const task of tasks) results.push(await task())
        return results
      },
      pipeline: async (items, writer, verifier, fixer) => {
        const results = []
        for (const item of items) {
          if (item.node.nodeId === dropNode) {
            results.push(null)
            continue
          }
          const written = await writer(item, item)
          const measured = await verifier(written)
          results.push(fixer ? await fixer(measured) : measured)
        }
        return results
      },
      pause: async (reason) => {
        if (pauses.has(reason)) return
        pauses.add(reason)
        calls.paused += 1
        throw Object.assign(new Error(`paused: ${reason}`), { paused: true })
      },
    }
    try {
      const result = await workflow.run(ctx)
      return { result, paused: false }
    } catch (error) {
      if (error.paused) return { paused: true }
      throw error
    }
  }

  return {
    workspace,
    nodes,
    calls,
    log,
    async start(args = {}, options = {}) {
      workflow = await loadWorkflow(workspace, { respond, execFile })
      return attempt(args, options)
    },
    resume(args = {}, options = {}) {
      return attempt(args, options)
    },
    decisions() {
      return JSON.parse(workspace.mock.readFileSync(join(ROOT, OUT_DIR, "decisions.json"), "utf8"))
    },
    writeDecisions(entries) {
      workspace.write(join(OUT_DIR, "decisions.json"), `${JSON.stringify(entries, null, 2)}\n`)
    },
    read(name) {
      return workspace.mock.readFileSync(join(ROOT, OUT_DIR, name), "utf8")
    },
    status() {
      return JSON.parse(this.read("status.json"))
    },
    outDirExists() {
      return workspace.exists(OUT_DIR)
    },
  }
}

// -------------------------------------------------------------------- tests

test("a checkpoint that drops a wave node stops before any writer and names it", async () => {
  const run = session()
  const first = await run.start({ approval: "pause" })
  assert.equal(first.paused, true)
  assert.equal(
    run.calls.agents.some((label) => label.startsWith("align:")),
    false,
  )

  const edited = run.decisions().filter((entry) => entry.nodeId !== "1:2")
  run.writeDecisions(edited)
  await assert.rejects(run.resume(), /1:2/)
  assert.equal(
    run.calls.agents.some((label) => label.startsWith("align:")),
    false,
  )
})

test("a checkpoint with several problems reports every one of them and runs no writer", async () => {
  const run = session()
  await run.start({ approval: "pause" })

  const [first, second] = run.decisions()
  run.writeDecisions([
    { ...first, decision: "maybe", instructions: 42 },
    { ...first },
    { ...second, nodeId: "9:9" },
  ])
  await assert.rejects(run.resume(), (error) => {
    for (const expected of [
      /1:1: 2 entries/,
      /1:2 \(Beta\): no entry/,
      /9:9: not in this wave/,
      /unknown decision "maybe"/,
      /"instructions" must be a string/,
    ]) {
      assert.match(error.message, expected)
    }
    assert.match(error.message, /5 problems/)
    return true
  })
  assert.equal(
    run.calls.agents.some((label) => label.startsWith("align:")),
    false,
  )
  // The rejection wrote nothing: the person's file is still theirs to fix.
  assert.deepEqual(run.decisions(), [
    { ...first, decision: "maybe", instructions: 42 },
    { ...first },
    { ...second, nodeId: "9:9" },
  ])
  // Nothing is broken: the run waits for the person, which is what a checkpoint
  // that cannot be approved means.
  assert.equal(run.status().outcome, "blocked")
  assert.match(run.status().nextStep, /1:2 \(Beta\): no entry/)
  assert.match(run.status().decisionsFile, /decisions\.json$/)
})

test("a checkpoint that is not JSON names the file and the run to resume", async () => {
  const run = session()
  await run.start({ approval: "pause" })
  run.workspace.write(`${OUT_DIR}/decisions.json`, "{ not json")
  await assert.rejects(run.resume(), /decisions\.json cannot be approved: not valid JSON.*run-1/s)
  assert.equal(
    run.calls.agents.some((label) => label.startsWith("align:")),
    false,
  )
})

test("duplicate explicit nodes stop before any artifact is written", async () => {
  const run = session()
  await assert.rejects(run.start({ nodes: ["1:1", "1:1"] }), /1:1.*twice|twice.*1:1/s)
  assert.equal(run.outDirExists(), false)
})

test("a corrected checkpoint resumes without discarding the person's edits", async () => {
  const run = session()
  await run.start({ approval: "pause" })
  const edited = run
    .decisions()
    .map((entry) =>
      entry.nodeId === "1:1"
        ? { ...entry, decision: "implement", instructions: "keep the badge" }
        : entry,
    )
  run.writeDecisions(edited)
  const resumed = await run.resume()
  assert.equal(resumed.paused, false)
  assert.deepEqual(
    run.calls.agents.filter((label) => label.startsWith("align:")),
    ["align:1:1", "align:1:2"],
  )
  assert.match(run.read("report.md"), /keep the badge|implement → implemented/)
})

test("the status projection says a paused run waits for the checkpoint", async () => {
  const run = session()
  await run.start({ approval: "pause" })
  const status = run.status()
  assert.equal(status.version, 1)
  assert.equal(status.outcome, "awaiting-approval")
  assert.equal(status.runId, "run-1")
  assert.equal(status.route, "REST")
  assert.match(status.nextStep, /resume run run-1/)
  assert.match(status.decisionsFile, /packages\/pagopa-ui\/\.figma\/align\/run-1\/decisions\.json$/)
  assert.match(status.observedAt, /^\d{4}-\d{2}-\d{2}T/)
  // The one credential-shaped value the run holds never reaches the projection.
  assert.equal(JSON.stringify(status).includes(SENTINEL), false)
})

test("the status projection says an analysis-only run wrote nothing", async () => {
  const run = session()
  await run.start({ analyseOnly: true })
  assert.equal(run.status().outcome, "analysis-only")
  assert.equal(run.status().nodes.length, 0)
  assert.equal(
    run.calls.agents.some((label) => label.startsWith("align:")),
    false,
  )
})

test("the status projection records a completed wave with its per-node outcome", async () => {
  const run = session()
  await run.start({ approval: "auto", greenChain: false })
  const status = run.status()
  assert.equal(status.outcome, "completed")
  assert.deepEqual(
    status.nodes.map((node) => [node.nodeId, node.status, node.verified]),
    [
      ["1:1", "implemented", true],
      ["1:2", "implemented", true],
    ],
  )
  assert.match(status.report, /run-1\/report\.md$/)
  // The checks are the run's own record: a label and an exit code per command
  // it actually ran, so a projection never claims a gate it skipped.
  const gates = [
    "fmt",
    "check:catalogue",
    "check:rules",
    "check:devices",
    "check:evidence",
    "check:parity",
  ]
  assert.deepEqual(
    status.checks.map((check) => check.label).filter((label) => gates.includes(label)),
    gates,
  )
  assert.deepEqual([...new Set(status.checks.map((check) => check.code))], [0])
})

test("the report renders one row per case instead of the array it holds", async () => {
  const run = session()
  await run.start({ approval: "auto", greenChain: false })
  const report = run.read("report.md")
  assert.match(report, /\| Alpha-default-mobile \| mobile \| verified \|/)
  assert.match(report, /\| Beta-default-mobile \| mobile \| verified \|/)
  assert.equal(report.includes("[object Object]"), false)
})

test("a node the pipeline drops is reported, not lost", async () => {
  const run = session({ dropNode: "1:2" })
  await run.start({ approval: "auto", greenChain: false })
  const report = run.read("report.md")
  assert.match(report, /## Beta \(`1:2`\) — the pipeline dropped it/)
  assert.match(report, /- Node outcome: not-reached/)
  assert.match(report, /- Independent verification: NOT passed/)
  const dropped = run.status().nodes.find((node) => node.nodeId === "1:2")
  assert.equal(dropped.outcome, "not-reached")
  assert.equal(dropped.verified, false)
  // The other node is still reported: a dropped node cannot take the wave with it.
  assert.equal(run.status().nodes.find((node) => node.nodeId === "1:1").verified, true)
})

test("an empty wave finishes as a completed run that did no work", async () => {
  const run = session({ registryStatus: "mocked" })
  const { result } = await run.start({ approval: "auto", greenChain: false })
  assert.equal(result.message, "nothing to align")
  const status = run.status()
  assert.equal(status.outcome, "completed")
  assert.match(status.reason, /no pending, non-mocked node/)
  assert.deepEqual(status.nodes, [])
  assert.equal(run.outDirExists(), true)
})

test("a run that stops on a failure says so and keeps the error", async () => {
  const run = session({
    agents: {
      align: () => {
        throw new Error("the writer could not read node 1:1")
      },
    },
  })
  await assert.rejects(
    run.start({ approval: "auto", greenChain: false }),
    /could not read node 1:1/,
  )
  const status = run.status()
  assert.equal(status.outcome, "failed")
  assert.match(status.reason, /could not read node 1:1/)
  assert.equal(status.phase, "Align")
})

test("a run that cannot render is blocked, not failed", async () => {
  const run = session({ storybookAnswers: false })
  await assert.rejects(
    run.start({ approval: "auto", startStorybook: false, greenChain: false }),
    /Storybook does not answer/,
  )
  assert.equal(run.status().outcome, "blocked")
})

test("nothing at all is written before the source gate answers", async () => {
  const run = session({
    agents: {
      "mcp-gate": () => ({ ok: false, call: "figma", message: "the session has no Figma tool" }),
    },
  })
  await assert.rejects(run.start({ approval: "auto" }), /MCP gate/)
  assert.equal(run.outDirExists(), false)
})

test("a resumed run overwrites the projection it left behind", async () => {
  const run = session()
  await run.start({ approval: "pause" })
  assert.equal(run.status().outcome, "awaiting-approval")
  await run.resume({ approval: "auto", greenChain: false })
  const status = run.status()
  assert.equal(status.outcome, "completed")
  assert.match(status.decisionsFile, /decisions\.json$/)
})

test("a node whose verification fails carries an explicit failed outcome", async () => {
  const run = session({
    agents: {
      verify: (nodeId) => ({
        ...verified(nodeId, nodeId === "1:2" ? "Beta" : "Alpha"),
        pass: false,
        findings: ["The card is 4px wider than the frame."],
      }),
    },
  })
  await run.start({ approval: "auto", greenChain: false })
  const status = run.status()
  assert.deepEqual(
    status.nodes.map((node) => node.outcome),
    ["verification-failed", "verification-failed"],
  )
  assert.match(run.read("report.md"), /- Node outcome: verification-failed/)
  assert.match(run.read("report.md"), /4px wider than the frame/)
})

test("a writer that returns nothing is a writer failure, not an unknown status", async () => {
  const run = session({ agents: { align: () => null } })
  await run.start({ approval: "auto", greenChain: false })
  const status = run.status()
  assert.deepEqual(
    status.nodes.map((node) => node.outcome),
    ["writer-failed", "writer-failed"],
  )
  assert.match(run.read("report.md"), /- Node outcome: writer-failed/)
})

test("an analysis that returns nothing proposes a skip that is not a person's choice", async () => {
  const run = session({ agents: { analyse: () => null } })
  await run.start({ approval: "pause" })
  const proposed = run.decisions()
  assert.deepEqual(
    proposed.map((entry) => [entry.nodeId, entry.decision, entry.proposedBy]),
    [
      ["1:1", "skip", "analysis-failure"],
      ["1:2", "skip", "analysis-failure"],
    ],
  )
  assert.match(run.read("decisions.md"), /no analysis result/i)
  await run.resume({ approval: "auto", greenChain: false })
  const status = run.status()
  assert.deepEqual(
    status.nodes.map((node) => [node.nodeId, node.outcome, node.proposedBy]),
    [
      ["1:1", "skipped", "analysis-failure"],
      ["1:2", "skipped", "analysis-failure"],
    ],
  )
  assert.match(run.read("report.md"), /proposed after the analysis returned no result/i)
})

test("a green-chain fix that returns nothing names its own failure, not a stale context", async () => {
  const run = session({
    agents: { "green-fix": () => null },
    // The chain stays red across both attempts: the fix writer is the thing
    // that failed, and the node's own context never moved.
    commands: { "nx run-many": { code: 1, stdout: "boom", stderr: "boom" } },
  })
  await run.start({ approval: "auto", greenChain: true })
  const status = run.status()
  assert.deepEqual(
    status.nodes.map((node) => node.outcome),
    ["green-fix-failed", "green-fix-failed"],
  )
  assert.match(run.read("report.md"), /green-chain fix writer returned no result/i)
  assert.match(run.read("report.md"), /- Node outcome: green-fix-failed/)
})
