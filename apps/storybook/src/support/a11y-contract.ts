// Shared accessibility contract for the story suite.
//
// `.storybook/preview.tsx` registers `a11yContractAfterEach` for every story:
// after the story's own `play` has settled, the hook verifies the behaviour a
// per-type contract requires (ARIA APG) and re-runs the layout under the
// accessibility conditions Storybook does not open by default (320px reflow,
// increased text spacing and zoom). The checks are presence-driven: a story is
// verified for the widgets it actually renders, so new stories inherit the
// contract without per-file wiring.
//
// Fixtures pinned at a source width (the Figma matrices) opt out of the reflow
// condition with `parameters: { a11yContract: { reflow: false } }`: they are
// showcases, not product surfaces.
//
// The hook runs only inside the browser test runner (`__vitest_browser__`):
// the interactive Storybook keeps its normal lifecycle.
import { expect, userEvent } from "storybook/test"
import type { StoryContext } from "storybook/internal/types"

const FOCUS_GUARD = "[data-base-ui-focus-guard]"
const POPUP = "[role='dialog'],[role='alertdialog'],[role='menu'],[role='listbox']"
const GROUP_ELEMENTS = "[data-slot='otp-field-group'],fieldset,[role='group'],[role='radiogroup']"
const INTERACTIVE = [
  "a[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[role='switch']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='tab']",
  "[role='combobox']",
  "[role='option']",
  "[role='menuitem']",
  "[role='slider']",
  "[role='spinbutton']",
].join(",")
const TABBABLE = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "audio[controls]",
  "video[controls]",
  "[contenteditable='true']",
  "[tabindex]",
].join(",")

/** Whether the page is running inside the Vitest browser run. */
export function isTestRun() {
  return Boolean(globalThis.__vitest_browser__)
}

// Long enough for a decorative settle animation, short enough that a paused or
// interrupted one cannot hold the afterEach pass.
const ANIMATION_DEADLINE_MS = 1000

function isVisible(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false
  if (element.closest(`[hidden],[inert],[aria-hidden='true'],${FOCUS_GUARD}`)) return false
  if (element.getClientRects().length === 0) return false
  const style = getComputedStyle(element)
  return style.display !== "none" && style.visibility !== "hidden"
}

function describe(element: Element) {
  const slot = element.getAttribute("data-slot")
  const text = (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40)
  return `<${element.tagName.toLowerCase()}${slot ? ` data-slot=${slot}` : ""}>${text ? ` "${text}"` : ""}`
}

function visibleTabbables(root: ParentNode) {
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) =>
      isVisible(element) &&
      element.tabIndex >= 0 &&
      !element.matches(":disabled") &&
      element.closest(FOCUS_GUARD) === null,
  )
}

// The story surface is the canvas plus the widgets it portals into the body
// (menus, dialogs, listboxes).
function storySurfaces(canvas: HTMLElement) {
  const surfaces: HTMLElement[] = [canvas]
  for (const popup of document.querySelectorAll<HTMLElement>(POPUP))
    if (isVisible(popup)) surfaces.push(popup)
  return surfaces
}

function inStory(canvas: HTMLElement, element: Element | null) {
  if (!element) return false
  if (canvas.contains(element)) return true
  return storySurfaces(canvas).some((surface) => surface.contains(element))
}

async function nextFrame() {
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
  )
}

async function settle() {
  await nextFrame()
  await new Promise((resolve) => setTimeout(resolve, 50))
  await nextFrame()
}

// A failing hook no longer runs inside Storybook's chain: the recorder below
// keeps the story surface on the shared realm and a Vitest `afterEach`
// (src/stories/support/a11y-setup.ts) runs the checks.
interface StorySurface {
  id: string
  canvas: HTMLElement
  parameters: object
  tags: string[]
}

declare global {
  // Shared across the two module graphs (the preview bundle and the test
  // setup); both run in the same browser realm.
  var __pagopaA11yContractSurface: StorySurface | undefined
  // Set by the Vitest browser runtime.
  var __vitest_browser__: boolean | undefined
  // Declared by a condition project's setup file, so the contract can refuse a
  // pass whose browser context is not the one the project is named after.
  var __pagopaCondition: { forcedColors?: boolean; reducedMotion?: boolean } | undefined
}

interface Contract {
  reflow?: boolean
  dialog?: boolean
  landmarks?: boolean
}

// Reads the story's `a11yContract` flags without asserting a shape on the
// merged Storybook parameters.
function contractOf(parameters: object): Contract {
  const contract: Contract = {}
  for (const [key, value] of Object.entries(parameters)) {
    if (key !== "a11yContract" || typeof value !== "object" || value === null) continue
    for (const [flag, enabled] of Object.entries(value)) {
      if (typeof enabled !== "boolean") continue
      if (flag === "reflow" || flag === "dialog" || flag === "landmarks") contract[flag] = enabled
    }
  }
  return contract
}

// The reflow condition's exemptions live with each story: `parameters:
// { a11yContract: { reflow: false } }` carries the flag and the reason (a
// source-width fixture, or a radius the story pins). The flags that remain are
// debt, recorded in https://github.com/pagopa/ui/issues/192.

