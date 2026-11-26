// The packed components a page shows: the functional Spinner and its system
// paint, the Button with its activation and focus, the Avatar family and the
// Table with its sorting, paging and empty state.
import assert from "node:assert/strict"
import { test } from "@playwright/test"
import { assertAvatarPaint, assertFocusPerimeter, consumerUse, openConsumer } from "./support.mjs"

test.use(consumerUse)

test("surfaces: the packed components paint, select and page as documented", async ({
  browserName,
  page,
}) => {
  const { consumerScope, errors } = await openConsumer(page)
  const spinnerRegion = page.getByTestId("consumer-spinner-status-region")
  assert.equal(await consumerScope.getByTestId("consumer-spinner-status-region").count(), 1)
  const spinnerStatus = spinnerRegion.getByRole("status")
  const spinnerIndicator = spinnerStatus.locator('[data-slot="spinner-indicator"]')
  await spinnerStatus.waitFor()
  assert.equal(await spinnerRegion.getByRole("status").count(), 1)
  assert.equal(await spinnerRegion.getAttribute("aria-busy"), "true")
  assert.equal(await spinnerStatus.textContent(), "Caricamento dati dal pacchetto")
  assert.equal(
    await spinnerIndicator.locator('[data-figma-node-id="5966:24996"]').count(),
    1,
    "the installed spinner must include the reviewed source marker",
  )
  const spinnerRing = spinnerIndicator.locator('[data-slot="spinner-ring"]')
  const ringStyle = await spinnerRing.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundImage, mask: style.maskImage }
  })
  assert.match(ringStyle.background, /conic-gradient/)
  assert.match(ringStyle.mask, /radial-gradient/)
  const decorativeSpinner = page
    .getByTestId("consumer-spinner-contrast-surface")
    .locator('[data-slot="spinner"]')
  assert.equal(await decorativeSpinner.getAttribute("aria-hidden"), "true")
  assert.equal(await decorativeSpinner.locator('[role="status"]').count(), 0)
  const contrastIndicator = decorativeSpinner.locator('[data-slot="spinner-indicator"]')
  assert.equal(
    await contrastIndicator.evaluate((element) => getComputedStyle(element).color),
    "rgb(255, 255, 255)",
  )
  for (const reducedMotion of ["no-preference", "reduce"]) {
    await page.emulateMedia({ reducedMotion })
    const animation = await spinnerIndicator.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        name: style.animationName,
        duration: style.animationDuration,
        iterations: style.animationIterationCount,
      }
    })
    assert.equal(animation.name, "spin")
    assert.equal(animation.duration, "1s")
    assert.equal(
      animation.iterations,
      "infinite",
      "the functional spinner must remain animated with reduced motion enabled",
    )
  }
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
  const systemText = await page.evaluate(() => {
    const probe = document.createElement("span")
    Object.assign(probe.style, { color: "CanvasText", forcedColorAdjust: "none" })
    document.body.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  })
  for (const indicator of [spinnerIndicator, contrastIndicator]) {
    const appearance = await indicator.evaluate((element) => getComputedStyle(element).color)
    assert.equal(appearance, systemText)
    const ring = await indicator.locator('[data-slot="spinner-ring"]').evaluate((element) => {
      const style = getComputedStyle(element)
      return { background: style.backgroundImage, mask: style.maskImage }
    })
    assert.match(ring.background, /conic-gradient/)
    assert.match(ring.mask, /radial-gradient/)
    assert.equal(
      await indicator
        .locator('[data-figma-node-id="5966:24996"]')
        .evaluate((element) => getComputedStyle(element).fill),
      systemText,
    )
  }
  await page.emulateMedia({ forcedColors: "none", reducedMotion: "reduce" })
  const action = page.getByRole("button", { name: "Attiva azione" })
  await action.waitFor()
  const appearance = await action.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      color: style.color,
      font: style.fontFamily,
      height: element.getBoundingClientRect().height,
    }
  })
  assert.equal(appearance.background, "rgb(11, 62, 227)", "compiled button styles were not applied")
  assert.equal(appearance.color, "rgb(255, 255, 255)")
  assert.match(appearance.font, /Titillio/)
  assert.ok(appearance.height >= 44, "compiled button lost its touch target")
  await page.keyboard.press("Tab")
  assert.equal(await action.evaluate((element) => document.activeElement === element), true)
  const outline = await action.evaluate((element) => getComputedStyle(element).outlineWidth)
  assert.ok(parseFloat(outline) >= 2, "compiled keyboard focus indicator is missing")
  await assertFocusPerimeter(action)
  await page.keyboard.press("Enter")
  await page.getByRole("status", { name: "Attivazioni" }).filter({ hasText: /^1$/ }).waitFor()
  const avatars = page.getByRole("region", { name: "Identità dal pacchetto" })
  const decorativeIdentity = avatars.getByRole("img", {
    name: "Servizio culturale non interattivo",
  })
  await decorativeIdentity.waitFor()
  assert.equal(
    await avatars.getByRole("link").count(),
    0,
    "an Avatar icon slot must not expose a nested action",
  )
  await avatars.getByRole("button", { name: "Prima dell'Avatar" }).focus()
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab")
  const afterAvatar = avatars.getByRole("button", { name: "Dopo l'Avatar" })
  await assertFocusPerimeter(afterAvatar)
  assert.equal(
    await decorativeIdentity.locator("a").evaluate((element) => {
      element.focus()
      return document.activeElement === element
    }),
    false,
    "a decorative caller icon must remain natively noninteractive",
  )
  for (const [name, dimension] of [
    ["Identità piccola installata", 44],
    ["Identità intermedia installata", 48],
    ["Identità grande installata", 64],
  ]) {
    const identity = avatars.getByRole("img", { name })
    const bounds = await identity.boundingBox()
    assert.equal(bounds?.width, dimension)
    assert.equal(bounds?.height, dimension)
    assert.equal(
      await identity
        .locator("[data-slot=avatar]")
        .evaluate((element) => getComputedStyle(element).borderRadius),
      "8px",
    )
  }
  const sourceLogo = avatars.getByRole("img", { name: "Marchio del servizio installato" })
  const logoImage = sourceLogo.locator("img")
  await logoImage.waitFor()
  const logoBounds = await logoImage.boundingBox()
  assert.equal(logoBounds?.width, 48)
  assert.equal(logoBounds?.height, 48)
  assert.equal(await logoImage.getAttribute("alt"), "")
  assert.equal(
    await logoImage.evaluate((element) => getComputedStyle(element).objectFit),
    "contain",
  )
  const photograph = avatars.getByRole("img", { name: "Fotografia installata" }).locator("img")
  await photograph.waitFor()
  assert.equal(await photograph.evaluate((element) => getComputedStyle(element).objectFit), "cover")
  assert.equal((await photograph.boundingBox())?.width, 48)
  const choice = avatars.getByRole("checkbox", { name: "Associa il prodotto", exact: true })
  const selectableIdentity = avatars.getByRole("img", {
    name: "Prodotto selezionabile installato",
  })
  await choice.focus()
  await page.keyboard.press(" ")
  assert.equal(await choice.isChecked(), true)
  await selectableIdentity.locator('[data-figma-node-id="98:1156"]').waitFor()
  assert.equal(await selectableIdentity.getAttribute("aria-selected"), null)
  assert.equal(await selectableIdentity.locator("img").count(), 0)
  assert.equal(await avatars.getByText("Selezionato", { exact: true }).count(), 1)
  await avatars.getByRole("button", { name: "Carica identità" }).click()
  for (const [identity, dimension] of [
    [selectableIdentity, 44],
    [avatars.getByRole("img", { name: "Organizzazione in caricamento installata" }), 64],
  ]) {
    assert.equal(await identity.getAttribute("aria-busy"), "true")
    const skeleton = identity.locator("[data-slot=skeleton]")
    const bounds = await skeleton.boundingBox()
    assert.equal(bounds?.width, dimension)
    assert.equal(bounds?.height, dimension)
    assert.equal(await skeleton.getAttribute("aria-hidden"), "true")
    assert.equal(
      await skeleton.evaluate((element) => getComputedStyle(element).animationName),
      "none",
      "packed Avatar skeletons must not animate under reduced motion",
    )
  }
  await avatars.getByRole("button", { name: "Completa caricamento" }).click()
  assert.equal(await selectableIdentity.getAttribute("aria-busy"), null)
  await selectableIdentity.locator('[data-figma-node-id="98:1156"]').waitFor()
  const primaryIdentity = avatars.getByRole("img", { name: "Prodotto principale installato" })
  const associatedIdentity = avatars.getByRole("img", {
    name: "Organizzazione associata installata",
  })
  const pairBounds = await avatars.locator("[data-slot=avatar-pair]").boundingBox()
  for (const [identity, offset] of [
    [primaryIdentity, 0],
    [associatedIdentity, 16],
  ]) {
    await identity.locator("img").waitFor()
    const bounds = await identity.boundingBox()
    assert.ok(bounds && pairBounds)
    assert.ok(Math.abs(bounds.width - 28) < 0.01)
    assert.ok(Math.abs(bounds.height - 28) < 0.01)
    assert.ok(Math.abs(bounds.x - pairBounds.x - offset) < 0.01)
    assert.ok(Math.abs(bounds.y - pairBounds.y - offset) < 0.01)
  }
  await avatars.getByRole("button", { name: "Simula logo non valido" }).click()
  await associatedIdentity.getByText("OR", { exact: true }).waitFor()
  assert.equal(await primaryIdentity.locator("img").isVisible(), true)
  const assertPairedInitials = async (fontSize) => {
    const paint = await associatedIdentity.evaluate(
      async (element, foreground) => {
        await document.fonts.ready
        const fallback = element.querySelector("[data-slot=avatar-fallback]")
        if (!(fallback instanceof HTMLElement) || !(foreground instanceof HTMLElement))
          throw new Error("Expected both packed Avatar identities and associated initials")
        const style = getComputedStyle(fallback)
        const context = document.createElement("canvas").getContext("2d")
        if (!context) throw new Error("Expected native glyph metrics")
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        const metrics = context.measureText("OR")
        const range = document.createRange()
        range.selectNodeContents(fallback)
        const scale = fallback.getBoundingClientRect().width / fallback.offsetWidth
        const baseline = range.getBoundingClientRect().top + metrics.fontBoundingBoxAscent * scale
        return {
          fontSize: Number.parseFloat(style.fontSize) * scale,
          inkTop: baseline - metrics.actualBoundingBoxAscent * scale,
          inkBottom: baseline + metrics.actualBoundingBoxDescent * scale,
          foregroundBottom: foreground.getBoundingClientRect().bottom,
          associatedBottom: element.getBoundingClientRect().bottom,
          fits: fallback.scrollWidth <= fallback.clientWidth,
        }
      },
      await primaryIdentity.elementHandle(),
    )
    assert.ok(
      Math.abs(paint.fontSize - fontSize) < 0.01,
      "paired initials must honor font preferences",
    )
    assert.ok(
      paint.inkTop >= paint.foregroundBottom,
      "the primary Avatar conceals associated glyphs",
    )
    assert.ok(
      paint.inkBottom <= paint.associatedBottom,
      "associated glyphs extend beyond their face",
    )
    assert.equal(paint.fits, true, "associated initials overflow their face")
  }
  await assertPairedInitials(14)
  const avatarViewport = page.viewportSize()
  assert.ok(avatarViewport)
  const previousFontSize = await page.evaluate(() => {
    const style = document.documentElement.style
    const previous = {
      value: style.getPropertyValue("font-size"),
      priority: style.getPropertyPriority("font-size"),
    }
    style.fontSize = "32px"
    return previous
  })
  try {
    await page.setViewportSize({ width: 320, height: 900 })
    await assertPairedInitials(28)
    const narrowAvatars = await avatars.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      fits: element.scrollWidth <= element.clientWidth,
      overflowing: [...element.querySelectorAll("*")]
        .filter(
          (child) =>
            child.getBoundingClientRect().right > element.getBoundingClientRect().right + 1,
        )
        .slice(0, 8)
        .map((child) => ({
          tag: child.tagName,
          slot: child.getAttribute("data-slot"),
          text: child.textContent?.trim().slice(0, 48),
          width: child.getBoundingClientRect().width,
        })),
    }))
    assert.equal(narrowAvatars.width, 240)
    assert.equal(
      narrowAvatars.fits,
      true,
      `packed Avatar compositions must reflow at increased font size: ${JSON.stringify(narrowAvatars)}`,
    )
  } finally {
    await page.evaluate(({ value, priority }) => {
      document.documentElement.style.setProperty("font-size", value, priority)
    }, previousFontSize)
    await page.setViewportSize(avatarViewport)
  }
  const iconRecovery = avatars.getByRole("img", {
    name: "Servizio con icona alternativa installato",
  })
  await iconRecovery.locator('[data-figma-node-id="99:2278"]').waitFor()
  assert.equal(
    await iconRecovery.locator("[data-slot=avatar]").evaluate((element) => {
      const paint = document.createElement("canvas").getContext("2d")
      if (!paint) throw new Error("Missing native color conversion")
      paint.fillStyle = getComputedStyle(element).backgroundColor
      paint.fillRect(0, 0, 1, 1)
      return paint.getImageData(0, 0, 1, 1).data[3]
    }),
    0,
    "failed logos must not hide an inverse icon behind an opaque white frame",
  )
  await avatars.getByRole("button", { name: "Ripristina logo" }).click()
  await associatedIdentity.locator("img").waitFor()
  await associatedIdentity.getByText("OR", { exact: true }).waitFor({ state: "hidden" })
  await iconRecovery.locator("img").waitFor()
  await assertAvatarPaint(logoImage, [11, 62, 227], 500)
  await assertAvatarPaint(logoImage, [255, 255, 255], 100)
  const smallPlaceholder = avatars.getByRole("img", { name: "Identità piccola installata" })
  await assertAvatarPaint(smallPlaceholder, [244, 245, 248], 1000)
  await assertAvatarPaint(
    smallPlaceholder.locator('[data-figma-node-id="99:666"]'),
    [187, 194, 214],
    16,
  )
  await assertAvatarPaint(
    decorativeIdentity.locator('[data-figma-node-id="99:2278"]'),
    [14, 15, 19],
    16,
  )
  const inverseIdentity = avatars.getByRole("img", {
    name: "Servizio culturale inverso installato",
  })
  await assertAvatarPaint(
    inverseIdentity.locator('[data-figma-node-id="99:2278"]'),
    [255, 255, 255],
    16,
  )
  await assertAvatarPaint(selectableIdentity, [11, 62, 227], 500)
  // The thin 22px source check has few fully opaque pixels after antialiasing.
  await assertAvatarPaint(
    selectableIdentity.locator('[data-figma-node-id="98:1156"]'),
    [255, 255, 255],
    4,
  )
  const table = page.getByRole("table", { name: "Pagamenti dal pacchetto" })
  await table.waitFor()
  const sort = table.getByRole("button", { name: "Ordina per Servizio" })
  const sortGlyph = sort.locator(":scope > :last-child")
  assert.deepEqual(
    await sortGlyph.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect()
      return [width, height]
    }),
    [24, 24],
    "packed Table must render the 24px source descending arrow",
  )
  assert.equal(
    await table
      .getByRole("columnheader", { name: "Servizio", exact: true })
      .getAttribute("aria-sort"),
    "descending",
  )
  await sort.focus()
  await page.keyboard.press("Enter")
  await table.getByRole("cell", { name: "Mensa scolastica", exact: true }).waitFor()
  assert.match(await table.getByRole("cell").first().textContent(), /Mensa scolastica/)
  assert.equal(await sort.evaluate((element) => document.activeElement === element), true)
  assert.deepEqual(
    await sortGlyph.evaluate((element) => {
      const { width, height } = element.getBoundingClientRect()
      return [width, height]
    }),
    [24, 24],
    "packed Table must preserve source arrow dimensions after native sorting",
  )
  const next = page.getByRole("button", { name: "Pagina successiva" })
  await next.focus()
  await page.keyboard.press("Enter")
  await table.getByRole("cell", { name: "Bollo auto", exact: true }).waitFor()
  assert.equal(await next.isDisabled(), true, "packed pagination must stop at the final page")
  // RowsPerPage was retired with the 2026-10-14 source export; the compact footer
  // drives paging through its arrows, and non-current page buttons are hidden in a
  // narrow container, so the round trip uses the arrow controls.
  const currentPage = page.getByRole("button", { name: "Pagina 2" })
  assert.equal(
    await currentPage.getAttribute("aria-current"),
    "page",
    "packed pagination must mark the current page",
  )
  const previous = page.getByRole("button", { name: "Pagina precedente" })
  await previous.focus()
  await page.keyboard.press("Enter")
  await table.getByRole("cell", { name: "Mensa scolastica", exact: true }).waitFor()
  assert.equal(await previous.isDisabled(), true, "packed pagination must stop at the first page")
  const cells = await table.getByRole("cell").all()
  const headers = await table.getByRole("columnheader").all()
  assert.deepEqual(
    await table.getByRole("columnheader").allTextContents(),
    ["Servizio", "Importo", "Azioni"],
    "packed Table must keep native headers for its action column",
  )
  for (const [index, cell] of cells.entries()) {
    assert.equal(
      await cell.getAttribute("headers"),
      await headers[index % 3].getAttribute("id"),
      "packed responsive cells must retain native header associations",
    )
  }
  await page.getByRole("button", { name: "Mostra stato vuoto" }).click()
  await table.waitFor({ state: "hidden" })
  const empty = page.getByRole("region", { name: "Pagamenti dal pacchetto" })
  await empty.getByText("Nessun pagamento").waitFor()
  assert.equal(
    await empty.getByRole("navigation").count(),
    0,
    "an empty Table must not show paging",
  )
  const emptyArtwork = await empty.locator("img").evaluate(async (element) => {
    if (!(element instanceof HTMLImageElement)) throw new Error("Expected Table empty artwork")
    await element.decode()
    return { naturalWidth: element.naturalWidth, width: element.getBoundingClientRect().width }
  })
  assert.ok(emptyArtwork.naturalWidth > 0, "packed Table source artwork did not load")
  assert.equal(emptyArtwork.width, 56, "packed Table lost its source artwork dimensions")
  assert.deepEqual(errors, [], "packed application logged browser errors")
})
