import assert from "node:assert/strict"
import http from "node:http"
import { test } from "node:test"

import { storybookIdentity } from "../../src/parity/storybook.ts"

// The identity guard is the answer to two worktrees on one port: the dev server
// never says which tree it serves, so the probe asks for a file only this tree
// owns. A stand-in server answers the way Vite does, without a browser.
async function withServer(status, run) {
  const server = http.createServer((_request, response) => {
    response.writeHead(status)
    response.end(status === 200 ? "{}" : "")
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  const url = `http://127.0.0.1:${address.port}`
  try {
    await run(url)
  } finally {
    await new Promise((resolve) => server.close(() => resolve()))
  }
}

test("the tree that started the server is this tree", async () => {
  await withServer(200, async (url) => {
    const identity = await storybookIdentity(url)
    assert.equal(identity.state, "match")
    assert.equal(identity.url, url)
    assert.match(identity.marker, /apps\/storybook\/package\.json$/)
  })
})

test("a 403 is another worktree's tree, not this one", async () => {
  await withServer(403, async (url) => {
    const identity = await storybookIdentity(url)
    assert.equal(identity.state, "foreign")
    assert.equal(identity.status, 403)
  })
})

test("a missing marker is another tree too", async () => {
  await withServer(404, async (url) => {
    assert.equal((await storybookIdentity(url)).state, "foreign")
  })
})

test("an answer the guard cannot read is unknown, not a pass", async () => {
  await withServer(500, async (url) => {
    const identity = await storybookIdentity(url)
    assert.equal(identity.state, "unknown")
    assert.match(String(identity.detail), /500/)
  })
})

test("a port nothing listens on is a missing Storybook", async () => {
  const identity = await storybookIdentity("http://127.0.0.1:1")
  assert.equal(identity.state, "missing")
})
