import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  MAX_EVIDENCE_BYTES,
  buildEvidence,
  checkEvidence,
  loadManifest,
  loadSlice,
} from "../../src/parity/evidence.ts"
import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

const smallFingerprint = "a".repeat(64)
const largeFingerprint = "b".repeat(64)

const node = {
  nodeId: "1:1",
  name: "Control",
  type: "COMPONENT_SET",
  pageId: "1:0",
  pageName: "Controls",
  properties: {
    Size: { type: "VARIANT", defaultValue: "Small", variantOptions: ["Small", "Large"] },
  },
  variants: [
    {
      nodeId: "1:10",
      name: "Size=Small",
      device: null,
      designFingerprint: smallFingerprint,
      box: { width: 100, height: 40 },
    },
    {
      nodeId: "1:11",
      name: "Size=Large",
      device: null,
      designFingerprint: largeFingerprint,
      box: { width: 120, height: 40 },
    },
  ],
}

const cases = [
  { id: "small", nodeId: "1:1", export: "Control", storyId: "fixture--example", variant: "1:10" },
  { id: "large", nodeId: "1:1", export: "Control", storyId: "fixture--example", variant: "1:11" },
]

const snapshot = {
  fileKey: "fixture",
  version: "v1",
  nodes: {
    "1:1": {
      document: {
        id: "1:1",
        name: "Control",
        type: "COMPONENT_SET",
        children: [
          { id: "1:10", name: "Size=Small", type: "COMPONENT", children: [] },
          { id: "1:11", name: "Size=Large", type: "COMPONENT", children: [] },
        ],
      },
    },
  },
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")

const smallPng = Buffer.from("small-png")
const largePng = Buffer.from("large-png")

function manifestFor({ version = "v1" } = {}) {
  return {
    schemaVersion: 1,
    fileKey: "fixture",
    version,
    capturedAt: "2026-10-21",
    cases: {
      small: {
        png: "references/small.png",
        sha256: sha256(smallPng),
        nodeId: "1:1",
        variant: "1:10",
        designFingerprint: smallFingerprint,
        width: 100,
        height: 40,
      },
      large: {
        png: "references/large.png",
        sha256: sha256(largePng),
        nodeId: "1:1",
        variant: "1:11",
        designFingerprint: largeFingerprint,
        width: 120,
        height: 40,
      },
    },
  }
}

function sliceFor() {
  return {
    schemaVersion: 1,
    kind: "parity-source",
    fileKey: "fixture",
    version: "v1",
    nodes: structuredClone(snapshot.nodes),
  }
}

function writeEvidenceTree(root, { manifest = manifestFor(), slice = sliceFor(), pngs } = {}) {
  const dir = path.join(root, "docs/figma-parity")
  fs.mkdirSync(path.join(dir, "references"), { recursive: true })
  fs.writeFileSync(path.join(dir, "source.json"), JSON.stringify(slice, null, 2))
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2))
  for (const [caseId, bytes] of Object.entries(pngs ?? { small: smallPng, large: largePng })) {
    fs.writeFileSync(path.join(dir, "references", `${caseId}.png`), bytes)
  }
}

function temporaryRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-evidence-"))
}

test("the slice carries every case node with its full variant subtree", async () => {
  const { result, errors } = await buildEvidence({
    snapshot,
    cases,
    nodes: [node],
    existing: manifestFor(),
    existingPngs: new Map([
      ["small", smallPng],
      ["large", largePng],
    ]),
  })
  assert.deepEqual(errors, [])
  assert.equal(result.slice.kind, "parity-source")
  assert.equal(result.slice.schemaVersion, 1)
  assert.equal(result.slice.fileKey, "fixture")
  assert.equal(result.slice.version, "v1")
  assert.deepEqual(Object.keys(result.slice.nodes), ["1:1"])
  assert.equal(result.slice.nodes["1:1"].document.id, "1:1")
  assert.equal(result.slice.nodes["1:1"].document.children.length, 2)
  // Both cases were unchanged: no PNG was fetched or rewritten.
  assert.deepEqual(result.refreshed, [])
  assert.deepEqual(result.reused, ["small", "large"])
  assert.equal(result.pngs.size, 0)
  assert.deepEqual(Object.keys(result.manifest.cases), ["small", "large"])
})

