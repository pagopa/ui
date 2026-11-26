// Shared plumbing of the per-domain packed-artifact specs: the consumer page
// every domain opens, the keyboard and artwork probes more than one domain
// reads, and the new-tab policy of the engine under test.
import assert from "node:assert/strict"
import sharp from "sharp"

// The source device width and the reduced-motion preference every domain runs
// with: the artifact is asserted against the desktop composition unless the
// domain sets a viewport itself.
export const consumerUse = { viewport: { width: 1024, height: 900 }, reducedMotion: "reduce" }

// WebKit opens a link in a new tab on the platform modifier (Cmd) on macOS, and
// on nothing at all on Linux: WebKitGTK implements no new-tab gesture, so the
// assertion that follows is skipped there instead of waiting for a page event
// that the engine will never emit. Where the engine does open the tab, the wait
// stays bounded: a tab the browser opens but never reports is a browser fault,
// and the spec has to name it in seconds instead of spending its whole budget.
export const NEW_TAB_TIMEOUT = 15_000

// The restriction the two helpers below share: outside macOS, WebKit opens no
// new tab at all.
const webkitNewTabNeedsMacOS = (browserName) =>
  browserName === "webkit" && process.platform !== "darwin"

export function opensNewTabInBrowser(browserName) {
  return !webkitNewTabNeedsMacOS(browserName)
}

export function newTabClickOptions(browserName) {
  // The modifier click is what opens a tab on WebKit — including the Linux run
  // the caller skips — and on Chromium for macOS; everywhere else a middle
  // click opens it.
  const opensWithMeta =
    webkitNewTabNeedsMacOS(browserName) ||
    (process.platform === "darwin" && (browserName === "webkit" || browserName === "chromium"))
  return opensWithMeta ? { modifiers: ["Meta"] } : { button: "middle" }
}

// Every domain starts from the same served application and keeps listening for
// the errors the installed package logs while it drives it: a failure names its
// domain, and the domain that triggered a browser error is the one that fails.
export async function openConsumer(page) {
  const url = process.env.CONSUMER_URL
  assert.ok(url, "CONSUMER_URL is required")
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.goto(url)
  const consumerScope = page.locator("#root > .pagopa-ui-root[data-pagopa-ui-root]")
  await consumerScope.waitFor()
  return { consumerScope, errors, url }
}

export async function assertFocusPerimeter(control, painted = control) {
  assert.equal(
    await control.evaluate((element) => document.activeElement === element),
    true,
    `keyboard focus is missing: ${control}`,
  )
  const outline = await painted.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      width: parseFloat(style.outlineWidth),
      style: style.outlineStyle,
      color: style.outlineColor,
    }
  })
  assert.equal(outline.style, "solid", `focus perimeter is not painted: ${control}`)
  assert.ok(outline.width >= 2, `focus perimeter is smaller than two CSS pixels: ${control}`)
  assert.notEqual(outline.color, "rgba(0, 0, 0, 0)", `focus perimeter is transparent: ${control}`)
}

export async function assertAvatarPaint(element, color, minimum) {
  const artwork = await sharp(await element.screenshot())
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let painted = 0
  for (let index = 0; index < artwork.data.length; index += 4) {
    if (
      artwork.data[index] === color[0] &&
      artwork.data[index + 1] === color[1] &&
      artwork.data[index + 2] === color[2] &&
      artwork.data[index + 3] === 255
    )
      painted += 1
  }
  assert.ok(
    painted >= minimum,
    `packed Avatar must actually paint ${color}: ${painted} pixels, expected at least ${minimum}`,
  )
  return artwork
}

// The packed OTP paints five underlines, the cursor and the remaining mask
// markers over its native slots: the caller reads them in its own color space,
// the source palette before forced colors and the system palette after.
export async function assertCodeArtwork(codeFrame, lineColor, caretColor, maskColor) {
  const artwork = await sharp(await codeFrame.screenshot())
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const paints = (x, y, color) => {
    const offset = (y * artwork.info.width + x) * 4
    return (
      color.every((channel, index) => artwork.data[offset + index] === channel) &&
      artwork.data[offset + 3] === 255
    )
  }
  for (let index = 0; index < 5; index += 1) {
    let underlinePixels = 0
    for (let y = 36; y <= 38; y += 1) {
      for (let x = 25 + index * 27; x < 36 + index * 27; x += 1) {
        if (paints(x, y, lineColor)) underlinePixels += 1
      }
    }
    assert.ok(underlinePixels >= 6, `packed OTP source underline ${index + 1} does not paint`)
  }
  let caretPixels = 0
  for (let y = 17; y < 33; y += 1) {
    for (let x = 83; x <= 85; x += 1) {
      if (paints(x, y, caretColor)) caretPixels += 1
    }
  }
  assert.ok(caretPixels >= 8, "packed OTP source cursor does not paint")
  let maskPixels = 0
  for (let y = 23; y <= 30; y += 1) {
    for (let x = 27; x <= 34; x += 1) {
      if (paints(x, y, maskColor)) maskPixels += 1
    }
  }
  assert.ok(maskPixels >= 28, "packed OTP source mask marker does not paint")
  assert.equal(paints(31, 27, maskColor), true, "source mask center is empty")
  assert.equal(paints(27, 23, maskColor), false, "source mask lost its rounded corner")
}
