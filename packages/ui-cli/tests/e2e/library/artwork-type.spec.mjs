// The packed artwork and type a page loads: the Pictograms, the Fonts, the local
// source Icons and the Icon variants the consumer expects from the package.
import assert from "node:assert/strict"
import { test } from "@playwright/test"
import { consumerUse, openConsumer } from "./support.mjs"

test.use(consumerUse)

test("artwork and type: the packed pictograms, fonts and icon variants load", async ({ page }) => {
  const { errors } = await openConsumer(page)
  // Pictograms are decorative: alt="" means no img role, so the packed artwork is
  // selected by its source node ids and the decorative contract is asserted.
  const images = await page
    .locator('img[data-figma-node-id="11719:39454"], img[data-figma-node-id="11719:39456"]')
    .all()
  assert.equal(images.length, 2)
  for (const image of images) {
    assert.equal(await image.getAttribute("alt"), "")
  }
  const urls = []
  for (const image of images) {
    const asset = await image.evaluate(async (element) => {
      if (!(element instanceof HTMLImageElement)) throw new Error("Expected a pictogram image")
      await element.decode()
      return {
        url: element.currentSrc,
        width: element.naturalWidth,
        height: element.naturalHeight,
      }
    })
    assert.ok(asset.width > 0 && asset.height > 0, "packed pictogram did not load")
    urls.push(asset.url)
  }
  assert.notEqual(urls[0], urls[1], "packed light and dark artwork share an asset")
  const fontFamily = await page
    .getByRole("button", { name: "Attiva azione" })
    .evaluate((element) => getComputedStyle(element).fontFamily)
  const fontsLoaded = await page.evaluate(async (fontFamily) => {
    for (const weight of [400, 600, 700]) {
      const faces = await document.fonts.load(`${weight} 16px ${fontFamily}`, "PagoPA \u021a")
      if (faces.length === 0) return false
    }
    return [...document.fonts].every((font) => font.status === "loaded")
  }, fontFamily)
  assert.equal(fontsLoaded, true, "packed text or icon fonts did not load")
  const localArtwork = page.getByRole("region", { name: "Icone locali" })
  assert.equal(
    await localArtwork.count(),
    1,
    "the installed consumer must exercise local source artwork",
  )
  const localIcons = await localArtwork.getByRole("img").all()
  const expectedIconVariants = Number(process.env.EXPECTED_ICON_VARIANTS)
  assert.ok(
    Number.isInteger(expectedIconVariants) && expectedIconVariants > 0,
    "EXPECTED_ICON_VARIANTS must come from the pinned icon manifest",
  )
  assert.equal(
    localIcons.length,
    expectedIconVariants,
    "every published source icon variant must render in the installed package",
  )
  const localIdentities = []
  const localPaints = []
  for (const icon of localIcons) {
    const asset = await icon.evaluate((element) => {
      const nodeId = element.getAttribute("data-figma-node-id") ?? ""
      const prefix = nodeId.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      const bounds = element.getBoundingClientRect()
      return {
        id: nodeId,
        tag: element.tagName.toLowerCase(),
        viewBox: element.getAttribute("viewBox"),
        maskImage: getComputedStyle(element).maskImage,
        drawings: element.childElementCount,
        images: element.querySelectorAll("img").length,
        // The per-icon id namespace keeps masks unique; drop it to compare geometry.
        paint: element.innerHTML.replaceAll(`${prefix}-`, ""),
        width: bounds.width,
        height: bounds.height,
      }
    })
    assert.equal(asset.tag, "svg", "packed local symbols must paint inline")
    assert.equal(asset.viewBox, "0 0 24 24", "packed local symbols must keep their source frame")
    assert.equal(asset.maskImage, "none", "packed local symbols must not paint through a mask")
    assert.equal(asset.images, 0, "packed local symbols must not request their artwork")
    assert.ok(asset.drawings > 0, `packed local symbol lost its drawing: ${asset.id}`)
    assert.equal(asset.width, 24)
    assert.equal(asset.height, 24)
    localIdentities.push(asset.id)
    localPaints.push(asset.paint)
  }
  const expectedIconVariantIds = (process.env.EXPECTED_ICON_VARIANT_IDS ?? "")
    .split(",")
    .filter(Boolean)
    .sort()
  assert.equal(
    expectedIconVariantIds.length,
    expectedIconVariants,
    "EXPECTED_ICON_VARIANT_IDS must cover the pinned icon manifest",
  )
  assert.deepEqual(
    localIdentities.sort(),
    expectedIconVariantIds,
    "packed local artwork lost a source variant identity",
  )
  const expectedIconPaints = Number(process.env.EXPECTED_ICON_PAINTS)
  assert.ok(
    Number.isInteger(expectedIconPaints) && expectedIconPaints > 0,
    "EXPECTED_ICON_PAINTS must come from the compiled icon components",
  )
  assert.equal(
    new Set(localPaints).size,
    expectedIconPaints,
    "the packed artifact must draw every source geometry exactly as the package compiles it",
  )
  assert.deepEqual(errors, [], "packed application logged browser errors")
})
