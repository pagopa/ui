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

  // The open panel marks the page behind it `aria-hidden`, so the caller's
  // state readouts are read by attribute rather than through the a11y tree.
  const dialogState = page.locator('output[aria-label="Stato del dialogo"]')
  assert.equal(await dialogState.textContent(), "chiuso")
  await page.getByRole("button", { name: "Apri il dialogo controllato" }).click()
  const controlledDialog = page.getByRole("dialog", { name: "Dialogo controllato" })
  await controlledDialog.waitFor()
  await page.waitForFunction(() =>
    document.querySelector('[role="dialog"]')?.contains(document.activeElement),
  )
  assert.equal(await dialogState.textContent(), "aperto", "the packed dialog ignored its open prop")
  assert.equal(
    await page.locator('output[aria-label="Contratto del pannello"]').textContent(),
    "classe/dialog",
    "the packed dialog panel did not receive ref, className and the standard attribute",
  )
  await controlledDialog.getByRole("button", { name: "Chiudi dal piè di pagina" }).click()
  await controlledDialog.waitFor({ state: "hidden" })
  assert.equal(
    await dialogState.textContent(),
    "chiuso",
    "the packed dialog close action did not reach onOpenChange",
  )

  const drawerState = page.locator('output[aria-label="Stato del pannello"]')
  assert.equal(await drawerState.textContent(), "chiuso")
  await page.getByRole("button", { name: "Apri il pannello controllato" }).click()
  const controlledDrawer = page.getByRole("dialog", { name: "Pannello controllato" })
  await controlledDrawer.waitFor()
  await page.waitForFunction(() =>
    document.querySelector('[role="dialog"]')?.contains(document.activeElement),
  )
  assert.equal(await drawerState.textContent(), "aperto", "the packed drawer ignored its open prop")
  await page.keyboard.press("Escape")
  await controlledDrawer.waitFor({ state: "hidden" })
  assert.equal(
    await drawerState.textContent(),
    "chiuso",
    "the packed drawer dismissal did not reach onOpenChange",
  )

  const popoverState = page.locator('output[aria-label="Stato del popover"]')
  assert.equal(await popoverState.textContent(), "chiuso")
  await page.getByRole("button", { name: "Apri il popover controllato" }).click()
  const controlledPopover = page.getByRole("dialog", { name: "Popover controllato" })
  await controlledPopover.waitFor()
  assert.equal(
    await popoverState.textContent(),
    "aperto",
    "the packed popover ignored its open prop",
  )
  assert.equal(
    await page.locator('output[aria-label="Contratto del popover"]').textContent(),
    "classe/popover",
    "the packed popover panel did not receive ref, className and the standard attribute",
  )
  await page.keyboard.press("Escape")
  await controlledPopover.waitFor({ state: "hidden" })
  assert.equal(
    await popoverState.textContent(),
    "chiuso",
    "the packed popover dismissal did not reach onOpenChange",
  )

  const tooltipState = page.locator('output[aria-label="Stato del suggerimento"]')
  assert.equal(await tooltipState.textContent(), "chiuso")
  await page.getByRole("button", { name: "Mostra il suggerimento controllato" }).click()
  const controlledTooltip = page.getByRole("tooltip")
  await controlledTooltip.waitFor()
  assert.equal(
    await controlledTooltip.textContent(),
    "Suggerimento controllato dal consumatore",
    "the packed tooltip did not render without a trigger",
  )
  assert.equal(
    await tooltipState.textContent(),
    "aperto",
    "the packed tooltip ignored its open prop",
  )
  assert.equal(
    await page.locator('output[aria-label="Contratto del suggerimento"]').textContent(),
    "classe/tooltip",
    "the packed tooltip bubble did not receive ref, className and the standard attribute",
  )
  await page.keyboard.press("Escape")
  await controlledTooltip.waitFor({ state: "hidden" })
  assert.equal(
    await tooltipState.textContent(),
    "chiuso",
    "the packed tooltip dismissal did not reach onOpenChange",
  )

  const timelineState = page.locator('output[aria-label="Stato della cronologia"]')
  assert.equal(await timelineState.textContent(), "chiuso")
  await page.getByRole("button", { name: "Apri la cronologia controllata" }).click()
  const controlledTimeline = page.getByRole("dialog", { name: "Cronologia controllata" })
  await controlledTimeline.waitFor()
  assert.equal(
    await timelineState.textContent(),
    "aperto",
    "the packed timeline drawer ignored its open prop",
  )
  await controlledTimeline.getByText("Revisione").waitFor()
  assert.equal(
    await page.locator('output[aria-label="Contratto della cronologia"]').textContent(),
    "classe/timeline-drawer",
    "the packed timeline panel did not receive ref, className and the standard attribute",
  )
  await page.keyboard.press("Escape")
  await controlledTimeline.waitFor({ state: "hidden" })
  assert.equal(
    await timelineState.textContent(),
    "chiuso",
    "the packed timeline drawer dismissal did not reach onOpenChange",
  )

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

test("disclosure: the packed accordion follows the value it is given", async ({ page }) => {
  const { errors } = await openConsumer(page)
  const contract = page.locator('[data-disclosure-contract="accordion"]')
  const first = contract.getByRole("button", { name: "Come si paga?" })
  const second = contract.getByRole("button", { name: "Dove trovo la ricevuta?" })
  const openSections = page.locator('output[aria-label="Sezioni aperte"]')
  // The header label and its announced state, read from the tree the engine built.
  const settled = (label, state) =>
    page.waitForFunction(
      ([text, expected]) =>
        [...document.querySelectorAll("button[aria-expanded]")].some(
          (button) =>
            button.textContent?.includes(text) && button.getAttribute("aria-expanded") === expected,
        ),
      [label, state],
    )

  assert.equal(await first.getAttribute("aria-expanded"), "true")
  assert.equal(await second.getAttribute("aria-expanded"), "false")

  // A caller update, not a click, moves the open section.
  await page.locator("#consumer-disclosure-open").click()
  await settled("Dove trovo la ricevuta?", "true")
  assert.equal(await first.getAttribute("aria-expanded"), "false")
  assert.equal(
    await openSections.textContent(),
    "due",
    "the packed accordion ignored its value prop",
  )
  assert.equal(
    await page.locator('output[aria-label="Contratto delle sezioni"]').textContent(),
    "classe/accordion",
    "the packed accordion root did not receive ref, className and the standard attribute",
  )

  await second.click()
  await settled("Dove trovo la ricevuta?", "false")
  assert.equal(
    await openSections.textContent(),
    "nessuna",
    "the packed accordion header did not reach onValueChange",
  )

  // Uncontrolled in the installed package: two sections open at mount, and a
  // third opening without closing them, since `multiple` allows it.
  const uncontrolled = page.locator('[data-testid="consumer-disclosure-default"]')
  const sectionA = uncontrolled.getByRole("button", { name: "Prima sezione" })
  const sectionB = uncontrolled.getByRole("button", { name: "Seconda sezione" })
  const sectionC = uncontrolled.getByRole("button", { name: "Terza sezione" })
  assert.equal(await sectionA.getAttribute("aria-expanded"), "true")
  assert.equal(await sectionB.getAttribute("aria-expanded"), "true")
  assert.equal(await sectionC.getAttribute("aria-expanded"), "false")
  await sectionC.click()
  await settled("Terza sezione", "true")
  assert.equal(await sectionA.getAttribute("aria-expanded"), "true", "a kept section closed")
  assert.equal(await sectionB.getAttribute("aria-expanded"), "true", "a kept section closed")

  assert.deepEqual(errors, [], "packed application logged browser errors")
})
