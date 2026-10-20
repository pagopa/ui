// Playwright spec for the packed artifact in the isolated consumer: the full
// sequence runs once per engine project. scripts/check-library.mjs packs,
// installs, builds and serves the consumer, then runs this spec with
// CONSUMER_URL in the environment.
import assert from "node:assert/strict"
import { test } from "@playwright/test"
import sharp from "sharp"

async function assertFocusPerimeter(control, painted = control) {
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

// WebKit opens a link in a new tab on the platform modifier (Cmd) on macOS, and
// on nothing at all on Linux: WebKitGTK implements no new-tab gesture, so the
// assertion that follows is skipped there instead of waiting three minutes for
// a page event that the engine will never emit.
function opensNewTabInBrowser(browserName) {
  return browserName !== "webkit" || process.platform === "darwin"
}

function newTabClickOptions(browserName) {
  return browserName === "webkit" || (browserName === "chromium" && process.platform === "darwin")
    ? { modifiers: ["Meta"] }
    : { button: "middle" }
}

test.use({ viewport: { width: 1024, height: 900 }, reducedMotion: "reduce" })

test("the packed artifact behaves as documented", async ({ browserName, context, page }) => {
  const url = process.env.CONSUMER_URL
  assert.ok(url, "CONSUMER_URL is required")
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.goto(url)
  const spinnerRegion = page.getByTestId("consumer-spinner-status-region")
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
  const assertAvatarPaint = async (element, color, minimum) => {
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

  const breadcrumb = page.getByRole("navigation", { name: "Percorso del servizio" })
  const homeLink = breadcrumb.getByRole("link", { name: "Home del comune" })
  const servicesLink = breadcrumb.getByRole("link", { name: "Servizi del comune" })
  const compactBreadcrumb = page.getByRole("navigation", { name: "Ritorno dal servizio" })
  const backLink = compactBreadcrumb.getByRole("link", { name: "Torna ai servizi del comune" })
  assert.equal(
    await breadcrumb.getByRole("link", { name: "Archivio senza destinazione" }).count(),
    0,
    "an ancestor without a destination must not become a fake link",
  )
  assert.equal(await breadcrumb.getByRole("listitem").count(), 4)
  assert.equal(await breadcrumb.getByRole("link", { name: "Calendari del servizio" }).count(), 0)
  assert.equal(
    await breadcrumb.getByText("Calendari del servizio").getAttribute("aria-current"),
    "page",
  )
  assert.equal(
    await breadcrumb.locator('[data-figma-node-id="98:868"]').count(),
    3,
    "Breadcrumb separators must use the source chevron, not a slash or divider",
  )
  assert.equal(
    await backLink.locator('[data-figma-node-id="98:916"]').count(),
    1,
    "Compact Breadcrumb must use the source back arrow",
  )
  await homeLink.focus()
  // Safari's default link traversal is Option-Tab, not plain Tab.
  const nextBreadcrumbLink = browserName === "webkit" ? "Alt+Tab" : "Tab"
  await page.keyboard.press(nextBreadcrumbLink)
  assert.equal(await servicesLink.evaluate((element) => document.activeElement === element), true)
  const breadcrumbOutline = await servicesLink.evaluate(
    (element) => getComputedStyle(element).outlineWidth,
  )
  assert.ok(parseFloat(breadcrumbOutline) >= 2, "packed Breadcrumb focus is not visible")
  await assertFocusPerimeter(servicesLink)
  await page.keyboard.press(nextBreadcrumbLink)
  assert.equal(await backLink.evaluate((element) => document.activeElement === element), true)
  await page.keyboard.press("Enter")
  await page.waitForURL((location) => location.hash === "#consumer-breadcrumb-parent")
  assert.equal(
    await backLink.getAttribute("href"),
    "#consumer-breadcrumb-parent",
    "Compact return must follow the caller destination, not browser history",
  )
  for (const link of [servicesLink, backLink]) {
    await link.hover()
    await page.waitForFunction(
      (element) =>
        element.matches(":hover") && getComputedStyle(element).color === "rgb(11, 62, 227)",
      await link.elementHandle(),
    )
    const hover = await link.evaluate((element) => {
      const style = getComputedStyle(element)
      return { color: style.color, decoration: style.textDecorationLine }
    })
    assert.equal(hover.color, "rgb(11, 62, 227)", "source Breadcrumb hover color is missing")
    assert.ok(hover.decoration.includes("underline"), "Breadcrumb hover lost its non-color cue")
  }

  const product = page.getByTestId("consumer-product")
  const productTitle = product.getByRole("heading", { name: "Portale dei servizi", level: 2 })
  assert.equal(
    await productTitle.evaluate((element) => getComputedStyle(element).fontSize),
    "24px",
    "packed product titles must use the source desktop scale",
  )
  const productStyle = await product.evaluate((element) => {
    const style = getComputedStyle(element)
    return { radius: style.borderRadius, padding: style.paddingTop, gap: style.rowGap }
  })
  assert.deepEqual(productStyle, { radius: "24px", padding: "24px", gap: "24px" })
  const premiumStyle = await product.getByText("Premium").evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      color: style.color,
      background: getComputedStyle(element.parentElement).backgroundColor,
    }
  })
  assert.deepEqual(premiumStyle, {
    color: "rgb(0, 59, 61)",
    background: "rgb(219, 249, 250)",
  })
  const productLink = product.getByRole("link", { name: "Vai al prodotto" })
  const adminLink = product.getByRole("link", { name: "Amministratori del prodotto" })
  assert.equal(await productLink.getAttribute("role"), null, "product navigation is not a button")
  assert.equal(
    await productLink.locator('[data-figma-node-id="98:915"]').count(),
    1,
    "packed product actions must retain the real source arrow",
  )
  await adminLink.focus()
  await page.keyboard.press(nextBreadcrumbLink)
  assert.equal(await productLink.evaluate((element) => document.activeElement === element), true)
  assert.ok(
    parseFloat(await productLink.evaluate((element) => getComputedStyle(element).outlineWidth)) >=
      2,
    "packed product link focus is missing",
  )
  await assertFocusPerimeter(productLink)
  const beforeProductNavigation = page.url()
  await page.keyboard.press("Space")
  assert.equal(page.url(), beforeProductNavigation, "Space must not activate a native link")
  await page.keyboard.press("Enter")
  await page.waitForURL((location) => location.hash === "#consumer-product-destination")
  if (opensNewTabInBrowser(browserName)) {
    const newProductPage = page.context().waitForEvent("page")
    await productLink.click(newTabClickOptions(browserName))
    const productTab = await newProductPage
    await productTab.waitForURL((location) => location.hash === "#consumer-product-destination")
    await productTab.close()
  } else {
    // Keep the portable half of the contract on WebKit/Linux: the action is a
    // native link to the destination, not a scripted navigation.
    assert.equal(await productLink.getAttribute("href"), "#consumer-product-destination")
    assert.equal(
      await productLink.evaluate((element) => element.tagName),
      "A",
      "the product action must stay a native anchor",
    )
  }

  const imageProduct = page.getByTestId("consumer-image-product")
  const productImage = imageProduct.getByRole("img", { name: "Anteprima del prodotto digitale" })
  const coverBounds = await productImage.evaluate(async (element) => {
    if (!(element instanceof HTMLImageElement)) throw new Error("Expected a native product cover")
    await element.decode()
    const bounds = element.getBoundingClientRect()
    return { top: bounds.top, bottom: bounds.bottom, width: bounds.width, height: bounds.height }
  })
  assert.equal(coverBounds.width, 272)
  assert.equal(coverBounds.height, 191, "packed product cover lost the source proportions")
  const imageProductLogo = await imageProduct
    .getByRole("img", { name: "Logo del prodotto digitale" })
    .boundingBox()
  assert.equal(imageProductLogo.y, coverBounds.bottom - 24)
  assert.equal(imageProductLogo.y + imageProductLogo.height, coverBounds.bottom + 24)
  const imageProductTitle = await imageProduct
    .getByRole("heading", { name: "Documenti digitali", level: 2 })
    .boundingBox()
  assert.equal(imageProductTitle.y, coverBounds.bottom + 48)
  const joinProduct = imageProduct.getByRole("button", { name: "Aderisci" })
  const joinStyle = await joinProduct.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      border: style.borderColor,
      height: element.getBoundingClientRect().height,
    }
  })
  assert.equal(joinStyle.background, "rgba(0, 0, 0, 0)")
  assert.equal(joinStyle.border, "rgb(11, 62, 227)")
  assert.ok(joinStyle.height >= 48)
  await joinProduct.focus()
  await page.keyboard.press("Enter")
  await page.getByRole("status", { name: "Azione prodotto" }).filter({ hasText: /^1$/ }).waitFor()
  await page.keyboard.press("Space")
  await page.getByRole("status", { name: "Azione prodotto" }).filter({ hasText: /^2$/ }).waitFor()
  assert.equal(
    await page.getByRole("status", { name: "Invio prodotti" }).textContent(),
    "Non inviato",
  )
  const inertProduct = page.getByTestId("consumer-inert-product")
  assert.equal(await inertProduct.getByRole("button").count(), 0)
  assert.equal(await inertProduct.getByRole("link").count(), 0)
  const narrowProduct = page.getByTestId("consumer-narrow-product")
  assert.equal(
    await narrowProduct.evaluate((element) => element.scrollWidth <= element.clientWidth),
    true,
    "packed source product must wrap long titles, chips and link labels rather than clip them",
  )
  const narrowProductBounds = await narrowProduct.boundingBox()
  const narrowActionBounds = await narrowProduct.getByRole("link").boundingBox()
  assert.ok(narrowProductBounds.width >= 240)
  assert.ok(narrowActionBounds.x >= narrowProductBounds.x + 24)
  assert.ok(narrowActionBounds.height >= 48)

  // The application chrome at the source mobile width (320): every band keeps
  // one row, the profile collapses to its avatar while the identity stays
  // announced, and nothing painted leaves the column (regression 2026-10-15).
  // The chrome adapts to the viewport (the source `Device` axis), so the page
  // viewport itself must be the mobile one.
  const desktopViewport = page.viewportSize()
  await page.setViewportSize({ width: 320, height: 900 })
  const chrome = page.getByTestId("consumer-chrome")
  const chromeBounds = await chrome.boundingBox()
  assert.ok(chromeBounds.width <= 320)
  const headerBounds = await page.getByTestId("consumer-header").boundingBox()
  assert.ok(
    headerBounds.height <= 84,
    `the packed mobile header keeps one row (${headerBounds.height}px), it does not wrap the profile under the product`,
  )
  assert.equal(
    Math.round((await page.getByTestId("consumer-preheader").boundingBox()).height),
    57,
    "the packed preheader keeps one mobile row (the 54px source band plus the divider)",
  )
  assert.equal(
    await chrome.evaluate((root) => {
      const bounds = root.getBoundingClientRect()
      return [...root.querySelectorAll("*")].every((element) => {
        // An `sr-only` subtree is a 1px clipped box by design: the box of its
        // children is not painted.
        if (element.closest(".sr-only")) return true
        const box = element.getBoundingClientRect()
        const fixed = getComputedStyle(element).position === "fixed"
        return (
          fixed || box.width === 0 || (box.left >= bounds.left - 1 && box.right <= bounds.right + 1)
        )
      })
    }),
    true,
    "no packed chrome paints outside the mobile column",
  )
  const profile = chrome.getByRole("link", { name: /Comune di Roma/ })
  assert.ok(await profile.isVisible())
  assert.equal(
    Math.round(
      await profile
        .locator("span.sr-only")
        .evaluate((element) => element.getBoundingClientRect().width),
    ),
    1,
    "the packed mobile header hides the identity text without dropping it",
  )
  // The avatar, the product and the caller's action share the same row.
  const rowCenter = (bounds) => Math.round(bounds.y + bounds.height / 2)
  const chromeAction = await chrome.getByRole("button", { name: "Esci" }).boundingBox()
  const chromeAvatar = await profile.getByRole("img").boundingBox()
  assert.ok(
    Math.abs(rowCenter(chromeAction) - rowCenter(chromeAvatar)) <= 1,
    "the packed mobile header keeps the caller's action on the avatar row",
  )
  assert.ok(chromeAction.x + chromeAction.width <= chromeBounds.x + chromeBounds.width + 1)
  const manuale = chrome.getByRole("link", { name: "Manuale operativo" })
  assert.equal(
    Math.round((await manuale.boundingBox()).height),
    40,
    "the packed mobile preheader keeps the icon link's 40px target",
  )
  assert.equal(
    Math.round(
      await manuale
        .locator("span")
        .last()
        .evaluate((element) => element.getBoundingClientRect().width),
    ),
    1,
    "the packed mobile preheader collapses the icon link to its icon, the label stays announced",
  )
  await page.setViewportSize(desktopViewport)

  const codeRegion = page.getByRole("region", { name: "Codici di verifica dal pacchetto" })
  const codeForm = codeRegion.getByRole("form", { name: "Verifica del codice privato" })
  // The field is a labelled group of real per-slot inputs plus one hidden
  // named input that owns the submitted value.
  const codeFrame = codeForm.getByRole("group", { name: /Codice privato.*obbligatorio/ })
  const codeSlots = codeFrame.locator("input")
  const nativeCode = codeSlots.first()
  const codeValue = codeForm.locator('input[name="verificationCode"]')
  assert.equal(await nativeCode.getAttribute("type"), "password")
  assert.equal(await nativeCode.getAttribute("inputmode"), "numeric")
  assert.equal(await nativeCode.getAttribute("autocomplete"), "one-time-code")
  assert.equal(await nativeCode.getAttribute("maxlength"), "5")
  assert.equal(await codeValue.getAttribute("minlength"), "5")
  assert.equal(await codeFrame.textContent(), "")
  assert.equal(await codeFrame.locator("[data-slot=otp-field-mask]").count(), 2)
  assert.equal(
    await nativeCode.evaluate((element) =>
      (element.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
        .trim(),
    ),
    "Usa il codice ricevuto per questa richiesta. Puoi digitare o incollare il codice.",
    "packed OTP must merge native caller and field descriptions",
  )
  const codeBounds = await codeFrame.boundingBox()
  assert.equal(codeBounds.width, 169)
  assert.equal(codeBounds.height, 52)
  const maskBounds = await codeFrame.locator("[data-slot=otp-field-mask]").first().boundingBox()
  assert.equal(maskBounds.width, 8)
  assert.equal(maskBounds.height, 8)
  assert.ok((await nativeCode.boundingBox()).height >= 44)
  const codeFrameStyle = await codeFrame.evaluate((element) => {
    const style = getComputedStyle(element)
    return { border: style.borderColor, width: style.borderWidth, radius: style.borderRadius }
  })
  assert.deepEqual(codeFrameStyle, { border: "rgb(99, 107, 130)", width: "1px", radius: "8px" })
  await codeForm.getByRole("button", { name: "Passa al codice privato" }).focus()
  await page.keyboard.press("Tab")
  // The roving tabindex enters the field at the first empty slot, not at the
  // first slot: the pack keeps the caret where typing continues.
  assert.equal(
    await codeFrame.evaluate((element) =>
      Array.from(element.querySelectorAll("input")).indexOf(document.activeElement),
    ),
    2,
    "tabbing into the packed OTP must reach the first empty slot",
  )
  await assertFocusPerimeter(codeSlots.nth(2), codeFrame)
  const codeCaret = codeFrame.locator("[data-slot=otp-field-caret]:visible")
  await codeCaret.waitFor()
  const caretBounds = await codeCaret.boundingBox()
  const focusedCodeBounds = await codeFrame.boundingBox()
  assert.equal(caretBounds.width, 2)
  assert.equal(caretBounds.height, 16)
  assert.equal(caretBounds.x - focusedCodeBounds.x, 83.5)
  assert.equal(caretBounds.y - focusedCodeBounds.y, 17)
  assert.equal(
    await codeCaret.evaluate((element) => getComputedStyle(element).animationName),
    "none",
    "reduced motion must leave a visible static OTP cursor",
  )
  const assertCodeArtwork = async (lineColor, caretColor, maskColor) => {
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
  await assertCodeArtwork([85, 92, 112], [11, 62, 227], [14, 15, 19])
  await nativeCode.selectText()
  await nativeCode.evaluate((element) => {
    const paste = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    })
    if (!paste.clipboardData) throw new Error("Expected the native clipboard transfer")
    // Firefox creates its own transfer instead of reusing the constructor's object.
    paste.clipboardData.setData("text/plain", "57-391")
    element.dispatchEvent(paste)
  })
  await codeForm.getByLabel("Codici completati").filter({ hasText: /^1$/ }).waitFor()
  assert.equal(await codeValue.inputValue(), "57391", "packed native OTP paste must remain usable")
  assert.equal(await codeFrame.textContent(), "")
  assert.equal(await codeFrame.locator("[data-slot=otp-field-mask]").count(), 5)
  await codeForm.getByRole("button", { name: "Mostra il codice privato" }).click()
  assert.equal(await nativeCode.getAttribute("type"), "text")
  assert.equal(await codeFrame.textContent(), "57391", "changing masking must not clear the code")
  await codeForm.getByRole("button", { name: "Nascondi il codice privato" }).click()
  assert.equal(await nativeCode.getAttribute("type"), "password")
  assert.equal(await codeForm.getByLabel("Codici completati").textContent(), "1")
  const submittedCode = codeForm.getByLabel("Codice privato inviato")
  await codeForm.getByRole("button", { name: "Invia codice privato" }).click()
  await submittedCode.filter({ hasText: /57391/ }).waitFor()
  assert.deepEqual(JSON.parse(await submittedCode.textContent()), { verificationCode: "57391" })
  await codeForm.getByRole("button", { name: "Disabilita il codice privato" }).click()
  assert.equal(await nativeCode.isDisabled(), true)
  assert.equal(await codeValue.inputValue(), "57391")
  await codeForm.getByRole("button", { name: "Invia codice privato" }).click()
  await submittedCode.filter({ hasText: /^\{\}$/ }).waitFor()
  await codeForm.getByRole("button", { name: "Abilita il codice privato" }).click()
  assert.equal(await nativeCode.isDisabled(), false)
  assert.equal(await codeValue.inputValue(), "57391")
  await nativeCode.focus()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Backspace")
  assert.equal(
    await codeValue.inputValue(),
    "5391",
    "backspace must drop the focused slot and keep the code contiguous",
  )
  assert.equal(
    await codeSlots.nth(4).evaluate((input) => input.validity.valueMissing),
    true,
    "native required must reject a genuinely edited incomplete code",
  )
  assert.equal(
    await codeForm.evaluate((form) => form.checkValidity()),
    false,
    "an incomplete OTP must leave the packed form invalid",
  )
  await codeForm.getByRole("button", { name: "Invia codice privato" }).click()
  assert.equal(await submittedCode.textContent(), "{}", "an incomplete OTP submitted")
  await codeForm.getByRole("button", { name: "Ripristina codice privato" }).click()
  await page.waitForFunction((element) => element.value === "57", await codeValue.elementHandle())
  assert.equal(await codeFrame.textContent(), "")
  assert.equal(await codeFrame.locator("[data-slot=otp-field-mask]").count(), 2)
  assert.equal(await submittedCode.textContent(), "")
  assert.equal(await codeForm.getByLabel("Codici completati").textContent(), "0")
  const expiredFrame = codeRegion.getByRole("group", { name: "Codice scaduto", exact: true })
  const expiredCode = expiredFrame.locator("input").first()
  assert.equal(await expiredCode.getAttribute("aria-invalid"), "true")
  assert.equal(await expiredFrame.textContent(), "57391")
  assert.equal(
    await expiredFrame.evaluate((element) => getComputedStyle(element).borderWidth),
    "1px",
  )
  assert.match(
    await expiredFrame.evaluate((element) => getComputedStyle(element).boxShadow),
    /(?:inset.*0px 0px 0px 1px|0px 0px 0px 1px.*inset)/,
    "the error frame must retain its second pixel of paint without changing layout",
  )
  const expiredBounds = await expiredFrame.boundingBox()
  assert.equal(expiredBounds.width, 169)
  assert.equal(expiredBounds.height, 52)
  const narrowCodeBounds = await codeRegion.boundingBox()
  assert.equal(narrowCodeBounds.width, 240)
  assert.equal(
    await codeRegion.evaluate((element) => element.scrollWidth <= element.clientWidth),
    true,
    "packed OTP labels, descriptions and all six default digits must reflow at 240px",
  )

  const sourceSwitches = page.getByRole("form", { name: "Impostazioni degli aggiornamenti" })
  const sourceSwitch = sourceSwitches.getByRole("switch", { name: "Aggiornamenti della pratica" })
  assert.equal(
    await sourceSwitch.evaluate((element) => getComputedStyle(element).transitionDuration),
    "0s",
    "reduced motion must not create transitions on otherwise static controls",
  )
  await sourceSwitch.hover()
  await page.waitForFunction(
    (element) => {
      const halo = element.querySelector("[data-slot=switch-hover-halo]")
      return halo && getComputedStyle(halo).opacity === "1"
    },
    await sourceSwitch.elementHandle(),
  )
  const sourceHover = await sourceSwitch.evaluate((element) => {
    const halo = element.querySelector("[data-slot=switch-hover-halo]")
    const knob = element.querySelector("[data-slot=switch-thumb-surface]")
    if (!halo || !knob) throw new Error("Expected the visible source Switch halo and knob")
    const hover = getComputedStyle(halo)
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Expected native canvas color conversion")
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, 1, 1)
    context.fillStyle = hover.backgroundColor
    context.fillRect(0, 0, 1, 1)
    return {
      width: hover.width,
      height: hover.height,
      opacity: hover.opacity,
      colorOnWhite: [...context.getImageData(0, 0, 1, 1).data].slice(0, 3),
      shadow: getComputedStyle(knob).boxShadow,
    }
  })
  assert.deepEqual(
    {
      width: sourceHover.width,
      height: sourceHover.height,
      opacity: sourceHover.opacity,
    },
    {
      width: "40px",
      height: "40px",
      opacity: "1",
    },
    "packed checked Switch must paint the source hover halo",
  )
  assert.ok(
    sourceHover.colorOnWhite.every((value, index) => Math.abs(value - [236, 240, 253][index]) <= 1),
    "packed source halo must match the native 8% primary color within one 8-bit rounding step",
  )
  for (const shadow of [
    "rgba(0, 43, 85, 0.1) 0px 1px 3px 0px",
    "rgba(0, 43, 85, 0.05) 0px 1px 1px 0px",
    "rgba(0, 43, 85, 0.1) 0px 2px 1px -1px",
  ]) {
    assert.ok(
      sourceHover.shadow.includes(shadow),
      `source hover is missing its knob shadow: ${shadow}`,
    )
  }

  await sourceSwitches.getByRole("button", { name: "Aggiorna preferenza", exact: true }).click()
  assert.equal(await sourceSwitch.getAttribute("aria-busy"), "true")
  assert.equal(await sourceSwitch.isDisabled(), true)
  assert.equal(await sourceSwitch.isChecked(), true)
  // Keep native navigation independent of earlier popup lifecycles.
  const informationPage = await context.newPage({
    viewport: { width: 1024, height: 900 },
    reducedMotion: "reduce",
  })
  informationPage.on("pageerror", (error) => errors.push(error.message))
  informationPage.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await informationPage.goto(url)
  const informationForm = informationPage.getByRole("form", {
    name: "Impostazioni degli aggiornamenti",
  })
  const pendingPreference = informationForm.getByRole("switch", {
    name: "Aggiornamenti della pratica",
  })
  const lockedPreference = informationForm.getByRole("switch", {
    name: "Avvisi non modificabili",
  })
  await informationForm.getByRole("button", { name: "Aggiorna preferenza", exact: true }).click()
  for (const { label, destination } of [
    { label: "Scopri gli aggiornamenti", destination: "#consumer-switch-info" },
    { label: "Informazioni sugli avvisi", destination: "#consumer-switch-locked-info" },
  ]) {
    const link = informationForm.getByRole("link", { name: label })
    assert.equal(await link.getAttribute("role"), null)
    assert.equal(await link.isDisabled(), false)
    await informationPage.keyboard.press(nextBreadcrumbLink)
    await link.focus()
    await assertFocusPerimeter(link)
    const previousURL = informationPage.url()
    await informationPage.keyboard.press("Space")
    assert.equal(
      informationPage.url(),
      previousURL,
      "Space must not activate an informational link",
    )
    await informationPage.keyboard.press("Enter")
    await informationPage.waitForURL((location) => location.hash === destination)
    if (opensNewTabInBrowser(browserName)) {
      const newPage = informationPage.context().waitForEvent("page")
      await link.click(newTabClickOptions(browserName))
      const informationTab = await newPage
      await informationTab.waitForURL((location) => location.hash === destination)
      await informationTab.close()
    } else {
      // Same portable half of the contract as the product link: WebKitGTK has
      // no new-tab gesture, so the anchor and its destination are the proof.
      assert.equal(await link.getAttribute("href"), destination)
      assert.equal(
        await link.evaluate((element) => element.tagName),
        "A",
        "the informational link must stay a native anchor",
      )
    }
    for (const preference of [pendingPreference, lockedPreference]) {
      assert.equal(await preference.isDisabled(), true)
      assert.equal(await preference.isChecked(), true)
    }
    assert.equal(await pendingPreference.getAttribute("aria-busy"), "true")
  }
  await informationPage.close()
  await sourceSwitches.getByRole("button", { name: "Invia impostazioni" }).click()
  const sourcePreferences = sourceSwitches.getByRole("status", { name: "Impostazioni inviate" })
  await sourcePreferences.filter({ hasText: /^\{\}$/ }).waitFor()
  const loadingIndicator = sourceSwitch.locator('[data-slot="switch-loading"]')
  await loadingIndicator.waitFor()
  const loadingMotion = await loadingIndicator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      name: style.animationName,
      duration: style.animationDuration,
      iterations: style.animationIterationCount,
    }
  })
  assert.equal(loadingMotion.name, "spin")
  assert.equal(loadingMotion.duration, "1s")
  assert.equal(loadingMotion.iterations, "infinite")
  await loadingIndicator.evaluate((element) => {
    element.style.animationName = "none"
  })
  const loadingArtwork = await sharp(await sourceSwitch.screenshot())
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  await loadingIndicator.evaluate((element) => {
    element.style.removeProperty("animation-name")
  })
  const loadingTarget = await sourceSwitch.boundingBox()
  assert.ok(loadingTarget, "source Switch loading target must remain measurable")
  assert.ok(loadingTarget.height >= 44, "source Switch loading target must remain at least 44px")
  assert.equal(loadingArtwork.info.width, 56)
  assert.ok(loadingArtwork.info.height >= 44)
  assert.ok(
    Math.abs(loadingArtwork.info.height - loadingTarget.height) <= 1,
    `loading artwork rasterization must remain within 1px of its ${loadingTarget.height}px CSS target`,
  )
  const loadingPixel = (x, y) => [
    ...loadingArtwork.data.subarray(
      (y * loadingArtwork.info.width + x) * 4,
      (y * loadingArtwork.info.width + x) * 4 + 3,
    ),
  ]
  const loadingCenterX = loadingArtwork.info.width / 2
  const loadingCenterY = Math.floor(loadingArtwork.info.height / 2)
  // The control can land on a half-pixel grid when surrounding text metrics
  // change (WebKit), so each fixed artwork stroke is checked with a 1px scan
  // window instead of a single raster row; the artwork size itself stays exact.
  const loadingStrokePainted = (x, y) => {
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const [red, green, blue] = loadingPixel(x + offsetX, y + offsetY)
        if (red < 100 && green < 120 && blue > 200) return true
      }
    }
    return false
  }
  assert.ok(
    loadingStrokePainted(loadingCenterX, loadingCenterY - 12),
    `source loading must paint its 24px ring at ${loadingCenterX},${loadingCenterY - 12}: ${loadingPixel(loadingCenterX, loadingCenterY - 12)}`,
  )
  assert.ok(
    loadingStrokePainted(loadingCenterX + 11, loadingCenterY),
    `source loading must paint its rounded terminal at ${loadingCenterX + 11},${loadingCenterY}: ${loadingPixel(loadingCenterX + 11, loadingCenterY)}`,
  )
  for (const offset of [-8, 0, 8]) {
    assert.deepEqual(
      loadingPixel(loadingCenterX, loadingCenterY + offset),
      [255, 255, 255],
      "source loading ring must retain its 20px inner opening",
    )
  }
  await sourceSwitches.getByRole("button", { name: "Completa aggiornamento preferenza" }).click()
  assert.equal(await sourceSwitch.getAttribute("aria-busy"), null)
  assert.equal(await sourceSwitch.isDisabled(), false)
  assert.equal(await sourceSwitch.isChecked(), true)
  await sourceSwitches.getByRole("button", { name: "Invia impostazioni" }).click()
  await sourcePreferences.filter({ hasText: /"sourceUpdates":"on"/ }).waitFor()
  assert.deepEqual(JSON.parse(await sourcePreferences.textContent()), { sourceUpdates: "on" })
  const narrowSwitch = page.getByRole("region", { name: "Preferenza nel layout da 240 px" })
  assert.equal((await narrowSwitch.boundingBox()).width, 240)
  assert.equal(
    await narrowSwitch.evaluate((element) => element.scrollWidth <= element.clientWidth),
    true,
    "packed Switch labels, descriptions and informational links must wrap without clipping",
  )
  const narrowSwitchControl = narrowSwitch.getByRole("switch")
  assert.equal((await narrowSwitchControl.boundingBox()).width, 56)
  assert.equal((await narrowSwitchControl.boundingBox()).height, 44)
  // The link keeps its source 14/20 line box; the 44px pointer target comes
  // from the invisible ::after expansion, so the visual box is measured with it.
  const narrowSwitchLinkTarget = await narrowSwitch.getByRole("link").evaluate((element) => {
    const box = element.getBoundingClientRect()
    const expansion = getComputedStyle(element, "::after")
    return box.height - 2 * parseFloat(expansion.top)
  })
  assert.ok(
    narrowSwitchLinkTarget >= 44,
    "packed Switch informational link keeps its 44px pointer target",
  )
  const startPreference = page.getByRole("region", {
    name: "Preferenza con indicatore iniziale",
  })
  const startSwitch = startPreference.getByRole("switch", { name: "Comunicazioni del servizio" })
  const startTitle = startPreference.getByText("Comunicazioni del servizio", { exact: true })
  assert.equal((await startSwitch.boundingBox()).x, (await startPreference.boundingBox()).x)
  assert.equal(
    (await startTitle.boundingBox()).x,
    (await startSwitch.boundingBox()).x + 56,
    "packed start placement must use the 56px control without double-counting its trailing inset",
  )
  assert.equal((await startPreference.boundingBox()).height, 44)
  await page.keyboard.press(nextBreadcrumbLink)
  await startSwitch.focus()
  await assertFocusPerimeter(startSwitch)
  await page.keyboard.press(" ")
  assert.equal(await startSwitch.isChecked(), true)

  const city = page.getByRole("combobox", { name: /Comune/ })
  await city.fill("mil")
  const citySuggestion = page.getByRole("option", { name: "Milano" })
  await citySuggestion.waitFor()
  const cityDescriptionId = (await citySuggestion.getAttribute("aria-describedby"))?.split(/\s+/)[0]
  assert.ok(cityDescriptionId, "packed autocomplete must associate rich option description")
  assert.equal(
    await page.locator(`#${cityDescriptionId}`).textContent(),
    "Provincia metropolitana di Milano.",
  )
  await city.press("ArrowDown")
  await city.press("Enter")
  assert.equal(await city.inputValue(), "Milano")
  const province = page.getByRole("combobox", { name: /Provincia/ })
  await province.click()
  const provinceMilano = page.getByRole("option", { name: "Milano" })
  await provinceMilano.waitFor()
  const provinceDescriptionId = (await provinceMilano.getAttribute("aria-describedby"))?.split(
    /\s+/,
  )[0]
  assert.ok(provinceDescriptionId, "packed select must associate rich option description")
  assert.equal(
    await page.locator(`#${provinceDescriptionId}`).textContent(),
    "Provincia metropolitana di Milano.",
  )
  await provinceMilano.click()
  await page.getByRole("button", { name: "Invia dati" }).click()
  const submitted = page.getByRole("status", { name: "Dati inviati" })
  await submitted.filter({ hasText: /milano/ }).waitFor()
  assert.deepEqual(JSON.parse(await submitted.textContent()), { city: "milano", province: "mi" })

  const citiesForm = page.getByRole("form", { name: "Comuni dal pacchetto" })
  const cities = citiesForm.getByRole("combobox", { name: "Comuni selezionati" })
  await cities.click()
  const citiesList = page.getByRole("listbox", { name: "Comuni selezionati" })
  await citiesList.waitFor()
  assert.equal(await citiesList.getAttribute("aria-multiselectable"), "true")
  const milano = citiesList.getByRole("option", { name: "Milano" })
  const citiesDescriptionId = (await milano.getAttribute("aria-describedby"))?.split(/\s+/)[0]
  assert.ok(citiesDescriptionId, "packed multiselect must associate rich option description")
  assert.equal(
    await page.locator(`#${citiesDescriptionId}`).textContent(),
    "Provincia metropolitana di Milano.",
  )
  await milano.click()
  const selectedCities = await citiesForm.evaluate((form) => new FormData(form).getAll("cities"))
  assert.deepEqual(selectedCities, ["roma", "milano"])
  const cityAction = page.getByRole("button", { name: "Usa comuni preferiti" })
  assert.equal(
    await cityAction.evaluate((element) => element.closest('[role="listbox"]') === null),
    true,
    "the independent command must not be a listbox option",
  )
  await cityAction.click()
  await page
    .getByRole("status", { name: "Azione dei comuni" })
    .filter({ hasText: "Popup chiuso prima dell'azione" })
    .waitFor()
  assert.equal(await citiesList.count(), 0, "the command must close its popup before activation")
  assert.deepEqual(
    await citiesForm.evaluate((form) => new FormData(form).getAll("cities")),
    selectedCities,
    "the command must not alter the selected values",
  )
  assert.equal(
    await page.getByRole("status", { name: "Invii dei comuni dal pacchetto" }).textContent(),
    "0",
    "the independent command must not submit its form",
  )
  await citiesForm.getByRole("button", { name: "Invia selezione dei comuni" }).click()
  const submittedCities = page.getByRole("status", { name: "Comuni inviati dal pacchetto" })
  await submittedCities.filter({ hasText: "milano,roma" }).waitFor()
  assert.equal(await submittedCities.textContent(), "milano,roma")
  assert.equal(
    await page.getByRole("status", { name: "Invii dei comuni dal pacchetto" }).textContent(),
    "1",
  )

  const trigger = page.getByRole("button", { name: "Apri dialogo" })
  await trigger.focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Conferma azione" })
  await dialog.waitFor()
  await page.waitForFunction(() =>
    document.querySelector('[role="dialog"]')?.contains(document.activeElement),
  )
  for (const key of ["Tab", "Tab", "Tab", "Shift+Tab"]) {
    await page.keyboard.press(key)
    await page.waitForFunction(() =>
      document.querySelector('[role="dialog"]')?.contains(document.activeElement),
    )
    assert.equal(
      await dialog.evaluate((element) => element.contains(document.activeElement)),
      true,
      "packed dialog lost focus containment",
    )
  }
  await page.keyboard.press("Escape")
  await dialog.waitFor({ state: "hidden" })
  await page.waitForFunction(() => document.activeElement?.id === "consumer-dialog-trigger")

  const drawerTrigger = page.getByRole("button", { name: "Apri pannello" })
  await drawerTrigger.focus()
  await page.keyboard.press("Enter")
  const drawer = page.getByRole("dialog", { name: "Preferenze del pannello" })
  await drawer.waitFor()
  await page.waitForFunction(() =>
    document.querySelector('[role="dialog"]')?.contains(document.activeElement),
  )
  for (const key of ["Tab", "Tab", "Tab", "Shift+Tab"]) {
    await page.keyboard.press(key)
    // Base UI renders its focus guards outside the popup, so focus may bounce
    // off a guard before returning inside; the Dialog block above waits the same way.
    await page.waitForFunction(() =>
      document.querySelector('[role="dialog"]')?.contains(document.activeElement),
    )
    assert.equal(
      await drawer.evaluate((element) => element.contains(document.activeElement)),
      true,
      "packed drawer lost final-open focus containment",
    )
  }
  const drawerFrame = await drawer.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return {
      left: Math.round(bounds.left),
      right: Math.round(bounds.right),
      bottom: Math.round(bounds.bottom),
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
    }
  })
  assert.equal(drawerFrame.left, 0, "packed bottom drawer is not anchored to the left edge")
  assert.equal(
    drawerFrame.right,
    drawerFrame.viewportWidth,
    "packed bottom drawer is not anchored to the right edge",
  )
  assert.equal(
    drawerFrame.bottom,
    drawerFrame.viewportHeight,
    "packed bottom drawer is not anchored to the bottom edge",
  )
  assert.equal(
    await drawer.locator("[data-slot=drawer-handle]").isVisible(),
    true,
    "packed bottom drawer lost its source drag handle",
  )
  await page.keyboard.press("Escape")
  await drawer.waitFor({ state: "hidden" })
  await page.waitForFunction(() => document.activeElement?.id === "consumer-drawer-trigger")

  await page.keyboard.press("Enter")
  await drawer.waitFor()
  await page.mouse.click(24, 200)
  await drawer.waitFor({ state: "hidden" })
  await page.waitForFunction(() => document.activeElement?.id === "consumer-drawer-trigger")

  const popoverTrigger = page.getByRole("button", { name: "Apri dettagli" })
  await popoverTrigger.focus()
  await page.keyboard.press("Enter")
  const popoverAction = page.getByRole("button", { name: "Azione contestuale" })
  await popoverAction.waitFor()
  await page.waitForFunction(() => document.activeElement?.id === "consumer-popover-action")
  await page.keyboard.press("Escape")
  await popoverAction.waitFor({ state: "hidden" })
  await page.waitForFunction(() => document.activeElement?.id === "consumer-popover-trigger")

  const menuTrigger = page.getByRole("button", { name: "Apri azioni del servizio" })
  for (const reducedMotion of ["reduce", "no-preference"]) {
    await page.emulateMedia({ reducedMotion })
    for (const closeKey of ["Escape", "Enter"]) {
      await menuTrigger.focus()
      await page.keyboard.press("ArrowDown")
      const menuItem = page.getByRole("menuitem", { name: "Aggiorna dettagli" })
      await menuItem.waitFor()
      const menuDescriptionId = (await menuItem.getAttribute("aria-describedby"))?.split(/\s+/)[0]
      assert.ok(menuDescriptionId, "packed menu item must associate its rich description")
      assert.equal(
        await page.locator(`#${menuDescriptionId}`).textContent(),
        "Modifica le informazioni principali del servizio.",
      )
      await page.waitForFunction(
        (element) => document.activeElement === element,
        await menuItem.elementHandle(),
      )
      await page.keyboard.press(closeKey)
      await page.getByRole("menu").waitFor({ state: "hidden" })
      await page.waitForFunction(
        (element) => document.activeElement === element,
        await menuTrigger.elementHandle(),
      )
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" })
  assert.equal(
    await page.getByRole("status", { name: "Azione del menu" }).textContent(),
    "Dettagli aggiornati",
    "native keyboard menu activation must run the caller action",
  )

  const preferences = page.getByRole("form", { name: "Preferenze del servizio" })
  const preferencesSubmitted = page.getByRole("status", { name: "Preferenze inviate" })
  await preferences.getByRole("button", { name: "Invia preferenze" }).click()
  assert.equal(await preferencesSubmitted.textContent(), "", "required preferences submitted")
  const accept = preferences.getByRole("checkbox", { name: /Accetto i termini/ })
  await accept.focus()
  await page.keyboard.press("Space")
  const emailRadio = preferences.getByRole("radio", { name: "Email di conferma" })
  const smsRadio = preferences.getByRole("radio", { name: "SMS di conferma" })
  const emailBounds = await emailRadio.boundingBox()
  assert.equal(emailBounds.width, 24, "packed radio must retain the source indicator size")
  assert.equal(emailBounds.height, 24)
  const emailLabel = await preferences.getByText("Email di conferma", { exact: true }).boundingBox()
  assert.ok(
    emailBounds.x > emailLabel.x + emailLabel.width,
    "packed rich radio must place its indicator after the label",
  )
  assert.equal(
    await emailRadio.evaluate((element) =>
      (element.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
        .trim(),
    ),
    "Ricevi la conferma via email.",
    "packed radio must retain its associated description without changing its name",
  )
  const visibleRadioArtwork = (radio) =>
    radio.evaluate((element) =>
      [...element.querySelectorAll("[data-figma-node-id]")]
        .filter((glyph) =>
          glyph.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
        )
        .map((glyph) => glyph.getAttribute("data-figma-node-id")),
    )
  assert.deepEqual(await visibleRadioArtwork(emailRadio), ["96:669"])
  assert.deepEqual(await visibleRadioArtwork(smsRadio), ["96:670"])
  await emailRadio.focus()
  await page.keyboard.press("ArrowDown")
  assert.equal(await smsRadio.isChecked(), true)
  assert.equal(await emailRadio.isChecked(), false)
  assert.deepEqual(await visibleRadioArtwork(emailRadio), ["96:670"])
  assert.deepEqual(await visibleRadioArtwork(smsRadio), ["96:669"])
  assert.equal(
    await preferences.getByRole("radio", { name: "Sportello non disponibile" }).isDisabled(),
    true,
  )
  const updates = preferences.getByRole("switch", { name: "Aggiornamenti del servizio" })
  await updates.focus()
  await page.keyboard.press("Space")
  assert.equal(
    await preferences.getByRole("switch", { name: "Notifiche non disponibili" }).isDisabled(),
    true,
  )
  const verificationCode = preferences.getByRole("textbox", { name: /Codice di verifica/ })
  // One real input per slot: the field is filled like a user types it, because
  // a single-value fill would clear the slot the value lands in.
  await verificationCode.click()
  await page.keyboard.type("1234")
  await preferences.getByRole("button", { name: "Invia preferenze" }).click()
  await preferencesSubmitted.filter({ hasText: /1234/ }).waitFor()
  assert.deepEqual(
    JSON.parse(await preferencesSubmitted.textContent()),
    {
      accept: "on",
      contact: "sms",
      verificationCode: "1234",
    },
    "native successful controls must exclude disabled and unchecked choices",
  )
  await preferences.getByRole("button", { name: "Ripristina preferenze" }).click()
  await page.waitForFunction(
    (element) =>
      element instanceof HTMLInputElement
        ? !element.checked
        : element?.getAttribute("aria-checked") === "false",
    await accept.elementHandle(),
  )
  assert.equal(await accept.isChecked(), false)
  assert.equal(
    await preferences.getByRole("radio", { name: "Email di conferma" }).isChecked(),
    true,
  )
  assert.equal(await updates.isChecked(), true)
  assert.equal(
    await preferences.getByRole("textbox", { name: /Codice di verifica/ }).inputValue(),
    "",
  )
  assert.equal(await preferencesSubmitted.textContent(), "")

  const loadChannels = preferences.getByRole("button", { name: "Carica canali di conferma" })
  assert.equal(await loadChannels.count(), 1, "exercise caller-owned radio loading in the consumer")
  await accept.click()
  await verificationCode.click()
  await page.keyboard.type("5678")
  await loadChannels.click()
  for (const radio of await preferences.getByRole("radio").all()) {
    assert.equal(await radio.getAttribute("aria-busy"), "true")
    assert.equal(await radio.isDisabled(), true)
  }
  assert.equal(await emailRadio.isChecked(), true, "loading must not discard the selected value")
  await preferences.getByRole("button", { name: "Invia preferenze" }).click()
  await preferencesSubmitted.filter({ hasText: /5678/ }).waitFor()
  assert.deepEqual(JSON.parse(await preferencesSubmitted.textContent()), {
    accept: "on",
    updates: "on",
    verificationCode: "5678",
  })
  await preferences.getByRole("button", { name: "Completa caricamento canali" }).click()
  assert.equal(await emailRadio.isDisabled(), false)
  assert.equal(await emailRadio.getAttribute("aria-busy"), null)
  assert.equal(await emailRadio.isChecked(), true)
  await preferences.getByRole("button", { name: "Invia preferenze" }).click()
  await preferencesSubmitted.filter({ hasText: /"contact":"email"/ }).waitFor()
  assert.deepEqual(JSON.parse(await preferencesSubmitted.textContent()), {
    accept: "on",
    contact: "email",
    updates: "on",
    verificationCode: "5678",
  })

  const calendar = page.getByRole("group", { name: "Calendario appuntamento" })
  const appointmentForm = page.getByRole("form", { name: "Appuntamento dal calendario" })
  const appointmentField = appointmentForm.getByLabel("Data appuntamento", { exact: true })
  const appointmentValue = appointmentForm.locator('input[name="appointmentDate"]')
  const appointmentSubmitted = appointmentForm.getByRole("status", {
    name: "Appuntamento inviato",
  })
  assert.equal(
    await appointmentField.evaluate((element) => element.tagName),
    "BUTTON",
    "the chooser replaces the browser picker",
  )
  assert.equal(
    await appointmentField.textContent(),
    "11 mag 2026",
    "the read-only chooser shows the committed local date",
  )
  assert.equal(
    await appointmentValue.inputValue(),
    "2026-05-11",
    "the named form control carries the committed local ISO date",
  )
  assert.equal(
    await calendar
      .getByRole("button", { name: /^venerdì 1 maggio 2026$/i })
      .evaluate((element) => element.closest("td")?.cellIndex),
    5,
    "the illustrative source dates must not override the real Gregorian weekday",
  )
  const day11 = calendar.getByRole("button", { name: /11 maggio 2026/i })
  await day11.focus()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Enter")
  assert.equal(
    await appointmentValue.inputValue(),
    "2026-05-11",
    "the draft selection stays uncommitted before Save",
  )
  assert.equal(await calendar.getByRole("gridcell", { selected: true }).textContent(), "12")
  await page.keyboard.press("Home")
  await page.waitForFunction(
    (element) => document.activeElement === element,
    await calendar.getByRole("button", { name: /10 maggio 2026/i }).elementHandle(),
  )
  await page.keyboard.press("End")
  await page.waitForFunction(
    (element) => document.activeElement === element,
    await calendar.getByRole("button", { name: /16 maggio 2026/i }).elementHandle(),
  )
  await page.keyboard.press("PageDown")
  await calendar.getByRole("grid", { name: /giugno 2026/i }).waitFor()
  await page.waitForFunction(
    (element) => document.activeElement === element,
    await calendar.getByRole("button", { name: /16 giugno 2026/i }).elementHandle(),
  )
  await page.keyboard.press("PageUp")
  await calendar.getByRole("grid", { name: /maggio 2026/i }).waitFor()
  await page.waitForFunction(
    (element) => document.activeElement === element,
    await calendar.getByRole("button", { name: /16 maggio 2026/i }).elementHandle(),
  )
  await page.keyboard.press("Enter")
  await page.keyboard.press("Tab")
  assert.equal(
    await calendar
      .getByRole("button", { name: "Annulla" })
      .evaluate((element) => document.activeElement === element),
    true,
    "only the active date must participate in the calendar tab order",
  )
  await page.keyboard.press("Tab")
  const calendarSave = calendar.getByRole("button", { name: "Salva" })
  assert.equal(await calendarSave.evaluate((element) => document.activeElement === element), true)
  await page.keyboard.press("Space")
  assert.equal(await appointmentValue.inputValue(), "2026-05-16")
  assert.equal(await appointmentField.textContent(), "16 mag 2026")
  assert.equal(await calendarSave.evaluate((element) => document.activeElement === element), true)
  assert.equal(await appointmentSubmitted.textContent(), "", "calendar actions submitted the form")
  await appointmentForm.getByRole("button", { name: "Invia appuntamento" }).click()
  await appointmentSubmitted.filter({ hasText: /2026-05-16/ }).waitFor()
  assert.deepEqual(JSON.parse(await appointmentSubmitted.textContent()), {
    appointmentDate: "2026-05-16",
  })
  await calendar.getByRole("button", { name: /17 maggio 2026/i }).click()
  await calendar.getByRole("button", { name: "Annulla" }).click()
  assert.equal(await calendar.getByRole("gridcell", { selected: true }).textContent(), "16")
  assert.equal(
    await page.getByRole("status", { name: "Azione calendario" }).textContent(),
    "Data annullata",
  )

  const rangeCalendar = page.getByRole("group", { name: "Calendario intervallo" })
  const rangeSubmitted = page.getByRole("status", { name: "Intervallo dal calendario" })
  await rangeCalendar.getByRole("button", { name: /12 maggio 2026/i }).click()
  await rangeCalendar.getByRole("button", { name: "Salva" }).click()
  // The field's error message is not its own live region: the form announces
  // it once through ErrorSummary, and the control stays described by it.
  await rangeCalendar
    .locator('[data-slot="field-error"]')
    .filter({ hasText: /data di fine/ })
    .waitFor()
  assert.equal(await rangeCalendar.getAttribute("aria-invalid"), "true")
  assert.equal(await rangeSubmitted.textContent(), "", "an incomplete range must not be confirmed")
  assert.equal(
    await rangeCalendar
      .getByRole("grid")
      .evaluate((element) => element.contains(document.activeElement)),
    true,
    "invalid range confirmation must return focus to the grid",
  )
  await rangeCalendar.getByRole("button", { name: /15 maggio 2026/i }).click()
  assert.equal(await rangeCalendar.getByRole("gridcell", { selected: true }).count(), 4)
  assert.equal(await rangeCalendar.locator('[data-slot="field-error"]').count(), 0)
  await page.evaluate(() => document.fonts.ready)
  for (const [day, expectedLeft, expectedRight] of [
    [12, [255, 255, 255], [231, 236, 252]],
    [13, [231, 236, 252], [231, 236, 252]],
    [15, [231, 236, 252], [255, 255, 255]],
  ]) {
    const { data, info } = await sharp(
      await rangeCalendar
        .getByRole("button", { name: new RegExp(`${day} maggio 2026`, "i") })
        .screenshot(),
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const pixel = (x) => [
      ...data.subarray((22 * info.width + x) * 4, (22 * info.width + x) * 4 + 3),
    ]
    assert.deepEqual(pixel(1), expectedLeft, "source range band has the wrong leading paint")
    assert.deepEqual(
      pixel(info.width - 2),
      expectedRight,
      "source range band has the wrong trailing paint",
    )
  }
  await rangeCalendar.getByRole("button", { name: "Salva" }).click()
  await rangeSubmitted.filter({ hasText: /2026-05-15/ }).waitFor()
  assert.deepEqual(JSON.parse(await rangeSubmitted.textContent()), {
    from: "2026-05-12",
    to: "2026-05-15",
  })

  await page.keyboard.press("Tab")
  for (const control of [
    action,
    city,
    page.getByRole("combobox", { name: /Provincia/ }),
    accept,
    emailRadio,
    updates,
    sourceSwitch,
    page.getByLabel("Data della preferenza", { exact: true }),
    day11,
    calendarSave,
    page.getByRole("textbox", { name: "Note della preferenza" }),
    page.getByRole("button", { name: "Rimuovi Servizio facoltativo" }),
  ]) {
    await control.focus()
    await assertFocusPerimeter(control)
  }
  const schoolPreference = page.getByRole("button", { name: "Rimuovi Servizi scolastici" })
  await schoolPreference.focus()
  await assertFocusPerimeter(schoolPreference)
  await schoolPreference.click()
  await page.getByText("Servizi scolastici", { exact: true }).waitFor({ state: "detached" })

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
  const fontsLoaded = await page.evaluate(async () => {
    for (const weight of [400, 600, 700]) {
      await document.fonts.load(`${weight} 16px "Titillio"`, "PagoPA \u021a")
    }
    return [...document.fonts].every((font) => font.status === "loaded")
  })
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
  await assertCodeArtwork(expectedPixel, expectedPixel, expectedPixel)
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
  await page.emulateMedia({ forcedColors: "none", reducedMotion: "reduce" })
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
  await page.setViewportSize({ width: 320, height: 900 })
  await page.waitForFunction(
    (element) => getComputedStyle(element).fontSize === "18px",
    await productTitle.elementHandle(),
  )
  const reflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth
    return {
      width,
      scrollWidth: document.documentElement.scrollWidth,
      overflowing: [...document.querySelectorAll("main *")]
        .filter((element) => element.getBoundingClientRect().right > width + 1)
        .slice(0, 8)
        .map((element) => ({
          tag: element.tagName,
          slot: element.getAttribute("data-slot"),
          text: element.textContent?.trim().slice(0, 64),
          right: element.getBoundingClientRect().right,
        })),
    }
  })
  assert.ok(
    reflow.scrollWidth <= reflow.width,
    `consumer does not reflow at 320px: ${JSON.stringify(reflow)}`,
  )
  assert.equal(
    await productTitle.evaluate((element) => getComputedStyle(element).fontSize),
    "18px",
    "packed product titles must use the source mobile scale",
  )
  assert.equal(
    await productTitle.evaluate((element) => getComputedStyle(element).lineHeight),
    "28px",
  )
  for (const card of [product, imageProduct, narrowProduct]) {
    assert.equal(
      await card.evaluate((element) => element.scrollWidth <= element.clientWidth),
      true,
      "packed product reflow must not conceal overflowing content",
    )
  }
  for (const picker of [calendar, rangeCalendar]) {
    for (const day of await picker.getByRole("grid").getByRole("button").all()) {
      const bounds = await day.boundingBox()
      assert.ok(
        bounds && bounds.width >= 24 && bounds.height >= 44,
        "calendar reflow shrank a date hit target",
      )
    }
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

// RA7: the artifact-level responsive assertions. Each check sets the page
// viewport itself, asserts one property, and restores the viewport — the
// pattern the 2026-10-15 wave introduced for the mobile chrome bands.
test("the packed artifact keeps its responsive compositions", async ({ page }) => {
  const url = process.env.CONSUMER_URL
  assert.ok(url, "CONSUMER_URL is required")
  await page.goto(url)
  const defaultViewport = page.viewportSize()
  assert.ok(defaultViewport, "the packed consumer needs a measurable viewport")

  // A container-scoped module inside a narrow column renders the mobile
  // composition while the page is wide: the column decides, not the viewport
  // (RA5's scope check, at artifact level).
  await page.setViewportSize({ width: 1200, height: 900 })
  try {
    const module = page
      .getByTestId("consumer-narrow-module")
      .locator('[data-slot="checkout-module"]')
    await module.waitFor()
    assert.equal(
      await module.evaluate((element) => getComputedStyle(element).flexDirection),
      "column",
      "the packed CheckoutModule in a narrow column must keep its stacked (mobile) composition while the page is wide — its scope is the container, not the viewport",
    )
  } finally {
    await page.setViewportSize(defaultViewport)
  }

  // The scrollable list and the segmented control at 320: the first tab stays
  // reachable and the control absorbs the squeeze instead of overflowing.
  await page.setViewportSize({ width: 320, height: 900 })
  try {
    const tabsList = page.getByRole("tablist", { name: "Sezioni del servizio" })
    await tabsList.waitFor()
    assert.equal(
      await tabsList.evaluate((element) => element.scrollWidth > element.clientWidth + 1),
      true,
      "the packed Tabs list must be the scroll area when the tabs are wider than its 320 column",
    )
    const tabEdges = await tabsList.evaluate((list) => {
      // Base UI scrolls the active tab into view on mount; reachability is
      // measured from the scroll origin, so the probe resets it first.
      list.scrollLeft = 0
      const first = list.querySelector('[role="tab"]')
      return {
        first: first ? first.getBoundingClientRect().left : Number.NaN,
        list: list.getBoundingClientRect().left,
      }
    })
    assert.ok(
      tabEdges.first >= tabEdges.list - 1,
      `the packed Tabs list must keep its first tab reachable at 320 (justify-center-safe: a centred overflow hides it off the unreachable left edge; first ${tabEdges.first} vs list ${tabEdges.list})`,
    )
    const segmented = page.getByRole("group", { name: "Filtro stato" })
    assert.equal(
      await segmented.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      true,
      "the packed SegmentedControl must not overflow its column at 320",
    )
    for (const segmentItem of await segmented.getByRole("button").all()) {
      assert.equal(
        await segmentItem.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        true,
        `the packed SegmentedControl must keep its label intact at 320: ${await segmentItem.textContent()}`,
      )
    }
  } finally {
    await page.setViewportSize(defaultViewport)
  }
})
