import assert from "node:assert/strict"
import http from "node:http"
import { test } from "node:test"

import { storybookIdentity } from "../../src/parity/storybook.ts"

// The identity guard is the answer to two worktrees on one port: the dev server
// never says which tree it serves, so the probe asks for a file only this tree
// owns. A stand-in server answers the way Vite does, without a browser: 200 for
// a file inside its tree, 403 for a readable file outside it, and no `/@fs/`
// route at all when the Storybook is a build.
async function withServer(answer, run) {
  const asked = []
  const server = http.createServer((request, response) => {
    asked.push(request.url)
    const status = answer(request.url)
    response.writeHead(status)
    response.end(status === 200 ? "{}" : "")
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  const url = `http://127.0.0.1:${address.port}`
  try {
    await run(url, asked)
  } finally {
    await new Promise((resolve) => server.close(() => resolve()))
  }
}

test("the tree that started the server is this tree", async () => {
  await withServer(
    () => 200,
    async (url, asked) => {
      const identity = await storybookIdentity(url)
      assert.equal(identity.state, "match")
      assert.equal(identity.url, url)
      assert.match(identity.marker, /apps\/storybook\/package\.json$/)
      // The probe asks through Vite's own endpoint, with this tree's path.
      assert.deepEqual(asked, [`/@fs${identity.marker}`])
    },
  )
})

test("a 403 is another worktree's tree, not this one", async () => {
  await withServer(
    () => 403,
    async (url) => {
      const identity = await storybookIdentity(url)
      assert.equal(identity.state, "foreign")
      assert.equal(identity.status, 403)
    },
  )
})

test("a build has no dev server and no tree to confuse: it is accepted", async () => {
  // A static Storybook has no `/@fs/` route: every path is a 404, the Vite
  // client included. Refusing it would call this tree's own build "another tree".
  await withServer(
    () => 404,
    async (url) => {
      const identity = await storybookIdentity(url)
      assert.equal(identity.state, "static")
      assert.match(String(identity.detail), /Vite client/)
    },
  )
})

test("a dev server that cannot read the marker is unknown, not another tree", async () => {
  // 404 on the marker with a live Vite client: a dev server, but not one that
  // can prove it serves this checkout (another host, a moved marker).
  await withServer(
    (path) => (path === "/@vite/client" ? 200 : 404),
    async (url) => {
      const identity = await storybookIdentity(url)
      assert.equal(identity.state, "unknown")
      assert.match(String(identity.detail), /404/)
    },
  )
})

test("an answer the guard cannot read is unknown, not a pass", async () => {
  await withServer(
    () => 500,
    async (url) => {
      const identity = await storybookIdentity(url)
      assert.equal(identity.state, "unknown")
      assert.match(String(identity.detail), /500/)
    },
  )
})

test("a port nothing listens on is a missing Storybook", async () => {
  const identity = await storybookIdentity("http://127.0.0.1:1")
  assert.equal(identity.state, "missing")
})
