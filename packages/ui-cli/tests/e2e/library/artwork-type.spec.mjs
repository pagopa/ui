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
  const localURLs = []
  for (const icon of localIcons) {
    const asset = await icon.evaluate(async (element) => {
      const style = getComputedStyle(element)
      let image = element
      if (!(image instanceof HTMLImageElement)) {
        const match = style.maskImage.match(/^url\(["']?(.*?)["']?\)$/)
        if (!match) throw new Error("Local symbol has no source mask")
        image = new Image()
        image.src = match[1]
      }
      await image.decode()
      const bounds = element.getBoundingClientRect()
      return {
        id: element.getAttribute("data-figma-node-id"),
        url: image.currentSrc,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        width: bounds.width,
        height: bounds.height,
      }
    })
    assert.equal(asset.naturalWidth, 24, "packed local artwork did not decode at its source width")
    assert.equal(
      asset.naturalHeight,
      24,
      "packed local artwork did not decode at its source height",
    )
    assert.equal(asset.width, 24)
    assert.equal(asset.height, 24)
    localIdentities.push(asset.id)
    localURLs.push(asset.url)
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
  assert.equal(
    new Set(localURLs).size,
    expectedIconVariants,
    "distinct source variants must not share a fallback asset",
  )
  assert.deepEqual(errors, [], "packed application logged browser errors")
})
