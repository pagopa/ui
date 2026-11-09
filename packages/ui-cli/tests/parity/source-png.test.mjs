import { fixtureTree, runCli } from "../helpers/cli.mjs"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { readSource } from "../../src/parity/read-source.ts"
import { figmaImages } from "../../src/adapters/figma-images.ts"
import { workspaceAt } from "../helpers/cli.mjs"
import { TOOLING_ROOT } from "../../src/adapters/workspace.ts"

const SLICE = path.join(TOOLING_ROOT, "tests/fixtures/figma-parity/snapshot-slice.json")
const NODE_ID = "529:6123"
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const DEVICE_POLICY = fs.readFileSync(
  path.join(TOOLING_ROOT, "../pagopa-ui/src/catalog/figma/device-policy.json"),
  "utf8",
)

function sourceFixture(prefix = "pagopa-source-png-") {
  return fixtureTree({ "src/catalog/figma/device-policy.json": DEVICE_POLICY }, prefix)
}

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
    const directory = sourceFixture("pagopa-source-png-").root
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
      await readSource(
        workspaceAt(directory),
        { nodeId: NODE_ID, input: SLICE, png: file, compact: true, depth: 1 },
        figmaImages({ FIGMA_TOKEN: "fixture-token" }),
      )
      assert.deepEqual(fs.readFileSync(file), PNG)
      assert.equal(calls.length, 2)
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  }))

test("source --png needs FIGMA_TOKEN and writes nothing without it", async () => {
  const directory = sourceFixture("pagopa-source-png-").root
  const file = path.join(directory, "node.png")
  const previousToken = process.env.FIGMA_TOKEN
  const previousPath = process.env.PATH
  try {
    delete process.env.FIGMA_TOKEN
    process.env.PATH = ""
    await assert.rejects(
      () =>
        readSource(
          workspaceAt(directory),
          { nodeId: NODE_ID, input: SLICE, png: file, compact: true },
          figmaImages({ FIGMA_TOKEN: "" }),
        ),
      /FIGMA_TOKEN is missing/,
    )
    assert.equal(fs.existsSync(file), false)
  } finally {
    if (previousToken !== undefined) process.env.FIGMA_TOKEN = previousToken
    if (previousPath === undefined) delete process.env.PATH
    else process.env.PATH = previousPath
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("the CLI wires optional --png values and keeps the spec on stdout", () =>
  withTokenAndFetch(async () => {
    const f = sourceFixture("pagopa-source-png-cli-")
    globalThis.fetch = async (input, options) => {
      const url = new URL(input)
      if (url.hostname === "api.figma.com")
        return {
          ok: true,
          json: async () => ({ images: { [NODE_ID]: "https://assets.figma.test/node.png" } }),
        }
      assert.equal(options.headers, undefined, "credentials must not reach the asset host")
      return { ok: true, arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer }
    }
    try {
      for (const [args, file] of [
        [["--png", "node.png"], path.join(f.root, "node.png")],
        [["--png"], path.join(f.root, ".figma/parity/source/529-6123.png")],
      ]) {
        const result = await runCli(
          ["parity", "source", NODE_ID, "--input", SLICE, ...args, "--compact"],
          { root: f.root, env: { FIGMA_TOKEN: "fixture-token" } },
        )
        assert.equal(result.status, 0, result.stderr)
        assert.deepEqual(fs.readFileSync(file), Buffer.from([137, 80, 78, 71]))
        assert.match(result.stderr, /png: .*\.png \(version 2410226648852620157\)/)
        assert.match(result.stdout, /529:6123/)
      }
    } finally {
      f.dispose()
    }
  }))
