// The packed forms a page submits: the OTP field and its local artwork, the
// Switch family with its controlled and uncontrolled behaviour, the
// Autocomplete, the Preferences form and the Date picker with its range mode
// and its keyboard perimeter.
import assert from "node:assert/strict"
import { test } from "@playwright/test"
import sharp from "sharp"
import {
  NEW_TAB_TIMEOUT,
  assertCodeArtwork,
  assertFocusPerimeter,
  consumerUse,
  newTabClickOptions,
  openConsumer,
  opensNewTabInBrowser,
} from "./support.mjs"

test.use(consumerUse)

test("forms: the packed controls accept input, submit and keep their keyboard perimeter", async ({
  browserName,
  context,
  page,
}) => {
  const { errors, url } = await openConsumer(page)
  // Safari's default link traversal is Option-Tab, not plain Tab.
  const nextBreadcrumbLink = browserName === "webkit" ? "Alt+Tab" : "Tab"
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
  await assertCodeArtwork(codeFrame, [85, 92, 112], [11, 62, 227], [14, 15, 19])
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
      const newPage = informationPage.context().waitForEvent("page", { timeout: NEW_TAB_TIMEOUT })
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
  // Firefox derives the border box from app-unit-rounded quads, so a 44px
  // target can arrive as 44.000061; the tolerance keeps the assertion strict
  // against any real change while ignoring that float noise.
  const narrowSwitchHeight = (await narrowSwitchControl.boundingBox()).height
  assert.ok(
    Math.abs(narrowSwitchHeight - 44) < 0.01,
    `packed switch target is ${narrowSwitchHeight}px tall, expected 44`,
  )
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

  // The sweep re-reads the domains one by one: the Button it starts from is the
  // only locator it does not own.
  const action = page.getByRole("button", { name: "Attiva azione" })
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
    page.getByRole("button", { name: "Elimina Servizio facoltativo" }),
  ]) {
    await control.focus()
    await assertFocusPerimeter(control)
  }
  const schoolPreference = page.getByRole("button", { name: "Elimina Servizi scolastici" })
  await schoolPreference.focus()
  await assertFocusPerimeter(schoolPreference)
  await schoolPreference.click()
  await page.getByText("Servizi scolastici", { exact: true }).waitFor({ state: "detached" })
  assert.deepEqual(errors, [], "packed application logged browser errors")
})
