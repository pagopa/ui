// The packed artifact under forced colors: every domain already asserted in its
// own spec is re-read with the system palette, so the packed components keep
// their paint, their focus perimeter and their artwork in high contrast.
import assert from "node:assert/strict"
import { test } from "@playwright/test"
import sharp from "sharp"
import {
  assertAvatarPaint,
  assertCodeArtwork,
  assertFocusPerimeter,
  consumerUse,
  openConsumer,
} from "./support.mjs"

test.use(consumerUse)

test("forced colors: the packed components keep their paint and focus perimeter", async ({
  browserName,
  page,
}) => {
  const { errors } = await openConsumer(page)
  // The forced-colors pass re-reads what the other domains assert one by one: it
  // derives the same locators and establishes the same state on its own page, so
  // the system palette is the only thing it shares with them.
  const action = page.getByRole("button", { name: "Attiva azione" })
  const localArtwork = page.getByRole("region", { name: "Icone locali" })
  const sourceSwitches = page.getByRole("form", { name: "Impostazioni degli aggiornamenti" })
  const sourceSwitch = sourceSwitches.getByRole("switch", { name: "Aggiornamenti della pratica" })
  const avatars = page.getByRole("region", { name: "Identità dal pacchetto" })
  const choice = avatars.getByRole("checkbox", { name: "Associa il prodotto", exact: true })
  const selectableIdentity = avatars.getByRole("img", { name: "Prodotto selezionabile installato" })
  const codeForm = page
    .getByRole("region", { name: "Codici di verifica dal pacchetto" })
    .getByRole("form", { name: "Verifica del codice privato" })
  const codeFrame = codeForm.getByRole("group", { name: /Codice privato.*obbligatorio/ })
  const codeSlots = codeFrame.locator("input")
  const codeCaret = codeFrame.locator("[data-slot=otp-field-caret]:visible")
  const calendar = page.getByRole("group", { name: "Calendario appuntamento" })
  const rangeCalendar = page.getByRole("group", { name: "Calendario intervallo" })
  await choice.focus()
  await page.keyboard.press(" ")
  await calendar.getByRole("button", { name: /16 maggio 2026/i }).click()
  await calendar.getByRole("button", { name: "Salva" }).click()
  await rangeCalendar.getByRole("button", { name: /12 maggio 2026/i }).click()
  await rangeCalendar.getByRole("button", { name: /15 maggio 2026/i }).click()
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
  assert.equal(
    await page.evaluate(() => matchMedia("(forced-colors: active)").matches),
    true,
    `${browserName} must actually enable forced colors for the painted-pixel acceptance`,
  )
  const forcedMask = await localArtwork
    .getByRole("img", { name: "feedback default", exact: true })
    .evaluate((element) => {
      const style = getComputedStyle(element)
      const probe = document.createElement("span")
      probe.style.color = "CanvasText"
      probe.style.forcedColorAdjust = "none"
      probe.style.transitionProperty = "none"
      document.body.append(probe)
      const systemText = getComputedStyle(probe).color
      probe.style.color = "Canvas"
      const systemCanvas = getComputedStyle(probe).color
      probe.style.color = "HighlightText"
      const systemHighlightText = getComputedStyle(probe).color
      probe.remove()
      return {
        color: style.color,
        background: style.backgroundColor,
        systemText,
        systemCanvas,
        systemHighlightText,
        adjustment: style.forcedColorAdjust,
        preservesParent: CSS.supports("forced-color-adjust", "preserve-parent-color"),
        parentColor: element.parentElement ? getComputedStyle(element.parentElement).color : null,
        className: element.className,
      }
    })
  await page.keyboard.press("Tab")
  for (const control of [
    action,
    sourceSwitch,
    page.getByLabel("Data della preferenza", { exact: true }),
    page.getByRole("textbox", { name: "Note della preferenza" }),
  ]) {
    await control.focus()
    await assertFocusPerimeter(control)
    assert.equal(
      await control.evaluate((element) => getComputedStyle(element).outlineColor),
      forcedMask.systemText,
      `forced keyboard perimeters must use the actual system foreground: ${control}`,
    )
  }
  assert.equal(
    forcedMask.background,
    forcedMask.color,
    "forced colors must not erase the local symbol's currentColor fill",
  )
  const systemChannels = forcedMask.systemText.match(/^rgb\((\d+), (\d+), (\d+)\)$/)
  assert.ok(systemChannels, `unsupported system foreground: ${forcedMask.systemText}`)
  const expectedPixel = systemChannels.slice(1).map(Number)
  await codeSlots.nth(2).focus()
  await assertFocusPerimeter(codeSlots.nth(2), codeFrame)
  assert.equal(
    await codeFrame.evaluate((element) => getComputedStyle(element).borderColor),
    forcedMask.systemText,
    "packed OTP must retain its system-colored shared frame",
  )
  assert.equal(
    await codeFrame.evaluate((element) => getComputedStyle(element).outlineColor),
    forcedMask.systemText,
    "packed OTP must keep its actual system-colored keyboard perimeter",
  )
  await codeCaret.waitFor()
  await assertCodeArtwork(codeFrame, expectedPixel, expectedPixel, expectedPixel)
  const pixels = await sharp(
    await localArtwork.getByRole("img", { name: "feedback default", exact: true }).screenshot(),
  )
    .ensureAlpha()
    .raw()
    .toBuffer()
  let foregroundPixels = 0
  for (let index = 0; index < pixels.length; index += 4) {
    if (
      pixels[index] === expectedPixel[0] &&
      pixels[index + 1] === expectedPixel[1] &&
      pixels[index + 2] === expectedPixel[2] &&
      pixels[index + 3] === 255
    )
      foregroundPixels += 1
  }
  assert.ok(
    foregroundPixels >= 4,
    `local symbols must actually paint the forced foreground: ${JSON.stringify(forcedMask)}`,
  )
  await page.evaluate(() => {
    const probe = document.createElement("span")
    probe.id = "consumer-system-highlight-probe"
    Object.assign(probe.style, {
      display: "block",
      width: "4px",
      height: "4px",
      position: "fixed",
      left: "0",
      top: "0",
      pointerEvents: "none",
      backgroundColor: "Canvas",
      forcedColorAdjust: "none",
    })
    const highlight = document.createElement("span")
    Object.assign(highlight.style, {
      display: "block",
      width: "4px",
      height: "4px",
      backgroundColor: "Highlight",
    })
    probe.append(highlight)
    document.body.append(probe)
  })
  const highlightPixels = await sharp(
    await page.locator("#consumer-system-highlight-probe").screenshot(),
  )
    .ensureAlpha()
    .raw()
    .toBuffer()
  const expectedHighlight = [...highlightPixels.subarray(0, 3)]
  await page.locator("#consumer-system-highlight-probe").evaluate((element) => element.remove())
  const canvasChannels = forcedMask.systemCanvas.match(/^rgb\((\d+), (\d+), (\d+)\)$/)
  const highlightTextChannels = forcedMask.systemHighlightText.match(/^rgb\((\d+), (\d+), (\d+)\)$/)
  assert.ok(canvasChannels, `unsupported system canvas: ${forcedMask.systemCanvas}`)
  assert.ok(
    highlightTextChannels,
    `unsupported system selection text: ${forcedMask.systemHighlightText}`,
  )
  const expectedCanvas = canvasChannels.slice(1).map(Number)
  const expectedHighlightText = highlightTextChannels.slice(1).map(Number)
  await assertAvatarPaint(selectableIdentity, expectedHighlight, 500)
  await assertAvatarPaint(
    selectableIdentity.locator('[data-figma-node-id="98:1156"]'),
    expectedHighlightText,
    4,
  )
  const statusGroup = avatars.getByRole("group", { name: "Stati delle identità" })
  for (const state of ["online", "offline", "busy"]) {
    const cue = statusGroup.locator(`[data-slot="avatar-status"][data-status="${state}"]`)
    const artwork = await assertAvatarPaint(cue, expectedPixel, 8)
    const center = (6 * artwork.info.width + 6) * 4
    assert.deepEqual(
      [...artwork.data.subarray(center, center + 3)],
      state === "offline" ? expectedCanvas : expectedPixel,
      `forced-color status must retain its ${state} center`,
    )
    // Frameless source faces isolate status ink; integrate it to allow fractional layout positions.
    const channel = [0, 1, 2].toSorted(
      (left, right) =>
        Math.abs(expectedPixel[left] - expectedCanvas[left]) -
        Math.abs(expectedPixel[right] - expectedCanvas[right]),
    )[2]
    const range = expectedPixel[channel] - expectedCanvas[channel]
    assert.notEqual(range, 0, "system status ink and canvas must remain distinguishable")
    let inkArea = 0
    for (let offset = channel; offset < artwork.data.length; offset += 4) {
      inkArea += Math.max(0, Math.min(1, (artwork.data[offset] - expectedCanvas[channel]) / range))
    }
    const expectedArea = { online: 50, offline: 38, busy: 64 }[state]
    assert.ok(
      Math.abs(inkArea - expectedArea) <= 3,
      `forced-color ${state} shape covers ${inkArea.toFixed(2)}px^2, expected ${expectedArea} +/-3`,
    )
  }
  await avatars.getByRole("button", { name: "Carica identità" }).click()
  for (const identity of [
    selectableIdentity,
    avatars.getByRole("img", { name: "Organizzazione in caricamento installata" }),
  ]) {
    const skeleton = identity.locator("[data-slot=skeleton]")
    await skeleton.waitFor()
    await assertAvatarPaint(skeleton, expectedPixel, 16)
    await assertAvatarPaint(skeleton, expectedCanvas, 500)
    assert.equal(
      await skeleton.evaluate((element) => element.getAnimations().length),
      0,
      "reduced-motion loading placeholders must remain static in forced colors too",
    )
  }
  assert.equal(await choice.isChecked(), true)
  await avatars.getByRole("button", { name: "Completa caricamento" }).click()
  for (const { selected, left, right } of [
    { selected: false, left: expectedCanvas, right: expectedPixel },
    { selected: true, left: expectedHighlight, right: expectedHighlightText },
  ]) {
    if ((await sourceSwitch.isChecked()) !== selected) {
      await sourceSwitch.focus()
      await page.keyboard.press(" ")
    }
    await sourceSwitches.getByRole("button", { name: "Invia impostazioni" }).focus()
    const artwork = await sharp(await sourceSwitch.screenshot())
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    for (const [x, expectedColor] of [
      [21, left],
      [37, right],
    ]) {
      const offset = (22 * artwork.info.width + x) * 4
      assert.deepEqual(
        [...artwork.data.subarray(offset, offset + 3)],
        expectedColor,
        `forced colors must visibly distinguish the ${selected ? "selected" : "unselected"} Switch at ${x},22`,
      )
    }
  }
  await sourceSwitches.getByRole("button", { name: "Aggiorna preferenza", exact: true }).click()
  const forcedLoadingIndicator = sourceSwitch.locator('[data-slot="switch-loading"]')
  await forcedLoadingIndicator.waitFor()
  const forcedLoadingMotion = await forcedLoadingIndicator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      name: style.animationName,
      duration: style.animationDuration,
      iterations: style.animationIterationCount,
    }
  })
  assert.equal(forcedLoadingMotion.name, "spin")
  assert.equal(forcedLoadingMotion.duration, "1s")
  assert.equal(forcedLoadingMotion.iterations, "infinite")
  await forcedLoadingIndicator.evaluate((element) => {
    element.style.animationName = "none"
  })
  const forcedLoading = await sharp(await sourceSwitch.screenshot())
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  await forcedLoadingIndicator.evaluate((element) => {
    element.style.removeProperty("animation-name")
  })
  const forcedLoadingCenterX = forcedLoading.info.width / 2
  const forcedLoadingCenterY = Math.floor(forcedLoading.info.height / 2)
  // Same 1px scan window as the normal-motion probe: the forced-color ink is
  // checked against the system foreground, not a single raster row.
  const forcedLoadingInkPainted = (x, y) => {
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const offset = ((y + offsetY) * forcedLoading.info.width + (x + offsetX)) * 4
        const pixel = [...forcedLoading.data.subarray(offset, offset + 3)]
        if (pixel.every((value, index) => Math.abs(value - expectedPixel[index]) <= 1)) return true
      }
    }
    return false
  }
  for (const [x, y] of [
    [forcedLoadingCenterX, forcedLoadingCenterY - 11],
    [forcedLoadingCenterX + 10, forcedLoadingCenterY - 1],
  ]) {
    assert.ok(
      forcedLoadingInkPainted(x, y),
      `forced loading ink must match the system foreground at ${x},${y}: ${[...forcedLoading.data.subarray((y * forcedLoading.info.width + x) * 4, (y * forcedLoading.info.width + x) * 4 + 3)]}`,
    )
  }
  await sourceSwitches.getByRole("button", { name: "Completa aggiornamento preferenza" }).click()
  const selectedDatePixels = await sharp(
    await calendar
      .getByRole("button", { name: /16 maggio 2026/i })
      .getByText("16", { exact: true })
      .screenshot(),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const selectedDateOffset =
    (6 * selectedDatePixels.info.width + Math.floor(selectedDatePixels.info.width / 2)) * 4
  assert.deepEqual(
    [...selectedDatePixels.data.subarray(selectedDateOffset, selectedDateOffset + 3)],
    expectedHighlight,
    "forced colors must preserve the visible selected-date highlight",
  )
  const forcedRangePixels = await sharp(
    await rangeCalendar.getByRole("button", { name: /13 maggio 2026/i }).screenshot(),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const forcedRangeOffset = (22 * forcedRangePixels.info.width + 1) * 4
  assert.deepEqual(
    [...forcedRangePixels.data.subarray(forcedRangeOffset, forcedRangeOffset + 3)],
    expectedHighlight,
    "forced colors must preserve the visible selected range band",
  )
  assert.deepEqual(errors, [], "packed application logged browser errors")
})