// Waits for a predicate on a wall-clock budget rather than a frame count: a
// fixed number of frames measures how busy the runner was, and a loaded CI
// worker drops frames often enough to fail a correct component.
async function until(predicate: () => boolean, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return true
    await nextFrame()
  }
  return predicate()
}

// Colour measurement for the focus paint. `getComputedStyle` hands back the
// authored colour space (`oklch(…)`, `color-mix(…)`), so a 1x1 canvas
// normalises every token to sRGB bytes instead of the loop re-implementing
// every serialisation CSS allows.
type Rgba = [number, number, number, number]

let colourContext: CanvasRenderingContext2D | null | undefined

function parseColour(value: string): Rgba | null {
  if (colourContext === undefined)
    colourContext = document.createElement("canvas").getContext("2d", {
      willReadFrequently: true,
    })
  if (!colourContext) return null
  // The 1x1 canvas keeps the last fill, so an unparsable colour would be read
  // back as the previous one: seed a known value and require the read to match.
  colourContext.clearRect(0, 0, 1, 1)
  colourContext.fillStyle = "#010203"
  colourContext.fillStyle = value
  colourContext.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = colourContext.getImageData(0, 0, 1, 1).data
  return [r, g, b, a / 255]
}

interface Backdrop {
  colour: Rgba
  /** False when a gradient or image sits under the cue: only bounds remain. */
  readable: boolean
}

// The colour a ring painted outside `node` sits on: the opaque composite of
// every background between it and the document, or white when they are all
// translucent.
function backdropOf(node: HTMLElement): Backdrop {
  const layers: Rgba[] = []
  let readable = true
  for (
    let current: HTMLElement | null = node.parentElement;
    current;
    current = current.parentElement
  ) {
    const style = getComputedStyle(current)
    const colour = parseColour(style.backgroundColor)
    if (colour && colour[3] > 0) layers.push(colour)
    if (colour && colour[3] >= 1) break
    // An image or gradient breaks the measurement: what sits under the ring is
    // no longer a colour the check can read.
    if (style.backgroundImage !== "none") {
      readable = false
      break
    }
  }
  return {
    readable,
    colour: layers.reduceRight<Rgba>(
      (backdrop, layer) => composite(layer, backdrop),
      [255, 255, 255, 1],
    ),
  }
}

function composite(foreground: Rgba, background: Rgba): Rgba {
  const alpha = foreground[3]
  return [
    foreground[0] * alpha + background[0] * (1 - alpha),
    foreground[1] * alpha + background[1] * (1 - alpha),
    foreground[2] * alpha + background[2] * (1 - alpha),
    1,
  ]
}

