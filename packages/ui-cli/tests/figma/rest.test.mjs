import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import {
  fetchFigmaNodeDocuments,
  fetchFileHeader,
  writeFigmaSnapshot,
} from "../../src/figma/rest.ts"

const nodeId = "12:34"
const version = "fixture-pinned-version"
const document = {
  id: nodeId,
  name: "Frame",
  type: "FRAME",
  absoluteBoundingBox: { x: -18, y: 22, width: 200, height: 100 },
  children: [],
}

async function withFigmaFetch(fetchImplementation, callback, token = "fixture-token") {
  const originalFetch = globalThis.fetch
  const previousToken = process.env.FIGMA_TOKEN
  const previousPath = process.env.PATH
  if (token === null) delete process.env.FIGMA_TOKEN
  else process.env.FIGMA_TOKEN = token
  if (token === null) process.env.PATH = ""
  globalThis.fetch = fetchImplementation
  try {
    return await callback()
  } finally {
    globalThis.fetch = originalFetch
    if (previousToken === undefined) delete process.env.FIGMA_TOKEN
    else process.env.FIGMA_TOKEN = previousToken
    if (previousPath === undefined) delete process.env.PATH
    else process.env.PATH = previousPath
  }
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status })
}

test("supplemental document reads request and preserve one exact pinned node", async () => {
  await withFigmaFetch(
    async (url, options) => {
      const request = new URL(url)
      assert.equal(request.pathname, "/v1/files/fixture-file/nodes")
      assert.equal(request.searchParams.get("ids"), nodeId)
      assert.equal(request.searchParams.get("version"), version)
      assert.equal(request.searchParams.get("geometry"), "paths")
      assert.equal(options.method, "GET")
      assert.equal(options.headers["X-Figma-Token"], "fixture-token")
      return jsonResponse({ fileKey: "fixture-file", version, nodes: { [nodeId]: { document } } })
    },
    async () => {
      const result = await fetchFigmaNodeDocuments(
        "fixture-file",
        version,
        [nodeId, nodeId],
        "fixture-token",
      )
      assert.equal(result.size, 1)
      assert.deepEqual(result.get(nodeId), document)
      assert.equal(result.get(nodeId).absoluteBoundingBox.x, -18)
    },
  )
})

test("supplemental document reads reject missing nodes and mismatched response identities", async () => {
  await withFigmaFetch(
    async () => jsonResponse({ version, nodes: {} }),
    async () => {
      await assert.rejects(
        fetchFigmaNodeDocuments("fixture-file", version, [nodeId], "fixture-token"),
        /missing at pinned version/,
      )
    },
  )
  await withFigmaFetch(
    async () =>
      jsonResponse({
        version,
        nodes: { [nodeId]: { document: { ...document, id: "12:35" } } },
      }),
    async () => {
      await assert.rejects(
        fetchFigmaNodeDocuments("fixture-file", version, [nodeId], "fixture-token"),
        /returned node 12:35 for requested node 12:34/,
      )
    },
  )
})

test("supplemental document reads reject wrong file/version and HTTP failures", async () => {
  await withFigmaFetch(
    async () => jsonResponse({ fileKey: "another-file", version, nodes: {} }),
    async () => {
      await assert.rejects(
        fetchFigmaNodeDocuments("fixture-file", version, [nodeId], "fixture-token"),
        /wrong file/,
      )
    },
  )
  await withFigmaFetch(
    async () => jsonResponse({ fileKey: "fixture-file", version: "latest", nodes: {} }),
    async () => {
      await assert.rejects(
        fetchFigmaNodeDocuments("fixture-file", version, [nodeId], "fixture-token"),
        /wrong version/,
      )
    },
  )
  await withFigmaFetch(
    async () =>
      new Response("denied", {
        status: 403,
        headers: { "retry-after": "3" },
      }),
    async () => {
      await assert.rejects(
        fetchFigmaNodeDocuments("fixture-file", version, [nodeId], "fixture-token"),
        /HTTP 403; retry after 3 seconds/,
      )
    },
  )
})

