import assert from "node:assert/strict"
import { test } from "node:test"
import { fetchFigmaNodeDocuments } from "../../src/figma/rest.ts"

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
  if (token === null) delete process.env.FIGMA_TOKEN
  else process.env.FIGMA_TOKEN = token
  globalThis.fetch = fetchImplementation
  try {
    return await callback()
  } finally {
    globalThis.fetch = originalFetch
    if (previousToken === undefined) delete process.env.FIGMA_TOKEN
    else process.env.FIGMA_TOKEN = previousToken
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
      const result = await fetchFigmaNodeDocuments("fixture-file", version, [nodeId, nodeId])
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
        fetchFigmaNodeDocuments("fixture-file", version, [nodeId]),
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
        fetchFigmaNodeDocuments("fixture-file", version, [nodeId]),
        /returned node 12:35 for requested node 12:34/,
      )
    },
  )
})

test("supplemental document reads reject wrong file/version and HTTP failures", async () => {
  await withFigmaFetch(
    async () => jsonResponse({ fileKey: "another-file", version, nodes: {} }),
    async () => {
      await assert.rejects(fetchFigmaNodeDocuments("fixture-file", version, [nodeId]), /wrong file/)
    },
  )
  await withFigmaFetch(
    async () => jsonResponse({ fileKey: "fixture-file", version: "latest", nodes: {} }),
    async () => {
      await assert.rejects(
        fetchFigmaNodeDocuments("fixture-file", version, [nodeId]),
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
        fetchFigmaNodeDocuments("fixture-file", version, [nodeId]),
        /HTTP 403; retry after 3 seconds/,
      )
    },
  )
})

test("supplemental document reads require a process token and explicit pinned inputs", async () => {
  let fetched = false
  await withFigmaFetch(
    async () => {
      fetched = true
      return jsonResponse({})
    },
    async () => {
      await assert.rejects(
        fetchFigmaNodeDocuments("fixture-file", version, [nodeId]),
        /FIGMA_TOKEN is missing or empty/,
      )
      assert.equal(fetched, false)
    },
    null,
  )
  await assert.rejects(
    fetchFigmaNodeDocuments("fixture-file", "", [nodeId]),
    /explicit snapshot version/,
  )
  await assert.rejects(
    fetchFigmaNodeDocuments("fixture-file", version, ["invalid"]),
    /valid node IDs/,
  )
})
