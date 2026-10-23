import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { sourceCli } from "../../src/parity/source.ts"
import { toolingPath } from "../../src/lib/paths.ts"

const SLICE = toolingPath("tests/fixtures/figma-parity/snapshot-slice.json")
const NODE_ID = "529:6123"
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

function withTokenAndFetch(run) {
  const previousToken = process.env.FIGMA_TOKEN
  const previousFetch = globalThis.fetch
  process.env.FIGMA_TOKEN = "fixture-token"
  return run().finally(() => {
    globalThis.fetch = previousFetch
    if (previousToken === undefined) delete process.env.FIGMA_TOKEN
    else process.env.FIGMA_TOKEN = previousToken
  })
}

test("source --png writes the pinned node PNG", () =>
  withTokenAndFetch(async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-source-png-"))
    const file = path.join(directory, "node.png")
    const calls = []
    globalThis.fetch = async (input, options) => {
      calls.push({ url: String(input), options })
      const url = new URL(input)
      if (url.hostname === "api.figma.com") {
        assert.equal(options.method, "GET")
        assert.equal(options.headers["X-Figma-Token"], "fixture-token")
        assert.equal(url.pathname, "/v1/images/pvhsJpPGQbEwNLiyP7BOIw")
        assert.equal(url.searchParams.get("ids"), NODE_ID)
        assert.equal(url.searchParams.get("version"), "2410226648852620157")
        assert.equal(url.searchParams.get("format"), "png")
        assert.equal(url.searchParams.get("scale"), "1")
        return {
          ok: true,
          json: async () => ({ images: { [NODE_ID]: "https://assets.figma.test/node.png" } }),
        }
      }
      assert.equal(options.headers, undefined, "credentials never reach the asset host")
      return {
        ok: true,
        arrayBuffer: async () => PNG.buffer.slice(PNG.byteOffset, PNG.byteOffset + PNG.byteLength),
      }
    }
    try {
      await sourceCli([NODE_ID, "--input", SLICE, "--png", file, "--compact", "--depth", "1"])
      assert.deepEqual(fs.readFileSync(file), PNG)
      assert.equal(calls.length, 2)
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  }))

test("source --png needs FIGMA_TOKEN and writes nothing without it", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-source-png-"))
  const file = path.join(directory, "node.png")
  const previousToken = process.env.FIGMA_TOKEN
  try {
    delete process.env.FIGMA_TOKEN
    await assert.rejects(
      () => sourceCli([NODE_ID, "--input", SLICE, "--png", file, "--compact"]),
      /FIGMA_TOKEN is missing/,
    )
    assert.equal(fs.existsSync(file), false)
  } finally {
    if (previousToken !== undefined) process.env.FIGMA_TOKEN = previousToken
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("the CLI wires --png and keeps the spec on stdout", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-source-png-cli-"))
  const preload = path.join(directory, "fetch.mjs")
  const file = path.join(directory, "node.png")
  fs.writeFileSync(
    preload,
    `
globalThis.fetch = async (input, options) => {
  const url = new URL(input)
  if (url.hostname === "api.figma.com") {
    return { ok: true, json: async () => ({ images: { ${JSON.stringify(NODE_ID)}: "https://assets.figma.test/node.png" } }) }
  }
  if (options.headers !== undefined) throw new Error("credentials must not reach the asset host")
  return { ok: true, arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer }
}
`,
  )
  try {
    const result = spawnSync(
      process.execPath,
      [script, "parity", "source", NODE_ID, "--input", SLICE, "--png", file, "--compact"],
      {
        cwd: path.resolve(path.dirname(script), ".."),
        env: {
          ...process.env,
          FIGMA_TOKEN: "fixture-token",
          NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import ${preload}`.trim(),
        },
        encoding: "utf8",
      },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(fs.readFileSync(file), Buffer.from([137, 80, 78, 71]))
    assert.match(result.stderr, /png: .*node\.png \(version 2410226648852620157\)/)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
