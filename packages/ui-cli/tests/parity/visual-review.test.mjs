import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { test } from "node:test"
import sharp from "sharp"

import { referenceForCase, writeVisualReview } from "../../src/parity/visual-review.ts"
import { evidencePaths } from "../../src/parity/evidence.ts"
import { toolingPath } from "../../src/lib/paths.ts"

async function image(file, width, height, color) {
  await sharp({ create: { width, height, channels: 4, background: color } })
    .png()
    .toFile(file)
}

test("visual review writes a diff for matching dimensions and removes a stale diff on mismatch", async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "parity-visual-review-"))
  try {
    const source = path.join(out, "source.png")
    const render = path.join(out, "react.png")
    await image(source, 2, 2, "#ffffff")
    await image(render, 2, 2, "#000000")
    const result = await writeVisualReview({ reference: source, render, out })
    assert.equal(result.comparable, true)
    assert.equal(result.sourceSize, "2x2")
    assert.ok(fs.existsSync(path.join(out, "figma.png")))
    const pixel = await sharp(result.diff).raw().toBuffer()
    assert.deepEqual([...pixel.subarray(0, 4)], [230, 30, 40, 255])
    await image(render, 1, 2, "#ffffff")
    const mismatch = await writeVisualReview({ reference: source, render, out })
    assert.equal(mismatch.comparable, false)
    assert.equal(mismatch.renderSize, "1x2")
    assert.equal(fs.existsSync(path.join(out, "diff.png")), false)
    assert.ok(fs.existsSync(render))
    assert.ok(fs.existsSync(path.join(out, "figma.png")))
  } finally {
    fs.rmSync(out, { recursive: true, force: true })
  }
})

test("transparent reference pixels are composited on white", async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "parity-visual-alpha-"))
  try {
    const source = path.join(out, "source.png")
    const render = path.join(out, "react.png")
    await image(source, 1, 1, { r: 0, g: 0, b: 0, alpha: 0 })
    await image(render, 1, 1, "#ffffff")
    const result = await writeVisualReview({ reference: source, render, out })
    const pixel = await sharp(result.diff).raw().toBuffer()
    assert.deepEqual([...pixel.subarray(0, 4)], [235, 238, 243, 255])
  } finally {
    fs.rmSync(out, { recursive: true, force: true })
  }
})

test("grayscale inputs and the visualization threshold are compared as RGB", async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "parity-visual-gray-"))
  try {
    const source = path.join(out, "source.png")
    const render = path.join(out, "react.png")
    await sharp(Buffer.from([100, 100]), { raw: { width: 2, height: 1, channels: 1 } })
      .png()
      .toFile(source)
    await sharp(Buffer.from([110, 110, 110, 111, 111, 111]), {
      raw: { width: 2, height: 1, channels: 3 },
    })
      .png()
      .toFile(render)
    const result = await writeVisualReview({ reference: source, render, out })
    const pixels = await sharp(result.diff).raw().toBuffer()
    assert.deepEqual([...pixels], [235, 238, 243, 255, 230, 30, 40, 255])
  } finally {
    fs.rmSync(out, { recursive: true, force: true })
  }
})

test("a modified pinned image is rejected", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "parity-visual-reference-"))
  try {
    const paths = evidencePaths(root)
    fs.mkdirSync(paths.references, { recursive: true })
    fs.copyFileSync(evidencePaths().manifest, paths.manifest)
    const id = "108-1402-contained-label"
    fs.writeFileSync(path.join(paths.references, `${id}.png`), "not the pinned image")
    assert.throws(() => referenceForCase(id, root), /hash differs/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("missing references and invalid visual-review flags fail explicitly", () => {
  assert.throws(() => referenceForCase("no-such-case"), /no valid pinned reference/)
  for (const args of [
    ["--node", "108:1402", "--visual-review", ".figma/parity/review"],
    ["--case", "108-1402-contained-label", "--visual-review"],
    [
      "--case",
      "108-1402-contained-label",
      "--visual-review",
      ".figma/parity/review",
      "--variant",
      "1:1",
    ],
    ["--case", "108-1402-contained-label", "--visual-review", "outside"],
  ]) {
    const result = spawnSync(
      process.execPath,
      [toolingPath("src/cli.ts"), "parity", "check", ...args],
      {
        encoding: "utf8",
      },
    )
    assert.equal(result.status, 2, result.stderr)
    assert.match(result.stderr, /visual-review/)
  }
})