test("supplemental document reads require a token and explicit pinned inputs", async () => {
  let fetched = false
  await withFigmaFetch(
    async () => {
      fetched = true
      return jsonResponse({})
    },
    async () => {
      await assert.rejects(
        fetchFigmaNodeDocuments("fixture-file", version, [nodeId], ""),
        /resolved token/,
      )
      assert.equal(fetched, false)
    },
    null,
  )
  await assert.rejects(
    fetchFigmaNodeDocuments("fixture-file", "", [nodeId], "fixture-token"),
    /explicit snapshot version/,
  )
  await assert.rejects(
    fetchFigmaNodeDocuments("fixture-file", version, ["invalid"], "fixture-token"),
    /valid node IDs/,
  )
})

// A stalled read is a transient answer, not a broken command: the drift job
// used to fail on the 90 s abort of its first file read and leave the rules
// report missing, so the reader asks again before giving up.
test("a stalled read is retried and the answer is kept", async () => {
  let attempts = 0
  await withFigmaFetch(
    async () => {
      attempts += 1
      if (attempts === 1) {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError")
      }
      return jsonResponse({ version, lastModified: "2026-11-02T04:00:00Z" })
    },
    async () => {
      const header = await fetchFileHeader("fixture-file", "fixture-token")
      assert.equal(header.version, version)
      assert.equal(attempts, 2)
    },
  )
})

test("a dropped socket is retried like a stalled read", async () => {
  let attempts = 0
  await withFigmaFetch(
    async () => {
      attempts += 1
      if (attempts === 1) {
        throw new TypeError("fetch failed", { cause: { code: "ECONNRESET" } })
      }
      return jsonResponse({ version })
    },
    async () => {
      assert.equal((await fetchFileHeader("fixture-file", "fixture-token")).version, version)
      assert.equal(attempts, 2)
    },
  )
})

test("a failure another attempt cannot fix stops at once and names the request", async () => {
  let attempts = 0
  await withFigmaFetch(
    async () => {
      attempts += 1
      throw new Error("the token is not valid")
    },
    async () => {
      await assert.rejects(
        fetchFileHeader("fixture-file", "fixture-token"),
        /Figma GET files\/fixture-file\?depth=1: the token is not valid/,
      )
      assert.equal(attempts, 1)
    },
  )
})

test("an exhausted read reports the timeout and the endpoint", async () => {
  let attempts = 0
  await withFigmaFetch(
    async () => {
      attempts += 1
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError")
    },
    async () => {
      await assert.rejects(
        fetchFileHeader("fixture-file", "fixture-token"),
        /Figma GET files\/fixture-file\?depth=1: timed out after 90 s/,
      )
      assert.equal(attempts, 3)
    },
  )
})

// The live snapshot is too large for one string, so the writer streams compact
// records instead of stringifying the whole document: a missing `lastModified`
// must stay absent (a bare `undefined` is not JSON) and no temporary file may
// survive the rename.
test("the snapshot writer streams compact JSON and drops an absent lastModified", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-snapshot-"))
  try {
    const file = path.join(root, ".figma", "live-rest.json")
    const snapshot = {
      fileKey: "fixture-file",
      version: "fixture-pinned-version",
      meta: {
        components: [
          {
            node_id: nodeId,
            key: "fixture-key",
            name: "Frame",
            containing_frame: { pageId: "1:0", pageName: "Controls" },
            sources: ["rest"],
          },
        ],
        component_sets: [],
      },
      nodes: { [nodeId]: { document } },
    }
    writeFigmaSnapshot(file, snapshot)
    const text = fs.readFileSync(file, "utf8")
    assert.equal(text.trim().split("\n").length, 1)
    assert.deepEqual(JSON.parse(text), snapshot)
    assert.deepEqual(fs.readdirSync(path.dirname(file)), ["live-rest.json"])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