test("a manifest round-trip is accepted by the hermetic check", () => {
  const root = temporaryRoot()
  try {
    writeEvidenceTree(root)
    const slice = loadSlice(path.join(root, "docs/figma-parity/source.json"))
    const manifest = loadManifest(path.join(root, "docs/figma-parity/manifest.json"))
    assert.equal(slice.version, manifest.version)
    const report = checkEvidence({ root, cases, nodes: [node] })
    assert.deepEqual(report.errors, [])
    assert.deepEqual(report.warnings, [])
    assert.equal(report.entries, 2)
    assert.equal(report.cases, 2)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("an orphan manifest entry and an orphan PNG are errors", () => {
  const root = temporaryRoot()
  try {
    const manifest = manifestFor()
    manifest.cases.gone = {
      png: "references/gone.png",
      sha256: "c".repeat(64),
      nodeId: "1:1",
      variant: "1:10",
      designFingerprint: smallFingerprint,
      width: 100,
      height: 40,
    }
    writeEvidenceTree(root, { manifest })
    fs.writeFileSync(path.join(root, "docs/figma-parity/references/orphan.png"), "orphan")
    const { errors } = checkEvidence({ root, cases, nodes: [node] })
    assert.ok(
      errors.some((error) => /gone: manifest entry with no case in the corpus/.test(error)),
      errors.join("\n"),
    )
    assert.ok(
      errors.some((error) => /references\/orphan\.png: orphan reference/.test(error)),
      errors.join("\n"),
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a PNG that no longer matches its hash is an error", () => {
  const root = temporaryRoot()
  try {
    writeEvidenceTree(root, { pngs: { small: Buffer.from("changed"), large: largePng } })
    const { errors } = checkEvidence({ root, cases, nodes: [node] })
    assert.ok(
      errors.some((error) => /small: references\/small\.png does not match/.test(error)),
      errors.join("\n"),
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a manifest version that differs from the slice is an error", () => {
  const root = temporaryRoot()
  try {
    writeEvidenceTree(root, { manifest: manifestFor({ version: "v0" }) })
    const { errors } = checkEvidence({ root, cases, nodes: [node] })
    assert.ok(
      errors.some((error) => /pins version v0, the slice pins v1/.test(error)),
      errors.join("\n"),
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a slice without the case variant is an error", () => {
  const root = temporaryRoot()
  try {
    const slice = sliceFor()
    slice.nodes["1:1"].document.children = [
      { id: "1:10", name: "Size=Small", type: "COMPONENT", children: [] },
    ]
    writeEvidenceTree(root, { slice })
    const { errors } = checkEvidence({ root, cases, nodes: [node] })
    assert.ok(
      errors.some((error) => /large: the slice has no variant 1:11/.test(error)),
      errors.join("\n"),
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("a bundle above the cap is refused with its largest cases", () => {
  const root = temporaryRoot()
  try {
    writeEvidenceTree(root)
    const { errors } = checkEvidence({ root, cases, nodes: [node], maxBytes: 10 })
    assert.ok(
      errors.some((error) =>
        /the evidence bundle is .* \(cap 10 B\).*largest cases: small/.test(error),
      ),
      errors.join("\n"),
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("the evidence command checks a fixture tree without a token", () => {
  const root = temporaryRoot()
  try {
    writeEvidenceTree(root)
    fs.mkdirSync(path.join(root, "src/catalog/figma"), { recursive: true })
    fs.writeFileSync(path.join(root, "src/catalog/figma/parity-cases.json"), JSON.stringify(cases))
    fs.writeFileSync(
      path.join(root, "src/catalog/figma/inventory.json"),
      JSON.stringify({
        fileKey: "fixture",
        syncedAt: "2026-10-21",
        components: [node],
      }),
    )
    const result = spawnSync(process.execPath, [script, "parity", "evidence", "--check"], {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnv(root, { FIGMA_TOKEN: "" }),
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /evidence: 2 case\(s\) · 2 manifest entr\(ies\)/)
    assert.match(result.stdout, /evidence: ok/)
    assert.ok(MAX_EVIDENCE_BYTES > 0)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
