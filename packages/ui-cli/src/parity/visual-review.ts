import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"

import { evidencePaths, loadManifest } from "./evidence.ts"

export function referenceForCase(caseId: string, root?: string): string {
  const paths = evidencePaths(root)
  const record = loadManifest(paths.manifest).cases[caseId]
  if (!record || record.png !== `references/${caseId}.png`) {
    throw new Error(`${caseId}: no valid pinned reference in the evidence manifest`)
  }
  const file = path.join(paths.dir, record.png)
  const bytes = fs.readFileSync(file)
  if (createHash("sha256").update(bytes).digest("hex") !== record.sha256) {
    throw new Error(`${caseId}: reference PNG hash differs from the evidence manifest`)
  }
  return file
}

export async function writeVisualReview({
  reference,
  render,
  out,
}: {
  reference: string
  render: string
  out: string
}): Promise<{ comparable: boolean; sourceSize: string; renderSize: string; diff?: string }> {
  const source = await sharp(reference)
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({
      resolveWithObject: true,
    })
  const actual = await sharp(render)
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({
      resolveWithObject: true,
    })
  const sourceSize = `${source.info.width}x${source.info.height}`
  const renderSize = `${actual.info.width}x${actual.info.height}`
  const diff = path.join(out, "diff.png")
  const comparable = sourceSize === renderSize
  fs.copyFileSync(reference, path.join(out, "figma.png"))
  if (!comparable) {
    if (fs.existsSync(diff)) fs.unlinkSync(diff)
    return { comparable, sourceSize, renderSize }
  }
  const pixels = Buffer.alloc(source.data.length)
  for (let i = 0; i < pixels.length; i += 4) {
    const delta = Math.max(
      Math.abs(source.data[i] - actual.data[i]),
      Math.abs(source.data[i + 1] - actual.data[i + 1]),
      Math.abs(source.data[i + 2] - actual.data[i + 2]),
    )
    pixels[i] = delta > 10 ? 230 : 235
    pixels[i + 1] = delta > 10 ? 30 : 238
    pixels[i + 2] = delta > 10 ? 40 : 243
    pixels[i + 3] = 255
  }
  await sharp(pixels, {
    raw: { width: source.info.width, height: source.info.height, channels: 4 },
  })
    .png()
    .toFile(diff)
  return { comparable, sourceSize, renderSize, diff }
}
