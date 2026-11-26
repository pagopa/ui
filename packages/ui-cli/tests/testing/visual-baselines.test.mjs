import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { fixtureTree } from "../helpers/cli.mjs"
import { testingAdapters } from "../../src/adapters/testing.ts"
import {
  BASELINES_ROOT,
  fetchVisualBaselines,
  storedVisualBaselines,
  visualBaselineKey,
} from "../../src/testing/visual-baselines.ts"

const MANIFEST = '{"entries":{}}'
// The SHA-256 of the manifest above, taken from `sha256sum` rather than from the
// implementation: the first segment of every key is this digest.
const MANIFEST_HASH = "3dc8f49758f1336b64c32ad0c3bea1b8bcd32e06e3c5563dc92204ca4508683e"
const DIGEST = "eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27"
const IMAGE = `mcr.microsoft.com/playwright:v1.63.0-noble@sha256:${DIGEST}`
const KEY = `${MANIFEST_HASH}/chromium/sha256-${DIGEST}`

function write(root, file, content) {
  const target = path.join(root, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content)
}

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" })
  assert.equal(result.status, 0, `${args.join(" ")}: ${result.stderr}`)
  return result.stdout
}

function commit(root, message) {
  git(root, [
    "-c",
    "user.name=fixture",
    "-c",
    "user.email=fixture@example.com",
    "commit",
    "-q",
    "-m",
    message,
  ])
}

// A storage repository with the key's set, committed: the shape
// `pagopa/ui-visual-baselines` has.
function storageWith(files) {
  const tree = fixtureTree({}, "pagopa-visual-storage-")
  for (const file of files) write(tree.root, file, "png\n")
  git(tree.root, ["init", "-q"])
  git(tree.root, ["add", "."])
  commit(tree.root, "baselines")
  return tree
}

test("the key names the manifest, the engine and the pinned image", () => {
  const key = visualBaselineKey({ manifest: MANIFEST, image: IMAGE })

  assert.equal(key.manifest, MANIFEST_HASH)
  assert.equal(key.engine, "chromium")
  assert.equal(key.image, `sha256-${DIGEST}`)
  assert.equal(key.key, KEY)
  assert.equal(key.directory, `${BASELINES_ROOT}/${KEY}`)

  // Any of the three inputs moving the rendering moves the key.
  const otherManifest = visualBaselineKey({ manifest: '{"entries":{"a":{}}}', image: IMAGE })
  assert.notEqual(otherManifest.key, key.key)
  const otherEngine = visualBaselineKey({ manifest: MANIFEST, image: IMAGE, engine: "Firefox" })
  assert.equal(otherEngine.key, `${MANIFEST_HASH}/firefox/sha256-${DIGEST}`)
  const otherImage = visualBaselineKey({
    manifest: MANIFEST,
    image: `mcr.microsoft.com/playwright:v1.64.0-noble@sha256:${DIGEST}`,
  })
  assert.equal(otherImage.key, key.key, "the digest, not the tag, pins the image")

  // The manifest is read as bytes: the same JSON with different bytes differs.
  assert.notEqual(visualBaselineKey({ manifest: `${MANIFEST}\n`, image: IMAGE }).key, key.key)
})

test("a tag-only image keys on its tag and an unpinned or unsafe input is refused", () => {
  const tagged = visualBaselineKey({
    manifest: MANIFEST,
    image: "mcr.microsoft.com/playwright:v1.63.0-noble",
  })
  assert.equal(tagged.image, "tag-v1.63.0-noble")
  assert.equal(tagged.key, `${MANIFEST_HASH}/chromium/tag-v1.63.0-noble`)

  assert.throws(
    () => visualBaselineKey({ manifest: MANIFEST, image: "mcr.microsoft.com/playwright" }),
    /pinned/,
  )
  assert.throws(
    () => visualBaselineKey({ manifest: MANIFEST, image: IMAGE, engine: "../elsewhere" }),
    /engine/,
  )
})

