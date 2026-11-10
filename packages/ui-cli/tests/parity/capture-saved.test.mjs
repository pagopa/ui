import { fixtureTree, runCli } from "../helpers/cli.mjs"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { captureWave } from "../../src/parity/capture.ts"
import { workspaceAt } from "../helpers/cli.mjs"
import { TOOLING_ROOT } from "../../src/adapters/workspace.ts"

const source = path.join(TOOLING_ROOT, "tests/fixtures/figma-parity/snapshot-slice.json")
const evidence = fileURLToPath(
  new URL("../../../../docs/figma-parity/source.json.br", import.meta.url),
)
const cases = [
  {
    id: "first",
    nodeId: "1:1",
    export: "Control",
    storyId: "control--one",
    variant: "1:10",
    width: 320,
    root: ".first",
    residues: [{ path: "field.width", reason: "adapted" }],
  },
  {
    id: "second",
    nodeId: "1:1",
    export: "Control",
    storyId: "control--two",
    variant: "1:11",
    width: 600,
    root: ".second",
    fill: [["input", "value"]],
  },
  { id: "other", nodeId: "2:2", export: "Other", storyId: "other--one" },
]

function fixture(entries = cases) {
  const root = fixtureTree({}, "pagopa-capture-saved-").root
  const corpus = path.join(root, "cases.json")
  fs.writeFileSync(corpus, JSON.stringify(entries))
  fs.mkdirSync(path.join(root, "src/catalog/figma"), { recursive: true })
  fs.writeFileSync(
    path.join(root, "src/catalog/figma/inventory.json"),
    JSON.stringify({ fileKey: "fixture", syncedAt: "2024-01-01T00:00:00Z", components: [] }),
  )
  fs.copyFileSync(
    path.join(TOOLING_ROOT, "../pagopa-ui/src/catalog/figma/device-policy.json"),
    path.join(root, "src/catalog/figma/device-policy.json"),
  )
  return { root, corpus, out: path.join(root, "output") }
}

function cli(f, args) {
  return runCli(["parity", "capture", ...args], { root: f.root })
}

function options(f, extra = []) {
  return {
    saved: true,
    nodeId: "1:1",
    casesFile: f.corpus,
    input: source,
    outDir: f.out,
    ...Object.fromEntries(extra),
  }
}

function result(spec, deltas = []) {
  return {
    report: {
      nodeId: spec.nodeId,
      variant: spec.variant,
      variantName: spec.variant,
      device: spec.device ?? null,
      storyId: spec.storyId,
      verdict: deltas.length ? "review-required" : "verified",
      deltas,
      advisories: [],
      residues: [],
      notes: [],
    },
    probe: {},
    mapping: [],
  }
}

test("the CLI lists every saved case, independently of the registry status", async () => {
  const f = fixture()
  const run = await cli(f, ["--saved", "--node", "1:1", "--cases", f.corpus, "--dry-run"])
  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout, /first 1:1 control--one/)
  assert.match(run.stdout, /second 1:1 control--two/)
  assert.doesNotMatch(run.stdout, /other--one/)
  assert.match(run.stdout, /2 case\(s\)/)
  assert.equal(fs.existsSync(f.out), false)
})

test("empty, unknown and invalid selections cannot look like successful reviews", async () => {
  const f = fixture()
  for (const args of [
    ["--saved", "--cases", f.corpus, "--dry-run"],
    ["--saved", "--node", "9:9", "--cases", f.corpus, "--dry-run"],
    ["--saved", "--node", "1:1,2:2", "--cases", f.corpus, "--dry-run"],
    ["--saved", "--node", "1:1", "--cases", f.corpus, "--limit", "0", "--dry-run"],
    ["--saved", "--node", "1:1", "--cases", f.corpus, "--status", "pending", "--dry-run"],
  ]) {
    const run = await cli(f, args)
    assert.equal(run.status, 2, run.stderr)
    assert.match(run.stderr, /error:/)
  }
  const empty = fixture([])
  const run = await cli(empty, ["--saved", "--node", "1:1", "--cases", empty.corpus, "--dry-run"])
  assert.equal(run.status, 2, run.stderr)
  assert.match(run.stderr, /no saved cases/)

  const missingSource = await cli(f, [
    "--saved",
    "--node",
    "1:1",
    "--cases",
    f.corpus,
    "--input",
    "missing-source.json",
  ])
  assert.equal(missingSource.status, 2, missingSource.stderr)
  assert.match(missingSource.stderr, /missing-source\.json/)
})

