// The Next App Router consumer: the installed package server-renders, hydrates,
// ports its overlays into the one library root and forwards the caller's props
// through the router adapter.
import assert from "node:assert/strict"
import { test } from "@playwright/test"
import {
  NEW_TAB_TIMEOUT,
  consumerUse,
  newTabClickOptions,
  opensNewTabInBrowser,
} from "./support.mjs"

test.use(consumerUse)

test.describe("Next App Router consumer", () => {
  // A hydration error must not be hidden by a passing retry.
  test.describe.configure({ retries: 0 })

  test("the packed artifact server-renders and hydrates", async ({
    browser,
    browserName,
    context,
    page,
  }) => {
    const url = process.env.NEXT_CONSUMER_URL
    assert.ok(url, "NEXT_CONSUMER_URL is required")

    const serverContext = await browser.newContext({
      javaScriptEnabled: false,
      extraHTTPHeaders: { "x-consumer-request": "server-only request" },
    })
    try {
      const serverPage = await serverContext.newPage()
      const response = await serverPage.goto(url, { waitUntil: "domcontentloaded" })
      assert.equal(response?.status(), 200)
      await serverPage.getByRole("heading", { name: "Server-rendered service" }).waitFor()
      await serverPage.getByText("Active", { exact: true }).waitFor()
      await serverPage.getByRole("button", { name: "Server-imported action" }).waitFor()
      assert.equal(
        await serverPage.getByTestId("request-marker").textContent(),
        "server-only request",
      )
      assert.equal(await serverPage.getByTestId("adapter-reference").textContent(), "waiting")
      await serverPage.getByRole("button", { name: "Earlier results" }).waitFor()
      await serverPage.getByRole("button", { name: "Next page" }).waitFor()
      assert.equal(
        await serverPage
          .getByRole("button", { name: "Result page 2" })
          .getAttribute("aria-current"),
        "page",
        "the function-valued caller message must be present in server HTML",
      )
      assert.equal(
        await serverPage.getByText("Notes from the installed package").count(),
        0,
        "the server renders no portal markup: an open overlay mounts after hydration",
      )
    } finally {
      await serverContext.close()
    }

    const errors = []
    const watchPage = (opened) => {
      opened.on("pageerror", (error) => errors.push(error.message))
      opened.on("console", (message) => {
        if (
          message.type() === "error" ||
          /hydrat|server.rendered.*did not match/i.test(message.text())
        )
          errors.push(message.text())
      })
    }
    watchPage(page)
    context.on("page", watchPage)

    await page.setExtraHTTPHeaders({ "x-consumer-request": "browser request" })
    const response = await page.goto(url)
    assert.equal(response?.status(), 200)
    assert.equal(await page.getByTestId("request-marker").textContent(), "browser request")
    await page
      .getByTestId("adapter-reference")
      .filter({ hasText: /^connected$/ })
      .waitFor()

    // An overlay open on its first render proves the portal host: it must land
    // in the one library root with the compiled styles, not in `body`.
    const deliveryNotes = page.getByRole("dialog", { name: "Delivery notes" })
    await deliveryNotes.getByText("Notes from the installed package").waitFor()
    assert.equal(
      await deliveryNotes.evaluate(
        (element) => element.closest("[data-pagopa-ui-portal-root]") !== null,
      ),
      true,
      "a default-open overlay must mount into the library portal root",
    )
    assert.equal(
      await page.evaluate(() => document.querySelectorAll("[data-pagopa-ui-portal-root]").length),
      1,
      "every overlay shares the one library portal root",
    )
    assert.equal(
      await deliveryNotes
        .locator("[data-slot='popover-card']")
        .evaluate((element) => getComputedStyle(element).backgroundColor),
      "rgb(255, 255, 255)",
      "the default-open popover must retain its compiled styles",
    )

    const adapterProbe = page.getByRole("link", { name: "Router reference probe" })
    assert.equal(await adapterProbe.getAttribute("href"), "/receipts")
    assert.equal(await adapterProbe.getAttribute("data-next-adapter"), "true")
    assert.equal(await adapterProbe.getAttribute("data-consumer-prop"), "forwarded")
    assert.match(await adapterProbe.getAttribute("class"), /\bconsumer-router-probe\b/)

    const previous = page.getByRole("button", { name: "Earlier results" })
    const next = page.getByRole("button", { name: "Next page" })
    await previous.waitFor()
    await next.focus()
    assert.equal(await next.evaluate((element) => document.activeElement === element), true)
    await page.keyboard.press("Enter")
    const thirdPage = page.getByRole("button", { name: "Result page 3" })
    await thirdPage.waitFor()
    assert.equal(await thirdPage.getAttribute("aria-current"), "page")

    const reference = page.getByRole("textbox", { name: "Reference" })
    const submitted = page.getByLabel("Submitted reference")
    await page.getByRole("button", { name: "Submit reference" }).click()
    assert.equal(await reference.evaluate((element) => element.validity.valueMissing), true)
    assert.equal(await submitted.textContent(), "")
    await reference.fill("AB-123")
    await reference.press("Enter")
    await submitted.filter({ hasText: /^AB-123$/ }).waitFor()

    const trigger = page.getByRole("button", { name: "Open payment details" })
    assert.equal(
      await trigger.evaluate((element) => getComputedStyle(element).backgroundColor),
      "rgb(11, 62, 227)",
      "the Next consumer must apply the compiled Button styles",
    )
    await trigger.focus()
    await page.keyboard.press("Enter")
    const dialog = page.getByRole("dialog", { name: "Payment details" })
    await dialog.waitFor()
    assert.equal(
      await dialog.evaluate((element) => getComputedStyle(element).backgroundColor),
      "rgb(255, 255, 255)",
      "the portaled dialog must retain its compiled styles",
    )
    await dialog.getByRole("button", { name: "Close dialog" }).waitFor()
    await page.keyboard.press("Escape")
    await dialog.waitFor({ state: "hidden" })
    await page.waitForFunction(() => document.activeElement?.textContent === "Open payment details")

    const receipts = page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "Receipts" })
    assert.equal(await receipts.getAttribute("href"), "/receipts")
    assert.equal(await receipts.getAttribute("data-next-adapter"), "true")
    if (opensNewTabInBrowser(browserName)) {
      const opened = context.waitForEvent("page", { timeout: NEW_TAB_TIMEOUT })
      await receipts.click(newTabClickOptions(browserName))
      const tab = await opened
      try {
        await tab.getByRole("heading", { name: "Receipts destination" }).waitFor()
        assert.equal(new URL(tab.url()).pathname, "/receipts")
        assert.equal(new URL(page.url()).pathname, "/")
      } finally {
        await tab.close()
      }
    }

    await page.evaluate(() => {
      window.__pagopaNextDocument = "original document"
    })
    await receipts.focus()
    await page.keyboard.press("Enter")
    await page.waitForURL(new URL("/receipts", url).href)
    await page.getByRole("heading", { name: "Receipts destination" }).waitFor()
    assert.equal(
      await page.evaluate(() => window.__pagopaNextDocument),
      "original document",
      "the provider adapter must navigate through the Next router without a document reload",
    )
    assert.deepEqual(errors, [], "the Next consumer logged browser or hydration errors")
  })
})