test("the fetch clones the storage shallowly and materialises only the key's set", () => {
  const storage = storageWith([
    `${BASELINES_ROOT}/${KEY}/components-button--primary-320.png`,
    `${BASELINES_ROOT}/${KEY}/components-button--primary-1200.png`,
    `${BASELINES_ROOT}/another/key/components-card--plain-320.png`,
  ])
  const tree = fixtureTree({}, "pagopa-visual-fetch-")
  const key = visualBaselineKey({ manifest: MANIFEST, image: IMAGE })
  const calls = []
  const adapters = testingAdapters({})
  const gitSpy = (root, args) => {
    calls.push(args)
    return adapters.git(root, args)
  }

  const fetched = fetchVisualBaselines({
    workspace: tree.root,
    key,
    repository: `file://${storage.root}`,
    git: gitSpy,
  })

  assert.equal(fetched.key, KEY)
  assert.equal(fetched.snapshots, path.join(tree.root, ".nx/visual-baselines/snapshots"))
  assert.deepEqual(fs.readdirSync(fetched.snapshots).sort(), [
    "components-button--primary-1200.png",
    "components-button--primary-320.png",
  ])
  assert.equal(
    fs.existsSync(path.join(tree.root, ".nx/visual-baselines/clone")),
    false,
    "the clone is scratch space, not a checkout left behind",
  )
  assert.equal(fs.existsSync(path.join(tree.root, ".git")), false, "the workspace is untouched")

  // Shallow, filtered, sparse: the history of the storage never lands here.
  const clone = calls[0]
  assert.equal(clone[0], "clone")
  assert.equal(clone[clone.indexOf("--depth") + 1], "1")
  assert.ok(clone.includes("--filter=blob:none"), clone.join(" "))
  assert.ok(clone.includes("--sparse"), clone.join(" "))
  assert.ok(
    calls.some(
      (args) => args.includes("sparse-checkout") && args.includes(`${BASELINES_ROOT}/${KEY}`),
    ),
    JSON.stringify(calls),
  )

  const stored = storedVisualBaselines(tree.root)
  assert.equal(stored?.key, KEY)
  assert.equal(stored?.manifest, MANIFEST_HASH)
  assert.equal(stored?.repository, `file://${storage.root}`)

  // The second run reuses the fetched set instead of cloning again.
  calls.length = 0
  fetchVisualBaselines({
    workspace: tree.root,
    key,
    repository: `file://${storage.root}`,
    git: gitSpy,
  })
  assert.deepEqual(calls, [])

  // A record whose set has gone refetches: the record alone is not a baseline.
  fs.rmSync(fetched.snapshots, { recursive: true })
  assert.equal(storedVisualBaselines(tree.root), null)
})

test("a missing set fails naming the key and the storage repository", () => {
  const storage = storageWith(["README.md"])
  const tree = fixtureTree({}, "pagopa-visual-fetch-missing-")
  const key = visualBaselineKey({ manifest: MANIFEST, image: IMAGE })

  assert.throws(
    () =>
      fetchVisualBaselines({
        workspace: tree.root,
        key,
        repository: `file://${storage.root}`,
        git: testingAdapters({}).git,
      }),
    (error) => {
      assert.match(error.message, new RegExp(KEY))
      assert.match(error.message, /file:\/\/.*pagopa-visual-storage-/)
      assert.match(error.message, /missing/)
      return true
    },
  )
  assert.equal(storedVisualBaselines(tree.root), null, "a failed fetch leaves no record")
})

test("a GitHub repository needs a token and never prints one", () => {
  const tree = fixtureTree({}, "pagopa-visual-fetch-token-")
  const key = visualBaselineKey({ manifest: MANIFEST, image: IMAGE })

  assert.throws(
    () =>
      fetchVisualBaselines({
        workspace: tree.root,
        key,
        repository: "pagopa/ui-visual-baselines",
        git: testingAdapters({}).git,
      }),
    /GITHUB_TOKEN/,
  )

  // The URL carries the token; the message must not.
  assert.throws(
    () =>
      fetchVisualBaselines({
        workspace: tree.root,
        key,
        repository: "pagopa/ui-visual-baselines",
        token: "s3cret-token",
        git: (_root, args) => ({
          status: 1,
          stdout: "",
          stderr: `fatal: could not read from ${args.at(-2)}`,
        }),
      }),
    (error) => {
      assert.match(error.message, /cannot fetch pagopa\/ui-visual-baselines/)
      assert.doesNotMatch(error.message, /s3cret-token/)
      return true
    },
  )
})
