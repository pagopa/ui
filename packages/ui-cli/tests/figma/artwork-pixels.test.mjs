import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import sharp from "sharp"

import { stripRedundantArtwork } from "../../src/figma/artwork/svg-strip.ts"

// The pinned glyphs are the only artwork the pass ever runs on, so the parity
// proof is spent on all of them rather than on a hand-written sample: a raster
// of the source and of the stripped file, compared byte for byte.
const ARTWORK = path.resolve(import.meta.dirname, "../../../artwork/src/assets/figma-icons")
const EDGE = 96

const files = fs
  .readdirSync(ARTWORK)
  .filter((file) => file.endsWith(".svg"))
  .sort()

async function pixels(markup) {
  return sharp(Buffer.from(markup), { density: 384 }).resize(EDGE, EDGE).raw().toBuffer()
}

test("no pinned glyph changes a pixel, and the masks really do go", async () => {
  assert.ok(files.length >= 190, `expected the pinned artwork on disk, saw ${files.length} files`)
  const mismatched = []
  let stripped = 0
  for (const file of files) {
    const source = fs.readFileSync(path.join(ARTWORK, file), "utf8")
    const compact = stripRedundantArtwork(source)
    if (compact === source) continue
    stripped += 1
    assert.ok(!compact.includes("<mask"), `${file} kept a mask`)
    const [before, after] = await Promise.all([pixels(source), pixels(compact)])
    if (!before.equals(after)) mismatched.push(file)
  }
  // A pass that stopped recognising anything would pass the comparison above
  // vacuously, so the count is pinned too.
  assert.ok(stripped >= 190, `only ${stripped} glyphs were simplified`)
  assert.deepEqual(mismatched, [], "these glyphs would change on screen")
})