test("capture reproduces every saved mapping and writes a distinct report for each case", async () => {
  const f = fixture()
  const seen = []
  const code = await captureWave(workspaceAt(f.root), options(f), {
    evaluate: async (spec) => {
      seen.push(spec)
      return result(spec)
    },
  })
  assert.equal(code.code, 0)
  assert.deepEqual(
    seen.map((spec) => spec.id),
    ["first", "second"],
  )
  assert.equal(seen[0].root, ".first")
  assert.deepEqual(seen[0].residues, cases[0].residues)
  assert.equal(seen[1].width, 600)
  assert.deepEqual(seen[1].fill, cases[1].fill)
  const summary = JSON.parse(fs.readFileSync(path.join(f.out, "summary.json"), "utf8"))
  assert.deepEqual(
    summary.cases.map((entry) => entry.id),
    ["first", "second"],
  )
  assert.equal(new Set(summary.cases.map((entry) => entry.file)).size, 2)
  assert.ok(summary.cases.every((entry) => fs.existsSync(path.join(f.out, entry.file))))
})

test("the saved wave rejects unpinned evidence before evaluating any case", async () => {
  const f = fixture()
  let called = false
  const code = await captureWave(workspaceAt(f.root), options(f, [["input", evidence]]), {
    evaluate: async (spec) => {
      called = true
      return result(spec)
    },
  })
  assert.equal(code.code, 2)
  assert.equal(called, false)
  assert.equal(fs.existsSync(f.out), false)
})

test("saved selection honours device and limit in both listing and capture", async () => {
  const f = fixture([
    { ...cases[0], device: "mobile" },
    { ...cases[1], device: "mobile" },
    { ...cases[2], nodeId: "1:1", device: "desktop" },
  ])
  const args = [
    "--saved",
    "--node",
    "1:1",
    "--cases",
    f.corpus,
    "--device",
    "mobile",
    "--limit",
    "1",
  ]
  const list = await cli(f, [...args, "--dry-run"])
  assert.equal(list.status, 0, list.stderr)
  assert.match(list.stdout, /first 1:1/)
  assert.doesNotMatch(list.stdout, /second|other/)
  const seen = []
  const code = await captureWave(
    workspaceAt(f.root),
    options(f, [
      ["device", "mobile"],
      ["limit", "1"],
    ]),
    {
      evaluate: async (spec) => {
        seen.push(spec.id)
        return result(spec)
      },
    },
  )
  assert.equal(code.code, 0)
  assert.deepEqual(seen, ["first"])
})

test("saved capture fails on deltas, capture errors, missing stories and drafts", async () => {
  const f = fixture()
  const deltas = await captureWave(workspaceAt(f.root), options(f), {
    evaluate: async (spec) => result(spec, [{ path: "field.width" }]),
  })
  assert.equal(deltas.code, 3)

  const errors = await captureWave(workspaceAt(f.root), options(f), {
    evaluate: async () => {
      throw new Error("capture refused")
    },
  })
  assert.equal(errors.code, 2)

  const missing = fixture([{ ...cases[0], storyId: undefined }])
  const listed = await cli(missing, [
    "--saved",
    "--node",
    "1:1",
    "--cases",
    missing.corpus,
    "--dry-run",
  ])
  assert.equal(listed.status, 2, listed.stderr)
  assert.match(listed.stderr, /no storyId/)
  const missingCode = await captureWave(workspaceAt(missing.root), options(missing), {
    evaluate: async () => {
      throw new Error("a missing story must not be captured")
    },
  })
  assert.equal(missingCode.code, 2)

  const draft = fixture([{ ...cases[0], note: "draft — refine the mapping" }])
  const draftCode = await captureWave(workspaceAt(draft.root), options(draft), {
    evaluate: async (spec) => result(spec),
  })
  assert.equal(draftCode.code, 2)
  const summary = JSON.parse(fs.readFileSync(path.join(draft.out, "summary.json"), "utf8"))
  assert.equal(summary.cases[0].draft, true)
})
