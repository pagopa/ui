import sharp from "sharp"

export function xmlEscape(value: unknown): string {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  )
}

// A committed SVG must stand alone: no external href, no entity declaration,
// no url() outside the document's own fragment references. Pictograms may
// inline a data URL, icons may not.
export function assertStandaloneSvg(
  source: string,
  label: string,
  { allowData = false }: { allowData?: boolean } = {},
): void {
  if (
    !source.includes("<svg") ||
    /\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(source) ||
    (/<!DOCTYPE\b|<!ENTITY\b/i.test(source) && !allowData) ||
    [...source.matchAll(/\burl\(\s*(["']?)(.*?)\1\s*\)/gi)].some(
      (match) => !(match[2] ?? "").startsWith("#") && !(allowData && match[2]?.startsWith("data:")),
    )
  ) {
    throw new Error(`Local artwork ${label} must be standalone, without external resources`)
  }
}

export async function assertRenderedPixels(source: string, label: string): Promise<void> {
  const { data, info } = await sharp(Buffer.from(source))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const painted = data.some((value, index) => index % info.channels === 3 && value > 0)
  if (!info.width || !info.height || !painted) {
    throw new Error(`Local artwork ${label} has no rendered artwork`)
  }
}

export async function assertSvgDimensions(source: string, label: string): Promise<void> {
  const metadata = await sharp(Buffer.from(source)).metadata()
  if (!metadata.width || !metadata.height) throw new Error(`Invalid SVG for ${label}`)
}