function relativeLuminance([r, g, b]: Rgba) {
  const channel = (value: number) => {
    const scaled = value / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(foreground: Rgba, background: Rgba) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

// WCAG 1.4.11: a focus indicator is a user-interface component, so every part
// of it needs 3:1 against the colours it sits next to.
const MINIMUM_FOCUS_CONTRAST = 3

interface FocusPaint {
  colour: Rgba
  /** The offset decides whether the cue sits on the control or beside it. */
  inset: boolean
  description: string
}

function shadowColours(shadow: string) {
  return [...shadow.matchAll(/(?:rgba?|oklch|oklab|color)\([^)]*\)|#[0-9a-f]{3,8}/gi)].map(
    (match) => match[0],
  )
}

// The cue a node paints while it has the focus, as a colour and a side.
function focusPaintOf(node: HTMLElement): FocusPaint | null {
  const style = getComputedStyle(node)
  const width = Number.parseFloat(style.outlineWidth)
  const outlineVisible =
    style.outlineStyle !== "none" && (style.outlineStyle === "auto" || width >= 1)
  if (outlineVisible) {
    const colour = parseColour(style.outlineColor)
    if (colour && colour[3] > 0)
      return {
        colour,
        inset: Number.parseFloat(style.outlineOffset) < 0,
        description: `outline ${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
      }
  }
  for (const candidate of shadowColours(style.boxShadow)) {
    const colour = parseColour(candidate)
    if (!colour || colour[3] <= 0) continue
    return { colour, inset: style.boxShadow.includes("inset"), description: `shadow ${candidate}` }
  }
  return null
}

interface FocusMeasurement {
  painter: HTMLElement
  paint: FocusPaint | null
  /** What the presence failure prints: the diff that found no cue. */
  diagnostics: string
}

// The node that owns the focus cue and the colour it paints. The walk diffs the
// styled chain before and after blurring, so a composite widget that paints the
// ring on its frame instead of the inner input is measured on the frame it
// actually paints.
async function measureFocusPaint(element: HTMLElement): Promise<FocusMeasurement | null> {
  // Another flow (a popup closing, a focus trap) may own the focus by now: the
  // paint diff needs the element itself focused.
  if (document.activeElement !== element) return null
  const chain = [element]
  for (
    let parent = element.parentElement, depth = 0;
    parent && depth < 3;
    parent = parent.parentElement, depth += 1
  )
    chain.push(parent)
  const snapshot = (node: HTMLElement) => {
    const style = getComputedStyle(node)
    return `${style.outlineStyle}|${style.outlineWidth}|${style.boxShadow}`
  }
  // The paint is read while the cue is on screen: a widget that re-renders on
  // blur may not hand focus back, so a live read after the diff is unreliable.
  const focused = chain.map((node) => ({ text: snapshot(node), paint: focusPaintOf(node) }))
  element.blur()
  await nextFrame()
  if (document.activeElement === element) {
    element.blur()
    await nextFrame()
    if (document.activeElement === element) return null
  }
  const blurred = chain.map(snapshot)
  element.focus()
  await nextFrame()
  // The innermost node whose styling changed owns the cue; if it paints
  // nothing measurable the walk continues outward, because a wrapper may.
  let paint: FocusPaint | null = null
  let painter = element
  for (const [index, focusedEntry] of focused.entries()) {
    if (focusedEntry.text === blurred[index]) continue
    if (!focusedEntry.paint) continue
    paint = focusedEntry.paint
    painter = chain[index]
    break
  }
  if (!paint)
    return {
      painter,
      paint,
      diagnostics: `active=${document.activeElement === element} class="${(element.className ?? "").toString().slice(-90)}" focused=[${focused.map((entry) => entry.text).join(" | ")}] blurred=[${blurred.join(" | ")}]`,
    }
  return { painter, paint, diagnostics: "" }
}

// A focused control must paint a visible cue. Contrast is measured by
// `expectFocusContrast`, which each component asserts on the surfaces it is
// documented for; making every story carry the measurement is the harness
// upgrade tracked separately.
// Exported for its own negative test: `A11yContract.stories.tsx` runs it
// against a control with no cue and asserts the failure, so the check cannot
// quietly stop checking.
export async function expectFocusPaint(element: HTMLElement) {
  const measured = await measureFocusPaint(element)
  expect(
    measured?.paint ?? null,
    `keyboard focus paints no measurable cue on ${describe(element)} (${measured?.diagnostics ?? `active=${document.activeElement === element}`})`,
  ).not.toBe(null)
}

// A running transition reports an interpolated colour, so a cue measured mid
// fade reads as translucent even when the settled token is opaque. Freezing
// returns the undo, so the caller decides how long the freeze lasts.
function freezeMotion() {
  const style = document.createElement("style")
  style.textContent =
    "*,*:before,*:after{transition:none!important;animation-delay:0s!important;animation-duration:0.001s!important;animation-iteration-count:1!important}"
  document.head.append(style)
  return () => style.remove()
}

// Tabbing is the only way to make the browser paint `:focus-visible`, which is
// the cue these checks are about: a click-driven focus paints nothing by design.
export async function focusWithKeyboard(element: HTMLElement) {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  for (let step = 0; step < 40; step += 1) {
    await userEvent.tab()
    if (document.activeElement === element) return
  }
  throw new Error(`keyboard focus never reached ${describe(element)}`)
}

// WCAG 1.4.11 on one control: the cue the component paints for keyboard focus,
// measured against the colour beside it. Stories call this where the pair
// (component, surface) is part of the documentation, so a translucent or
// low-contrast ring fails here instead of passing as "a cue exists".
export async function expectFocusContrast(element: HTMLElement) {
  const restore = freezeMotion()
  try {
    await expectSettledFocusContrast(element)
  } finally {
    restore()
  }
}

async function expectSettledFocusContrast(element: HTMLElement) {
  const measured = await measureFocusPaint(element)
  expect(
    measured?.paint ?? null,
    `keyboard focus paints no measurable cue on ${describe(element)} (${measured?.diagnostics ?? `active=${document.activeElement === element}`})`,
  ).not.toBe(null)
  if (!measured?.paint) return
  const { painter, paint } = measured
  const backdrop = paint.inset ? backdropOf(painter.parentElement ?? painter) : backdropOf(painter)
  const own = parseColour(getComputedStyle(painter).backgroundColor)
  const adjacent =
    paint.inset && own && own[3] > 0 ? composite(own, backdrop.colour) : backdrop.colour
  const painted = composite(paint.colour, adjacent)
  if (!backdrop.readable) {
    // A gradient or an image sits under the cue, so there is no single colour to
    // measure: the cue still has to clear 3:1 against one end of the range, which
    // a washed-out or translucent cue cannot do.
    const reach = Math.max(
      contrastRatio(painted, [255, 255, 255, 1]),
      contrastRatio(painted, [0, 0, 0, 1]),
    )
    expect(
      reach,
      `the focus cue on ${describe(painter)} (${paint.description}) reaches ${reach.toFixed(2)}:1 against white and black, so no backdrop under the gradient or image keeps it visible`,
    ).toBeGreaterThanOrEqual(MINIMUM_FOCUS_CONTRAST)
    return
  }
  const ratio = contrastRatio(painted, adjacent)
  expect(
    ratio,
    `the focus cue on ${describe(painter)} (${paint.description}) reaches ${ratio.toFixed(2)}:1 against the adjacent colour, below the ${MINIMUM_FOCUS_CONTRAST}:1 a focus indicator needs`,
  ).toBeGreaterThanOrEqual(MINIMUM_FOCUS_CONTRAST)
}

// The elements that push the document wider than the viewport, for reflow
// failures: elements clipped by a deliberate scroll container are exempt, like
// the packed artifact test does for its own probes.
function describeOverflow(width: number) {
  const culprits = []
  for (const element of document.body.querySelectorAll<HTMLElement>("*")) {
    const rect = element.getBoundingClientRect()
    if (rect.width <= 1 || rect.right <= width + 1) continue
    if (element.closest(`[aria-hidden='true'],${FOCUS_GUARD}`)) continue
    let clipped = false
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const overflowX = getComputedStyle(parent).overflowX
      if (overflowX !== "visible" && parent.scrollWidth > parent.clientWidth) {
        clipped = true
        break
      }
    }
    if (clipped) continue
    culprits.push(
      `${describe(element)} label=${element.getAttribute("aria-label")} right=${Math.round(rect.right)} parent=${(element.parentElement?.className ?? "").toString().slice(0, 60)}`,
    )
    if (culprits.length === 4) break
  }
  return culprits.length ? `; overflowing: ${culprits.join(", ")}` : ""
}

// Text that a box hides is text the reader cannot reach: at 200% the fixed
// heights in the library stop fitting the scaled line boxes, and `overflow:
// hidden` swallows the remainder with no scroll and no ellipsis. A deliberate
// `line-clamp` (the truncation the design system documents for a preview value)
// is the one accepted cut, because the full string stays available elsewhere.
function expectNoTextClipping(storyId: string, width: number) {
  // Only the library's own roots are audited: Storybook's chrome lives in the
  // same document and answers to its own layout, not to this contract.
  const clipped = []
  const candidates = [
    ...document.querySelectorAll<HTMLElement>("[data-slot], [data-pagopa-ui-portal-root]"),
  ].flatMap((root) => [root, ...root.querySelectorAll<HTMLElement>("*")])
  for (const element of candidates) {
    if (element.closest(`[aria-hidden='true'],${FOCUS_GUARD}`)) continue
    // `.sr-only` clips to a 1px box on purpose: the text is for the screen
    // reader. The utility is `pui:`-prefixed in the library, so match the name
    // anywhere in the list rather than as a bare class.
    if (element.closest("[data-slot='field-label'], [class*='sr-only']")) continue
    const style = getComputedStyle(element)
    if (style.webkitLineClamp !== "none" && style.webkitLineClamp !== "") continue
    if (style.textOverflow === "ellipsis") continue
    // A clipped or clipped-to-1px box is the visually-hidden idiom, not a
    // layout that lost text: the reader gets the string through the a11y tree.
    if (style.clipPath !== "none" || style.clip !== "auto") continue
    if (element.childElementCount !== 0) continue
    if (!element.textContent?.trim()) continue
    const hidesVertically =
      style.overflowY !== "visible" && element.scrollHeight > element.clientHeight + 1
    if (!hidesVertically) continue
    clipped.push(
      `${describe(element)} "${element.textContent.trim().slice(0, 24)}" ${element.clientHeight}px of ${element.scrollHeight}px`,
    )
    if (clipped.length === 4) break
  }
  expect(
    clipped,
    `[${storyId}] clips its own text at 200% (${width}px viewport, 32px root font): ${clipped.join("; ")}`,
  ).toHaveLength(0)
}

/**
 * The library answers `prefers-reduced-motion` with one global block in
 * `index.css`, keyed on the `data-slot` stamp. This audit proves that answer
 * reaches the rendered components: it only means anything where the engine
 * itself reports the preference, so it is a no-op in the default and
 * forced-colours passes and a real check in the `storybook-reduced-motion`
 * pass. The loading spinner keeps its motion by design (it carries the
 * documented `.loading-spinner-motion` escape).
 */
export function expectReducedMotionConditions(
  storyId = globalThis.__pagopaA11yContractSurface?.id ?? "",
) {
  const honoured = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (globalThis.__pagopaCondition?.reducedMotion) {
    // A context option that never reached the browser would make this pass a
    // duplicate of the default one and pass twice for nothing.
    expect(
      honoured,
      `[${storyId}] the reduced-motion project runs without the engine reporting the preference`,
    ).toBe(true)
  }
  if (!honoured) return
  const roots = document.querySelectorAll<HTMLElement>("[data-slot], [data-pagopa-ui-portal-root]")
  const moving = []
  for (const root of roots) {
    if (root.closest(".loading-spinner-motion")) continue
    for (const element of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
      if (element.closest(".loading-spinner-motion")) continue
      const style = getComputedStyle(element)
      const longest = Math.max(
        ...[...style.transitionDuration.split(","), ...style.animationDuration.split(",")].map(
          (value) => parseSeconds(value),
        ),
      )
      if (longest <= 0.011) continue
      moving.push(`${describe(element)} ${longest}s`)
      break
    }
    if (moving.length === 4) break
  }
  expect(
    moving,
    `[${storyId}] keeps motion under prefers-reduced-motion: ${moving.join("; ")}`,
  ).toHaveLength(0)
}

function parseSeconds(value: string) {
  const trimmed = value.trim()
  if (trimmed.endsWith("ms")) return Number.parseFloat(trimmed) / 1000
  return Number.parseFloat(trimmed) || 0
}

// The natural focus order is the DOM order: a positive tabindex re-sorts it.
function expectNoPositiveTabindex(root: ParentNode) {
  const positive = [...root.querySelectorAll<HTMLElement>("[tabindex]")].filter(
    (element) => Number(element.getAttribute("tabindex")) > 0,
  )
  expect(
    positive.map((element) => describe(element)),
    "positive tabindex values override the natural focus order",
  ).toHaveLength(0)
}

// A pragmatic accessible-name probe: aria-label, aria-labelledby, the native
// label association and the element's own text. dom-accessibility-api returns
// an empty name for popup internals during their open lifecycle, so the check
// stays on the element's own association.
function hasAccessibleName(element: HTMLElement) {
  if (element.getAttribute("aria-label")?.trim()) return true
  const labelledBy = element.getAttribute("aria-labelledby")
  if (labelledBy?.split(/\s+/).some((id) => document.getElementById(id)?.textContent?.trim()))
    return true
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLButtonElement
  ) {
    if (Array.from(element.labels ?? []).some((label) => label.textContent?.trim())) return true
  }
  return Boolean(element.textContent?.trim())
}

// Every interactive control is reachable and announces a name.
async function expectAccessibleNames(canvas: HTMLElement) {
  for (const surface of storySurfaces(canvas)) {
    for (const element of surface.querySelectorAll<HTMLElement>(INTERACTIVE)) {
      // A popup may have closed while the checks ran: detached nodes have no
      // name to announce.
      if (!element.isConnected) continue
      if (!isVisible(element)) continue
      expect(
        hasAccessibleName(element),
        `an interactive element announces no name: ${describe(element)} attrs=${[
          ...element.attributes,
        ]
          .map((attribute) => `${attribute.name}="${attribute.value.slice(0, 50)}"`)
          .join(" ")}`,
      ).toBe(true)
    }
  }
}

// A busy action stays in the tab order and announces its state: disabled
// semantics alone would drop keyboard and screen-reader users.
function expectBusyActionsFocusable(root: ParentNode) {
  for (const element of root.querySelectorAll<HTMLElement>("[aria-busy='true']")) {
    if (!isVisible(element)) continue
    const isAction =
      element.tagName === "BUTTON" ||
      element.getAttribute("role") === "button" ||
      element.closest("button,[role='button']") !== null
    if (!isAction) continue
    expect(
      element.matches(":disabled") || element.tabIndex < 0,
      `a busy action must stay focusable: ${describe(element)}`,
    ).toBe(false)
  }
}

// Tabbing from the top reaches each expected control in DOM order; interactive
// controls paint their focus. The walk stops as soon as focus leaves the story
// (a focus guard owns it), so it never fights a widget lifecycle. When a modal
// is open the walk stays inside it, like the real keyboard trap does.
async function expectKeyboardWalk(canvas: HTMLElement) {
  const modal = [
    ...document.querySelectorAll<HTMLElement>(
      "[aria-modal='true'],[role='dialog'],[role='alertdialog']",
    ),
  ]
    .filter(isVisible)
    .at(-1)
  const expected = (modal ? [modal] : storySurfaces(canvas))
    .flatMap((surface) => visibleTabbables(surface))
    .sort((left, right) =>
      // compareDocumentPosition answers with a bitmask: the bitwise test is the
      // documented way to read it.
      // oxlint-disable-next-line no-bitwise
      left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
  const limit = Math.min(expected.length, 8)
  if (limit === 0) return
  if (modal) {
    // Start inside the modal: the real keyboard trap keeps focus there.
    ;(visibleTabbables(modal)[0] ?? modal).focus()
  } else {
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
  }
  let index = 0
  for (let step = 0; step < 24 && index < limit; step += 1) {
    await userEvent.tab()
    const focused = document.activeElement
    if (!(focused instanceof HTMLElement) || focused === document.body) return
    // user-event can tab into content a real browser would keep inert.
    if (!isVisible(focused)) return
    if (!inStory(canvas, focused)) return
    if (modal && !modal.contains(focused)) return
    if (focused.closest(FOCUS_GUARD)) continue
    const position = expected.indexOf(focused)
    if (position === -1) {
      // Roving tabindex widgets (an OTP's active slot) move between elements
      // during the walk: a currently tabbable control is in the order.
      expect(
        focused.tabIndex,
        `tab reaches ${describe(focused)}, which is not part of the story's keyboard order`,
      ).toBeGreaterThanOrEqual(0)
      if (focused.matches(INTERACTIVE)) await expectFocusPaint(focused)
      index += 1
      continue
    }
    // Reaching an earlier control again means the tab sequence wrapped: the
    // walk is over. Positive tabindex values, the real reordering fault, are
    // rejected separately.
    if (position < index) return
    if (focused.matches(INTERACTIVE)) await expectFocusPaint(focused)
    index = position + 1
  }
}

// A dialog moves focus inside, exposes a name and dismisses with Escape when
// it is a modal dialog. Alert dialogs may require an explicit choice; a
// non-modal popover (role=dialog without modal semantics) keeps the focus on
// its trigger by design.
async function expectDialogBehaviour() {
  for (const dialog of document.querySelectorAll<HTMLElement>(
    "[role='dialog'],[role='alertdialog'],dialog[open]",
  )) {
    if (!isVisible(dialog)) continue
    // A dialog in its exit transition is closing: the focus is already back on
    // its trigger by design, so the contract applies while it is open, not
    // while it animates out. A slow runner keeps the ending style mounted long
    // enough for the afterEach pass to see it.
    if (dialog.matches("[data-ending-style],[data-closed]")) continue
    // A non-modal popover uses role=dialog without modality: the trigger keeps
    // the focus by design. Everything else follows the dialog contract.
    const modalLike = dialog.closest('[data-slot="popover-content"]') === null
    if (!modalLike) continue
    expect(hasAccessibleName(dialog), `an open dialog announces no name: ${describe(dialog)}`).toBe(
      true,
    )
    const owns = await until(() => {
      const active = document.activeElement
      return active === dialog || dialog.contains(active)
    })
    // Naming the element that kept the focus tells a focus-management race
    // apart from a dialog that never mounted its content.
    const focusHolder =
      document.activeElement instanceof Element ? describe(document.activeElement) : "nothing"
    expect(
      owns,
      `an open dialog must own the focus: ${describe(dialog)}; it is on ${focusHolder}`,
    ).toBe(true)
    if (dialog.getAttribute("role") === "dialog") {
      await userEvent.keyboard("{Escape}")
      const dismissed = await until(() => !isVisible(dialog))
      expect(
        dismissed,
        `Escape must dismiss the dialog (${describe(dialog)}); an alert dialog that needs an answer sets role=alertdialog`,
      ).toBe(true)
    }
  }
}

// Arrow keys move the selected tab in a tab list (APG tabs, automatic
// activation): focus follows selection.
async function expectTabBehaviour(root: ParentNode) {
  for (const tablist of root.querySelectorAll<HTMLElement>("[role='tablist']")) {
    if (!isVisible(tablist)) continue
    const tabs = [...tablist.querySelectorAll<HTMLElement>("[role='tab']")].filter(isVisible)
    const current = tabs.find((tab) => tab.getAttribute("aria-selected") === "true")
    if (!current || tabs.length < 2) continue
    const enabled = tabs.filter((tab) => !tab.matches(":disabled") && tab.tabIndex >= 0)
    if (enabled.length < 2) continue
    current.focus()
    const before = tabs.indexOf(current)
    await userEvent.keyboard("{ArrowRight}")
    const selected = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true")
    expect(selected !== before, "ArrowRight must move the selection to the next tab").toBe(true)
    await expect(document.activeElement, "focus follows the selected tab").toBe(tabs[selected])
  }
}

// Arrow keys move the checked radio inside a radio group (APG radio group).
async function expectRadioGroupBehaviour(root: ParentNode) {
  for (const group of root.querySelectorAll<HTMLElement>("[role='radiogroup']")) {
    if (!isVisible(group)) continue
    const radios = [
      ...group.querySelectorAll<HTMLElement>("[role='radio'],input[type='radio']"),
    ].filter(isVisible)
    const enabled = radios.filter((radio) => !radio.matches(":disabled"))
    if (enabled.length < 2) continue
    const checked = radios.find(
      (radio) => radio.getAttribute("aria-checked") === "true" || radio.matches("input:checked"),
    )
    if (!checked) continue
    checked.focus()
    await userEvent.keyboard("{ArrowDown}")
    // A controlled group may refuse the selection change but still move the
    // keyboard focus: either movement satisfies the APG contract.
    const movedOrFocused = radios.some(
      (radio) =>
        radio !== checked &&
        (radio.getAttribute("aria-checked") === "true" ||
          radio.matches("input:checked") ||
          document.activeElement === radio),
    )
    expect(
      movedOrFocused,
      "ArrowDown must move the checked radio (or its focus) to the next option",
    ).toBe(true)
  }
}

// A collapsed combobox announces its state and opens from the keyboard.
async function expectComboboxBehaviour(root: ParentNode) {
  for (const combobox of root.querySelectorAll<HTMLElement>("[role='combobox']")) {
    if (!isVisible(combobox)) continue
    const expanded = combobox.getAttribute("aria-expanded")
    expect(
      expanded === "true" || expanded === "false",
      `a combobox announces aria-expanded: ${describe(combobox)}`,
    ).toBe(true)
    if (expanded !== "false" || combobox.matches(":disabled")) continue
    combobox.focus()
    await userEvent.keyboard("{ArrowDown}")
    const opened = await until(() =>
      [...document.querySelectorAll<HTMLElement>("[role='listbox']")].some(isVisible),
    )
    expect(opened, `ArrowDown opens the listbox of ${describe(combobox)}`).toBe(true)
    // Close it again: the remaining checks (names, reflow) expect the resting
    // page, and an open popup detaches the trigger's label association.
    await userEvent.keyboard("{Escape}")
    await until(
      () => ![...document.querySelectorAll<HTMLElement>("[role='listbox']")].some(isVisible),
      1000,
    )
  }
}

// Live regions announce content: an alert without text announces nothing.
function expectLiveRegions(root: ParentNode) {
  for (const region of root.querySelectorAll<HTMLElement>("[role='alert']")) {
    if (!region.isConnected) continue
    if (!isVisible(region)) continue
    const text = (region.textContent ?? "").trim()
    const label = region.getAttribute("aria-label")?.trim()
    expect(
      text.length > 0 || Boolean(label),
      `a live region must announce content: ${describe(region)}`,
    ).toBe(true)
  }
}

// A story tagged `live-region` shows a message that appears or changes while it
// runs: the announcement must reach a visible live region, not only the DOM.
const ANNOUNCEMENT =
  "[role='status'],[role='alert'],[role='log'],[aria-live='polite'],[aria-live='assertive']"

function expectAnnouncement(canvas: HTMLElement, storyId: string) {
  const announced = [canvas, document].some((root) =>
    [...root.querySelectorAll<HTMLElement>(ANNOUNCEMENT)].some(
      (region) => isVisible(region) && (region.textContent ?? "").trim().length > 0,
    ),
  )
  expect(announced, `a live-region story must announce content: ${storyId}`).toBe(true)
}

// Several navigations on one page need names; a table needs header cells.
async function expectLandmarks(root: ParentNode) {
  const navs = [...root.querySelectorAll<HTMLElement>("nav,[role='navigation']")].filter(isVisible)
  if (navs.length > 1)
    for (const nav of navs)
      expect(
        hasAccessibleName(nav),
        `one of several navigations announces no name: ${describe(nav)}`,
      ).toBe(true)
  for (const table of root.querySelectorAll<HTMLElement>("table:not([role='presentation'])")) {
    if (!isVisible(table)) continue
    expect(
      table.querySelectorAll("th,[role='columnheader'],[role='rowheader']").length,
      `a table exposes header cells: ${describe(table)}`,
    ).toBeGreaterThan(0)
  }
}

// Errors are announced once through the summary, not once per message: a
// canvas with invalid fields keeps at most one alert; the field itself is
// associated through aria-describedby.
function expectFieldErrors(root: ParentNode) {
  const invalid = [...root.querySelectorAll<HTMLElement>("[aria-invalid='true']")].filter(isVisible)
  if (invalid.length === 0) return
  const alerts = [...root.querySelectorAll<HTMLElement>("[role='alert']")].filter(isVisible)
  expect(
    alerts.length,
    "error announcements use a single strategy: one summary, not one alert per message",
  ).toBeLessThanOrEqual(1)
  // The association is required while the field family renders a message: a
  // primitive used without one (a state showcase) has nothing to associate.
  const messages = [...root.querySelectorAll<HTMLElement>('[data-slot="field-error"]')].filter(
    isVisible,
  )
  if (messages.length === 0) return
  // The association is required per control, or per composite group: an
  // OTP-style group associates its message once, on the labelled slot.
  const described = (node: Element | null): boolean => {
    const describedBy = node?.getAttribute("aria-describedby")
    return Boolean(
      describedBy
        ?.split(/\s+/)
        .map((id) => document.getElementById(id))
        .some((element) => element && (element.textContent ?? "").trim().length > 0),
    )
  }
  // The composite container is the outermost consecutive group element: a radio
  // group nested in a describedOn fieldset is described by that fieldset, and
  // the walk must stop there — an unrelated `aria-describedby` above it (the
  // form, the canvas) must not satisfy the member's own description.
  const containerOf = (field: Element): Element => {
    let group = field.closest(GROUP_ELEMENTS)
    if (!group) return field
    for (
      let parent = group.parentElement;
      parent && parent.matches(GROUP_ELEMENTS);
      parent = parent.parentElement
    )
      group = parent
    return group
  }
  const isDescribedWithin = (field: Element, boundary: Element): boolean => {
    for (let node: Element | null = field; node; node = node.parentElement) {
      if (described(node)) return true
      if (node === boundary) return false
    }
    return false
  }
  const groups = new Map<Element, HTMLElement[]>()
  for (const field of invalid) {
    const key = containerOf(field)
    groups.set(key, [...(groups.get(key) ?? []), field])
  }
  for (const [key, members] of groups) {
    const satisfied = members.some((field) => isDescribedWithin(field, key))
    expect(
      satisfied,
      `an invalid field describes its error through aria-describedby: ${describe(members[0])}`,
    ).toBe(true)
  }
}

// WCAG 1.4.10 reflow at 320px, then 1.4.12 text spacing with 1.4.4 text at
// 200%: the page must not scroll horizontally. The same technique the packed
// artifact test uses (scripts/check-library/browser.spec.mjs).
// Exported for the same negative test: the story widens the page past the
// viewport and asserts this rejects, so the condition is proven to be able to
// fail rather than pass on every layout.
export async function expectReflowConditions(storyId: string) {
  const { page } = await import("@vitest/browser/context").catch(() => ({ page: undefined }))
  if (!page) {
    // A broken import would otherwise switch the condition off for every story
    // with no signal: a harness fault fails the story.
    throw new Error(
      `the reflow condition cannot start for [${storyId}]: "@vitest/browser/context" gives no page controller`,
    )
  }
  const html = document.documentElement
  const previous = {
    width: window.innerWidth,
    height: window.innerHeight,
    fontSize: html.style.getPropertyValue("font-size"),
    priority: html.style.getPropertyPriority("font-size"),
  }
  const spacing = document.createElement("style")
  spacing.textContent =
    "*{line-height:1.5!important;letter-spacing:0.12em!important;word-spacing:0.16em!important}p{margin-bottom:2em!important}"
  try {
    await page.viewport(320, 900)
    for (let frame = 0; frame < 60; frame += 1) {
      if (window.innerWidth === 320) break
      await nextFrame()
    }
    await settle()
    await document.fonts.ready.catch(() => undefined)
    const width = window.innerWidth
    expect(width, `the 320px viewport did not apply before the reflow check (${width}px)`).toBe(320)
    expect(
      html.scrollWidth,
      `[${storyId}] reflow at 320px scrolls horizontally (${html.scrollWidth}px inside ${width}px)${describeOverflow(width)}`,
    ).toBeLessThanOrEqual(width + 1)
    html.style.setProperty("font-size", "32px")
    document.body.append(spacing)
    await settle()
    // A user zoom is a resize, so a positioned overlay that sizes itself from
    // the viewport (`--available-width`) recomputes. Reproduce that before
    // measuring, or the popup keeps the width it opened at and the check
    // reports the stale geometry instead of the reflowed one.
    window.dispatchEvent(new Event("resize"))
    await settle()
    expect(
      html.scrollWidth,
      `[${storyId}] increased text spacing and 200% text scroll horizontally (${html.scrollWidth}px inside ${width}px)${describeOverflow(width)}`,
    ).toBeLessThanOrEqual(width + 1)
    expectNoTextClipping(storyId, width)
  } finally {
    html.style.setProperty("font-size", previous.fontSize, previous.priority)
    spacing.remove()
    await page.viewport(previous.width, previous.height).catch(() => undefined)
    // The resize must be visible to the next story before it mounts.
    for (let frame = 0; frame < 60; frame += 1) {
      if (window.innerWidth === previous.width && window.innerHeight === previous.height) break
      await nextFrame()
    }
    await nextFrame()
  }
}

/**
 * The per-field error message rendered by the field family. It is deliberately
 * not a live region: the form announces errors once through its summary
 * (`ErrorSummary`), and each control stays associated through
 * `aria-describedby`.
 */
export function fieldError(scope: ParentNode): HTMLElement {
  const element = scope.querySelector<HTMLElement>('[data-slot="field-error"]')
  if (!element) throw new Error("Expected the field error message")
  return element
}

/**
 * Records the story surface for the contract pass. Registered as a preview
 * `afterEach` hook (`.storybook/preview.tsx`): it never throws, so Storybook's
 * own hook chain (the axe pass included) always completes.
 */
export async function a11yContractAfterEach(context: StoryContext) {
  if (!isTestRun()) return
  const canvas = context.canvasElement
  if (!canvas) return
  const animations = [...document.querySelectorAll<HTMLElement>(".pagopa-ui-root")]
    .flatMap((root) => root.getAnimations({ subtree: true }))
    .filter((animation) => {
      const endTime = animation.effect?.getComputedTiming().endTime
      return animation.playState === "running" && Number.isFinite(endTime)
    })
  // The contract reads computed surfaces and contrast. A running transition or
  // entry animation would make it read an intermediate state, so wait for the
  // finite ones the play function left behind. A paused or interrupted
  // animation never resolves `finished`: the wait runs on a wall-clock budget,
  // and the timer is cleared so a fast story does not leave one pending.
  let deadline: ReturnType<typeof setTimeout> | undefined
  await Promise.race([
    Promise.allSettled(animations.map((animation) => animation.finished)),
    new Promise<void>((resolve) => {
      deadline = setTimeout(resolve, ANIMATION_DEADLINE_MS)
    }),
  ])
  if (deadline) clearTimeout(deadline)
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  globalThis.__pagopaA11yContractSurface = {
    id: context.id,
    canvas,
    parameters: context.parameters,
    tags: context.tags,
  }
}

/**
 * The accessibility contract pass. Run from a Vitest `afterEach` registered by
 * `a11y-setup.ts`: a failing check fails the test without aborting the
 * Storybook chain, and the story canvas is still mounted.
 */
export async function runA11yContract() {
  const story = globalThis.__pagopaA11yContractSurface
  delete globalThis.__pagopaA11yContractSurface
  if (!story || !isTestRun()) return
  const { id, canvas, parameters, tags } = story
  const contract = contractOf(parameters)
  // Freeze transitions and animations while the contract measures: the same
  // state the story runner uses during the story's own assertions.
  // Motion is audited before the freeze: the freeze exists to make the colour
  // reads settle, and it would mask the very durations this checks.
  expectReducedMotionConditions(id)
  const restore = freezeMotion()
  try {
    if (contract.reflow !== false) await expectReflowConditions(id)
    expectNoPositiveTabindex(canvas)
    await expectKeyboardWalk(canvas)
    if (contract.dialog !== false) await expectDialogBehaviour()
    await expectTabBehaviour(canvas)
    await expectRadioGroupBehaviour(canvas)
    await expectComboboxBehaviour(canvas)
    expectLiveRegions(canvas)
    if (tags.includes("live-region")) expectAnnouncement(canvas, id)
    if (contract.landmarks !== false) await expectLandmarks(canvas)
    expectFieldErrors(canvas)
    expectBusyActionsFocusable(canvas)
    await expectAccessibleNames(canvas)
  } finally {
    restore()
  }
}
