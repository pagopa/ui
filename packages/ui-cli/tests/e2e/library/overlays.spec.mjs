// The packed overlays a page opens: the Dialog, the Drawer, the Popover and the
// native Menu, with the focus they trap, restore and return on dismissal.
import assert from "node:assert/strict"
import { test } from "@playwright/test"
import { consumerUse, openConsumer } from "./support.mjs"

test.use(consumerUse)

test("overlays: the packed dialog, drawer, popover and menu trap and restore focus", async ({
  page,
}) => {
  const { errors } = await openConsumer(page)
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
  assert.deepEqual(errors, [], "packed application logged browser errors")
})
