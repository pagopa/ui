import assert from "node:assert/strict"
import { createServer } from "node:http"
import { test } from "node:test"

import { capture } from "../../src/adapters/storybook.ts"

test("a hover evidence selector keeps the pointer over its target", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" })
    response.end('<main id="storybook-root"><button id="hover-target">Switch</button></main>')
  })
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Expected an ephemeral server port")

  try {
    const result = await capture({
      storyId: "switch--hover",
      rootWidth: 150,
      rootSelector: "#storybook-root",
      expectState: "hover",
      stateEvidence: "#hover-target:hover",
      baseUrl: `http://127.0.0.1:${address.port}`,
    })
    assert.deepEqual(result.capture.state, { state: "hover", ok: true })
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
})
