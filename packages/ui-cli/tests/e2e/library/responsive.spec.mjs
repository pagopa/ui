// The packed artifact at the small viewport: the responsive compositions a
// container decides, the mobile scale of the product titles and the reflow at
// 320 that must not push any content out of the document.
import assert from "node:assert/strict"
import { test } from "@playwright/test"
import { consumerUse, openConsumer } from "./support.mjs"

test.use(consumerUse)

test("responsive: the packed artifact keeps its responsive compositions", async ({ page }) => {
  const { errors } = await openConsumer(page)
  const defaultViewport = page.viewportSize()
  assert.ok(defaultViewport, "the packed consumer needs a measurable viewport")
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
  assert.deepEqual(errors, [], "packed application logged browser errors")
})

test("responsive: the packed artifact reflows at 320", async ({ page }) => {
  const { errors } = await openConsumer(page)
  const product = page.getByTestId("consumer-product")
  const productTitle = product.getByRole("heading", { name: "Portale dei servizi", level: 2 })
  const imageProduct = page.getByTestId("consumer-image-product")
  const narrowProduct = page.getByTestId("consumer-narrow-product")
  const calendar = page.getByRole("group", { name: "Calendario appuntamento" })
  const rangeCalendar = page.getByRole("group", { name: "Calendario intervallo" })
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
  assert.deepEqual(errors, [], "packed application logged browser errors")
})
