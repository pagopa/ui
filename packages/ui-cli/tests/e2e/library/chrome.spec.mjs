// The packed chrome a page frames its content with: the Breadcrumb, the Product
// header and the footer, the Application chrome, and the landmarks and link
// activation they must keep.
import assert from "node:assert/strict"
import { test } from "@playwright/test"
import {
  NEW_TAB_TIMEOUT,
  assertFocusPerimeter,
  consumerUse,
  newTabClickOptions,
  openConsumer,
  opensNewTabInBrowser,
} from "./support.mjs"

test.use(consumerUse)

// The packed library emits Tailwind utilities under its `pui:` prefix beside
// the bare spelling, so a class selector names both until the contract step
// (#164) settles on one.
const SR_ONLY = '[class~="sr-only"], [class~="pui:sr-only"]'

test("chrome: the packed breadcrumb, header and footer keep their landmarks and links", async ({
  page,
  browserName,
}) => {
  const { errors } = await openConsumer(page)
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
    const newProductPage = page.context().waitForEvent("page", { timeout: NEW_TAB_TIMEOUT })
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
      borderWidth: style.borderTopWidth,
      shadow: style.boxShadow,
      height: element.getBoundingClientRect().height,
    }
  })
  assert.equal(joinStyle.background, "rgba(0, 0, 0, 0)")
  // The source 2px inside stroke is an inset ring that paints inside the box,
  // not a border that widens it.
  assert.equal(joinStyle.borderWidth, "0px")
  assert.ok(
    joinStyle.shadow.includes("rgb(11, 62, 227) 0px 0px 0px 2px inset"),
    "packed outlined action must paint the source inside stroke as an inset ring",
  )
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
    await chrome.evaluate((root, srOnly) => {
      const bounds = root.getBoundingClientRect()
      return [...root.querySelectorAll("*")].every((element) => {
        // An `sr-only` subtree is a 1px clipped box by design: the box of its
        // children is not painted.
        if (element.closest(srOnly)) return true
        const box = element.getBoundingClientRect()
        const fixed = getComputedStyle(element).position === "fixed"
        return (
          fixed || box.width === 0 || (box.left >= bounds.left - 1 && box.right <= bounds.right + 1)
        )
      })
    }, SR_ONLY),
    true,
    "no packed chrome paints outside the mobile column",
  )
  const profile = chrome.getByRole("link", { name: /Comune di Roma/ })
  assert.ok(await profile.isVisible())
  assert.equal(
    Math.round(
      await profile
        .locator(`span${SR_ONLY}`)
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
  assert.deepEqual(errors, [], "packed application logged browser errors")
})
