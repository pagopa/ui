// Figma parity — render capture.
//
// Opens a Storybook story in the installed Playwright, forces the story root to
// the source frame width and probes the DOM. The traps encoded here (figma-to-code
// skill, `references/visual-parity.md`): the centered layout adds 16px padding with
// `border-box`, so the padding is forced to 0 before measuring; the Storybook
// `args` URL parameter silently drops values with spaces, so states are applied
// through `--fill`/`--click` instead of args; a capture that is scaled, moving
// or in the wrong state must fail before any number is reported, so the
// preflight below refuses to produce a probe when the canvas is not at 1:1, the
// forced width did not land or the declared state is not visible in the DOM.
//
// Usage:
//   node src/cli.ts parity render --story <storyId> [--width 274] [--viewport 320] [--height 800]
//     [--subject field=#email --subject label=label[for=email]]
//     [--offset-origin "input"] [--expect-state filled] [--state-evidence "[data-slot=value]"]
//     [--fill '#email=nome@esempio.it'] [--click '#email'] [--focus '#email'] [--keep-focus]
//     [--screenshot .figma/parity/out.png] [--json]
import fs from "node:fs"
import path from "node:path"

import { enterRoot } from "../lib/paths.ts"

export const STORYBOOK_URL = process.env.STORYBOOK_URL ?? "http://localhost:6006"
export const SCHEMA_VERSION = 1
export const DEFAULT_ROOT = "#storybook-root"

// The article's capture hygiene: an animation or a transition that is still
// running moves pixels between two runs of the same case, and a caret or a
// scrollbar adds paint the source frame never had.
export const DISABLE_MOTION_CSS = `*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}
html { scrollbar-width: none; }
::-webkit-scrollbar { display: none; }`

// The preflight failures: `capture-mismatch` says the capture is not what the
// case claims (scale, canvas, forced width), `state-mismatch` says the story is
// not in the state the source variant declares. Both are missing evidence, not
// deltas: the caller exits 2.
export class CaptureError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(`${code}: ${message}`)
    this.name = "CaptureError"
    this.code = code
  }
}

const RULER_WIDTH = 100
const WIDTH_TOLERANCE = 2

// One parametrized probe: geometry, box model, paint, type, the ::after
// expansion target and the offset from the declared origin of every subject.
//
// It also computes the **responsive** block (RA5) from the element the case maps
// as its root: what a source frame cannot show but the render decides — content
// hidden by an overflow, paint outside that box, text lost to an ellipsis, a
// legitimate scroll container, and the number of lines the band element wrapped
// into. A story that renders several compositions at once (a fidelity matrix)
// therefore reports nothing for its sibling sections: the case's claim is about
// its own root. The allowlist is the device traps of the figma-to-code skill
// (`references/devices.md`): `.sr-only` subtrees (the class, including its
// container-variant `@container/…:sr-only` forms), closed `<details>`,
// `content-visibility: hidden`, `position: fixed` subtrees (anchored to the
// viewport, not the root) and elements whose own overflow scrolls. Without it a
// sweep reports mostly noise: the 2026-10-15 wave's first sweep reported 48
// "problems", 2 of them real. Inlined on purpose: a function handed to
// `page.evaluate` cannot close over module scope.
export type ProbeTreeNode = {
  depth: number
  tag: string
  className: string
  box?: { width: number; height: number }
  at?: { x: number; y: number }
  padding?: number[]
  gap?: number
}

// The DOM anatomy one line per element: the render-side counterpart of
// `parity source --compact`, so a review can read padding and gap without
// guessing selectors.
export function formatProbeTree(nodes: ProbeTreeNode[]): string {
  return nodes
    .map((node) => {
      const box = node.box ? `${node.box.width}x${node.box.height}` : "-"
      const at = node.at ? `@${node.at.x},${node.at.y}` : ""
      const pad = node.padding ? ` pad=${node.padding.join("/")}` : ""
      const gap = typeof node.gap === "number" ? ` gap=${node.gap}` : ""
      const name = node.className ? `.${node.className.split(" ").join(".")}` : ""
      return `${"  ".repeat(node.depth)}${node.tag}${name} ${box} ${at}${pad}${gap}`.trimEnd()
    })
    .join("\n")
}

export function probeFunction(
  input: {
    subjects?: Record<string, string>
    origin?: string
    bandRoot?: string
    tree?: { selector?: string; depth: number }
  } = {},
) {
  const subjects: Record<string, string> = input.subjects ?? {}
  const originSelector = input?.origin
  const bandSelector = input?.bandRoot
  const style = (element: Element | null) => {
    if (!element) return null
    const view = element.ownerDocument.defaultView
    if (!view) return null
    const computed = view.getComputedStyle(element)
    const box = element.getBoundingClientRect()
    // `at` stays the position relative to the story root (the historical
    // contract); `offset` is the position relative to the declared origin, which
    // is what the composition check compares.
    const storyBox = element.ownerDocument.querySelector("#storybook-root")?.getBoundingClientRect()
    const originBox = originSelector
      ? element.ownerDocument.querySelector(originSelector)?.getBoundingClientRect()
      : undefined
    const after = view.getComputedStyle(element, "::after")
    const expansion =
      after && after.content !== "none" && after.position === "absolute"
        ? {
            top: parseFloat(after.top) || 0,
            right: parseFloat(after.right) || 0,
            bottom: parseFloat(after.bottom) || 0,
            left: parseFloat(after.left) || 0,
          }
        : undefined
    const round = (value: number): number => Math.round(value * 100) / 100
    // `layout` and `visibleText` are the composition signature the scope check
    // compares (`viewport` vs `container`): a collapsed label changes
    // `visibleText`, a flipped axis changes `layout`, a re-composed band changes
    // the line count.
    const flexLike = computed.display.includes("flex")
    const layout = [
      computed.display,
      flexLike ? computed.flexDirection : "",
      flexLike && computed.flexWrap !== "nowrap" ? computed.flexWrap : "",
    ]
      .filter(Boolean)
      .join(" ")
    const visibleTextOf = (root: Element): number => {
      let text = ""
      const walk = (node: Node): void => {
        if (node.nodeType === 3) {
          text += node.textContent
          return
        }
        if (!(node instanceof Element)) return
        const ownView = node.ownerDocument.defaultView
        if (!ownView) return
        const own = ownView.getComputedStyle(node)
        if (own.display === "none" || own.visibility === "hidden") return
        if (/(^|\s|:)sr-only/.test(String(node.className ?? ""))) return
        for (const child of node.childNodes) walk(child)
      }
      walk(root)
      return text.trim().replace(/\s+/g, " ").length
    }
    return {
      box: { width: round(box.width), height: round(box.height) },
      at: storyBox
        ? { x: round(box.left - storyBox.left), y: round(box.top - storyBox.top) }
        : undefined,
      offset: originBox
        ? { left: round(box.left - originBox.left), top: round(box.top - originBox.top) }
        : undefined,
      padding: [
        parseFloat(computed.paddingTop),
        parseFloat(computed.paddingRight),
        parseFloat(computed.paddingBottom),
        parseFloat(computed.paddingLeft),
      ].map(round),
      gap: computed.gap === "normal" ? 0 : round(parseFloat(computed.gap)),
      // A container can carry two gaps (a grid or a flex row with a row gap
      // too); the source `layout.mode` decides which axis the diff compares.
      rowGap: computed.rowGap === "normal" ? undefined : round(parseFloat(computed.rowGap)),
      columnGap:
        computed.columnGap === "normal" ? undefined : round(parseFloat(computed.columnGap)),
      radius: round(parseFloat(computed.borderTopLeftRadius)),
      border: {
        width: round(parseFloat(computed.borderTopWidth)),
        color: computed.borderTopColor,
      },
      boxShadow: computed.boxShadow === "none" ? undefined : computed.boxShadow,
      background: computed.backgroundColor,
      color: computed.color,
      font: {
        size: round(parseFloat(computed.fontSize)),
        lineHeight: round(parseFloat(computed.lineHeight)),
        weight: Number(computed.fontWeight),
      },
      text: (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 200),
      visibleText: visibleTextOf(element),
      layout,
      childCount: element.children.length,
      expansion,
      scroll: { width: element.scrollWidth, height: element.scrollHeight },
    }
  }
  const output: Record<string, ReturnType<typeof style>> = {}
  for (const [key, selector] of Object.entries(subjects)) {
    output[key] = style(document.querySelector(selector))
  }
  const tree: ProbeTreeNode[] = []
  if (input.tree) {
    const start = document.querySelector(input.tree.selector ?? bandSelector ?? "#storybook-root")
    const walk = (element: Element, depth: number): void => {
      if (!input.tree || depth > input.tree.depth) return
      const measured = style(element)
      if (measured) {
        tree.push({
          depth,
          tag: element.tagName.toLowerCase(),
          className: String(element.className ?? "")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 3)
            .join(" "),
          box: measured.box,
          at: measured.at,
          padding: measured.padding,
          gap: measured.gap,
        })
      }
      for (const child of element.children) walk(child, depth + 1)
    }
    if (start) walk(start, 0)
  }
  return {
    subjects: output,
    responsive: responsiveBlock(bandSelector),
    ...(input.tree ? { tree } : {}),
  }

  function responsiveBlock(bandRootSelector: string | undefined) {
    const round = (value: number): number => Math.round(value * 100) / 100
    const scrollable: Array<{ selector: string; x: number; y: number; before: number }> = []
    const clipped: Array<{ selector: string; axis: string; hidden: number; client: number }> = []
    const escaped: Array<{ selector: string; edges: Record<string, number> }> = []
    const truncated: Array<{ selector: string; hidden: number; text: string }> = []
    const storyRoot = document.querySelector("#storybook-root")
    // The scan lives inside the box the case maps as its root: a story that
    // renders several compositions at once (a fidelity matrix) must not report
    // its sibling sections as overflow, and the case's claim is about that box.
    const root = (bandRootSelector && document.querySelector(bandRootSelector)) || storyRoot
    const bandRoot = root
    if (!root) return undefined
    const rootBox = root.getBoundingClientRect()
    const label = (element: Element, seen: Map<string, number>): string => {
      const own = element.getAttribute?.("data-slot")
      const classes = String(element.className ?? "")
        .split(/\s+/)
        .filter((name) => name && !name.includes("sr-only"))
        .slice(0, 2)
      const short = own
        ? `[data-slot="${own}"]`
        : `${element.tagName.toLowerCase()}${classes.map((name) => `.${name}`).join("")}`
      const count = (seen.get(short) ?? 0) + 1
      seen.set(short, count)
      return count > 1 ? `${short}#${count}` : short
    }
    const seen = new Map<string, number>()
    const paints = (element: Element, computed: CSSStyleDeclaration): boolean => {
      if (computed.backgroundImage !== "none") return true
      if (!/rgba?\([^)]*,\s*0\)$/.test(computed.backgroundColor)) return true
      if ((parseFloat(computed.borderTopWidth) || 0) > 0) return true
      return Boolean(element.textContent?.trim())
    }
    const walk = (element: Element, inside: { clipped: boolean; own: boolean }): void => {
      const view = element.ownerDocument.defaultView
      if (!view) return
      const computed = view.getComputedStyle(element)
      if (computed.display === "none" || computed.visibility === "hidden") return
      if (computed.contentVisibility === "hidden") return
      if (computed.position === "fixed") return
      if (/(^|\s|:)sr-only/.test(String(element.className ?? ""))) return
      if (element instanceof HTMLDetailsElement && !element.open) return
      const box = element.getBoundingClientRect()
      const selector = label(element, seen)
      // An own decoration is an absolutely positioned element that still
      // overlaps the box it is positioned against — the field's floating label
      // cutting its own top border, a notch badge. It is painted by design (and
      // the geometry check compares it wherever the case maps it), and so are
      // its descendants; escaped means the paint left the frame, like a
      // trailing action pushed out of its band.
      const offsetParentBox =
        element instanceof HTMLElement ? element.offsetParent?.getBoundingClientRect() : undefined
      const ownDecoration =
        inside.own ||
        Boolean(
          computed.position === "absolute" &&
          offsetParentBox &&
          box.left < offsetParentBox.right &&
          box.right > offsetParentBox.left &&
          box.top < offsetParentBox.bottom &&
          box.bottom > offsetParentBox.top,
        )
      const overflowX = computed.overflowX
      const overflowY = computed.overflowY
      const scrollsX = overflowX === "auto" || overflowX === "scroll"
      const scrollsY = overflowY === "auto" || overflowY === "scroll"
      const hiddenX = element.scrollWidth - element.clientWidth
      const hiddenY = element.scrollHeight - element.clientHeight
      if ((scrollsX || scrollsY) && (hiddenX > 1 || hiddenY > 1)) {
        // A legitimate scroll container: an advisory, never a clip. The first
        // child may sit before the scroll origin when the content is centred —
        // the `justify-center` + overflow trap, which makes the first item
        // unreachable.
        const first = [...element.children].find((child) => child.getBoundingClientRect().width > 0)
        const before = first ? Math.round(box.left - first.getBoundingClientRect().left) : 0
        scrollable.push({
          selector,
          x: Math.max(hiddenX, 0),
          y: Math.max(hiddenY, 0),
          before: before > 1 ? before : 0,
        })
      } else if (!inside.clipped) {
        {
          if (
            hiddenX > 1 &&
            (overflowX === "hidden" || overflowX === "clip") &&
            element.clientWidth > 0
          ) {
            clipped.push({
              selector,
              axis: "x",
              hidden: round(hiddenX),
              client: element.clientWidth,
            })
          }
          if (
            hiddenY > 1 &&
            (overflowY === "hidden" || overflowY === "clip") &&
            element.clientHeight > 0
          ) {
            clipped.push({
              selector,
              axis: "y",
              hidden: round(hiddenY),
              client: element.clientHeight,
            })
          }
          const edges = {
            left: round(rootBox.left - box.left),
            right: round(box.right - rootBox.right),
            top: round(rootBox.top - box.top),
            bottom: round(box.bottom - rootBox.bottom),
          }
          const outside = Object.fromEntries(
            Object.entries(edges)
              .filter(([, value]) => value > 1)
              .map(([key, value]) => [key, Math.round(value)]),
          )
          if (Object.keys(outside).length && paints(element, computed) && !ownDecoration) {
            escaped.push({ selector, edges: outside })
          }
          const textLeaf = [...element.childNodes].some(
            (node) => node.nodeType === 3 && (node.textContent ?? "").trim(),
          )
          if (
            textLeaf &&
            hiddenX > 1 &&
            (computed.textOverflow === "ellipsis" || computed.whiteSpace === "nowrap")
          ) {
            truncated.push({
              selector,
              hidden: round(hiddenX),
              text: element.textContent.trim().replace(/\s+/g, " ").slice(0, 60),
            })
          }
        }
      }
      for (const child of element.children) {
        walk(child, {
          clipped:
            inside.clipped ||
            scrollsX ||
            scrollsY ||
            overflowX === "hidden" ||
            overflowY === "hidden",
          own: ownDecoration,
        })
      }
    }
    walk(root, { clipped: false, own: false })
    const bandChildren = bandRoot
      ? [...bandRoot.children].filter((child) => {
          const view = bandRoot.ownerDocument.defaultView
          if (!view) return false
          const computed = view.getComputedStyle(child)
          if (computed.display === "none" || computed.visibility === "hidden") return false
          if (computed.position === "absolute" || computed.position === "fixed") return false
          if (/(^|\s|:)sr-only/.test(String(child.className ?? ""))) return false
          // A child with no box is not a line: an empty value slot in a flex
          // row is centred by `align-items` and must not read as a wrapped band.
          const box = child.getBoundingClientRect()
          return box.width > 0 && box.height > 0
        })
      : []
    // The lines are counted by **vertical overlap**, not by top position: two
    // children on one line share vertical space whatever their heights (a
    // centered 24px icon against a 46px column overlaps it: one line), while a
    // wrapped line starts below every rect of the line above (tens of pixels
    // for a real wrap, zero for a touching stack). A top-only reading counted a
    // centred mixed-height row as two lines — the false positive the Footer,
    // Cookies and Alert bands hit. A nowrap flex row is one line by definition.
    const bandView = bandRoot?.ownerDocument.defaultView
    const bandStyle = bandRoot && bandView ? bandView.getComputedStyle(bandRoot) : null
    const singleFlexLine = Boolean(
      bandStyle &&
      bandStyle.display.includes("flex") &&
      (bandStyle.flexDirection === "row" || bandStyle.flexDirection === "row-reverse") &&
      bandStyle.flexWrap === "nowrap",
    )
    const boxes = bandChildren
      .map((child) => child.getBoundingClientRect())
      .sort((a, b) => a.top - b.top)
    let lines = 0
    if (singleFlexLine && boxes.length) {
      lines = 1
    } else {
      let bottom = Number.NEGATIVE_INFINITY
      for (const box of boxes) {
        if (box.top >= bottom - 1) {
          lines += 1
          bottom = box.bottom
        } else {
          bottom = Math.max(bottom, box.bottom)
        }
      }
    }
    return {
      rows: lines,
      band: {
        selector: bandRoot ? label(bandRoot, new Map()) : undefined,
        children: bandChildren.length,
        rows: lines,
      },
      clipped,
      escaped,
      truncated,
      scrollable,
    }
  }
}

// The page-side preflight: the device scale, a 100px ruler (any CSS transform or
// preview zoom scales it) and the state evidence. Inlined on purpose: a function
// handed to `page.evaluate` cannot close over module scope.
export function capturePreflight({
  selector,
  expectState,
  evidence,
}: {
  selector: string
  expectState?: string
  evidence?: string
}) {
  const root = document.querySelector(selector)
  const ruler = document.createElement("div")
  ruler.style.cssText =
    "position:absolute;top:0;left:0;width:100px;height:100px;pointer-events:none;opacity:0"
  document.body.append(ruler)
  const rulerWidth = Math.round(ruler.getBoundingClientRect().width * 100) / 100
  ruler.remove()
  const control = ["input", "textarea", "select", "button"]
    .map((tag) => root?.querySelector(tag))
    .find(Boolean)
  const disabled = () =>
    Boolean(control?.matches?.(":disabled")) || control?.getAttribute("aria-disabled") === "true"
  const selection = () =>
    Boolean(
      root?.querySelector(
        "input:checked, [aria-checked='true'], [aria-selected='true'], [data-state='checked'], [data-state='selected']",
      ),
    )
  const value = () =>
    String(
      root?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        "input:not([type=checkbox]):not([type=radio]), textarea",
      )?.value ?? "",
    )
  const declared = evidence
    ? document.querySelector<HTMLInputElement | HTMLTextAreaElement>(evidence)
    : null
  const declaredHolds = () =>
    Boolean(
      String(declared?.value ?? "").trim() ||
      (declared?.textContent ?? "").trim() ||
      declared?.getAttribute("aria-checked") === "true" ||
      declared?.getAttribute("aria-selected") === "true" ||
      declared?.matches?.("[data-state='checked'], [data-state='selected']"),
    )
  let state
  if (expectState) {
    const fail = (detail: string) => ({ state: expectState, ok: false, detail })
    if (evidence && !declared) state = fail(`no element matches the declared evidence ${evidence}`)
    else if (evidence && declaredHolds()) state = { state: expectState, ok: true }
    else
      switch (expectState) {
        case "enabled":
          state =
            control && !disabled()
              ? { state: expectState, ok: true }
              : fail("no enabled control inside the story root")
          break
        case "disabled":
          state = disabled()
            ? { state: expectState, ok: true }
            : fail("the control is not disabled")
          break
        case "focused":
          state =
            root?.contains(document.activeElement) && document.activeElement !== document.body
              ? { state: expectState, ok: true }
              : fail("the active element is outside the story root")
          break
        case "filled":
          state =
            value().trim() || selection()
              ? { state: expectState, ok: true }
              : fail("no value or selection inside the story root")
          break
        case "empty":
          state =
            !value().trim() && !selection()
              ? { state: expectState, ok: true }
              : fail("a value or selection is present")
          break
        case "error":
          state = root?.querySelector("[aria-invalid='true'], [data-invalid], [role='alert']")
            ? { state: expectState, ok: true }
            : fail("no invalid or alert state inside the story root")
          break
        default:
          state = fail(
            `no built-in evidence for the state "${expectState}": pass an evidence selector`,
          )
      }
  }
  return {
    dpr: window.devicePixelRatio,
    rulerWidth,
    rootWidth: root ? Math.round(root.getBoundingClientRect().width * 100) / 100 : 0,
    state,
  }
}

// The module-side half of the preflight, pure so it is testable without a
// browser: an empty list means the capture is what the case claims.
export function captureChecks({
  probe,
  expectedWidth,
  checkWidth = true,
}: {
  probe: {
    dpr: number
    rulerWidth: number
    rootWidth: number
    state?: { ok?: boolean; detail?: string }
  }
  expectedWidth: number
  checkWidth?: boolean
}): Array<{ code: string; message: string }> {
  const failures: Array<{ code: string; message: string }> = []
  if (probe.dpr !== 1) {
    failures.push({
      code: "capture-mismatch",
      message: `devicePixelRatio is ${probe.dpr}: the probe reads CSS pixels only at 1`,
    })
  }
  if (Math.abs(probe.rulerWidth - RULER_WIDTH) > 0.5) {
    failures.push({
      code: "capture-mismatch",
      message: `the ${RULER_WIDTH}px ruler measures ${probe.rulerWidth}px: the preview canvas is scaled`,
    })
  }
  if (checkWidth && Math.abs(probe.rootWidth - expectedWidth) > WIDTH_TOLERANCE) {
    failures.push({
      code: "capture-mismatch",
      message: `the forced root measures ${probe.rootWidth}px against the requested ${expectedWidth}px`,
    })
  }
  if (probe.state && probe.state.ok === false) {
    failures.push({
      code: "state-mismatch",
      message: probe.state.detail ?? "the story is not in the declared state",
    })
  }
  return failures
}

export function rgbToHex(color: unknown): string | undefined {
  const source = typeof color === "string" ? color : ""
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(source)
  if (!match) return typeof color === "string" ? color : undefined
  return `#${[match[1], match[2], match[3]]
    .map((value) => Number(value).toString(16).padStart(2, "0"))
    .join("")}`
}

export type CaptureOptions = {
  storyId: string
  rootWidth: number
  viewport?: number
  viewportHeight?: number
  rootSelector?: string
  bandRoot?: string
  widthTarget?: string
  expectRootWidth?: boolean
  subjects?: Record<string, string>
  offsetOrigin?: string
  fill?: Array<[string, string]>
  click?: string[]
  focus?: string[]
  blur?: boolean
  keepFocus?: boolean
  expectState?: string
  stateEvidence?: string
  screenshot?: string
  tree?: { selector?: string; depth: number }
  baseUrl?: string
}

export async function capture({
  storyId,
  rootWidth,
  // The viewport follows the source frame width by default: the responsive
  // classes must resolve the way the source device does.
  viewport = rootWidth,
  // The frame height matters for full-height panels (a side drawer): the
  // default viewport is tall, a frame-bound case passes its artboard height.
  viewportHeight = 1400,
  rootSelector = DEFAULT_ROOT,
  // The element whose children carry the band structure (RA5): the case's own
  // root when it declares one, the story root otherwise.
  bandRoot,
  // The element that receives the forced width. The capture always forces the
  // **story root** (R1: never a component dimension); the scope probe (RA5)
  // forces the element the case maps as its root instead, because that is the
  // box the container query answers to.
  widthTarget,
  // The story root is the measured width reference; a probe that forces another
  // element skips that comparison on purpose.
  expectRootWidth = true,
  subjects = { field: rootSelector },
  // The element the offsets are measured from: the case's `--root` element by
  // default (the variant-root counterpart), or the declared `offsetOrigin`.
  offsetOrigin,
  fill = [],
  click = [],
  focus = [],
  blur = false,
  keepFocus = false,
  expectState,
  stateEvidence,
  screenshot,
  tree,
  baseUrl = STORYBOOK_URL,
}: CaptureOptions): Promise<Record<string, unknown>> {
  const { chromium } = await import("playwright")
  const browser = await chromium.launch()
  // The offsets are measured from the declared origin, or from the story root
  // when the case does not name one.
  const origin =
    typeof offsetOrigin === "string" && offsetOrigin.trim() ? offsetOrigin : rootSelector
  try {
    const page = await browser.newPage({
      viewport: {
        width: Math.max(320, Number(viewport) || 1400),
        height: Number(viewportHeight) || 1400,
      },
      // The article's lesson: a device scale factor other than 1 makes every
      // measured CSS pixel ambiguous in the PNG.
      deviceScaleFactor: 1,
    })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto(`${baseUrl}/iframe.html?id=${storyId}&viewMode=story`, {
      waitUntil: "networkidle",
    })
    await page.waitForSelector(rootSelector, { timeout: 15000 })
    await page.addStyleTag({ content: DISABLE_MOTION_CSS })
    await page.evaluate(
      ({ selector, width }) => {
        const root = document.querySelector(selector)
        if (!(root instanceof HTMLElement)) return
        root.style.width = `${width}px`
        root.style.maxWidth = "none"
        root.style.padding = "0"
        root.style.boxSizing = "border-box"
        root.style.display = "block"
      },
      { selector: widthTarget ?? rootSelector, width: rootWidth },
    )
    await page.evaluate(() => document.fonts.ready)
    for (const [selector, value] of fill) await page.fill(selector, value)
    for (const selector of click) await page.click(selector)
    for (const selector of focus) await page.focus(selector)
    // Blurring is the default (a focused control keeps a ring the source frame
    // may not have); a case that declares an interaction state keeps it, and
    // `--keep-focus` opts out explicitly.
    if (!keepFocus && (blur || focus.length === 0)) {
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      })
    }
    // Park the pointer: a hover left by the last click is part of the capture.
    await page.mouse.move(0, 0)
    await page.waitForTimeout(250)
    const preflight = await page.evaluate(capturePreflight, {
      selector: rootSelector,
      expectState,
      evidence: stateEvidence,
    })
    const failures = captureChecks({
      probe: preflight,
      expectedWidth: Number(rootWidth),
      checkWidth: expectRootWidth,
    })
    if (failures.length) {
      throw new CaptureError(
        failures[0].code,
        failures.map((failure) => failure.message).join("; "),
      )
    }
    if (screenshot) {
      fs.mkdirSync(path.dirname(screenshot), { recursive: true })
      await page.screenshot({ path: screenshot, fullPage: true })
    }
    const subjectsProbe = await page.evaluate(probeFunction, {
      subjects,
      origin,
      bandRoot: typeof bandRoot === "string" && bandRoot.trim() ? bandRoot : rootSelector,
      ...(tree ? { tree } : {}),
    })
    return {
      schemaVersion: SCHEMA_VERSION,
      storyId,
      rootWidth,
      capture: {
        dpr: preflight.dpr,
        rulerWidth: preflight.rulerWidth,
        rootWidth: preflight.rootWidth,
        viewport: {
          width: Math.max(320, Number(viewport) || 1400),
          height: Number(viewportHeight) || 1400,
        },
        reducedMotion: "reduce",
        focus: keepFocus || focus.length > 0 ? "kept" : "blurred",
        offsetOrigin: origin,
        state: preflight.state,
      },
      subjects: subjectsProbe.subjects,
      responsive: subjectsProbe.responsive,
      ...(tree ? { tree: subjectsProbe.tree } : {}),
    }
  } finally {
    await browser.close()
  }
}

function parsePairs(values: string[]): Array<[string, string]> {
  return values.map((value) => {
    const index = value.indexOf("=")
    if (index < 0) throw new Error(`${value}: expected key=value`)
    return [value.slice(0, index), value.slice(index + 1)]
  })
}

function stringFlag(flags: Map<string, string | boolean>, name: string): string | undefined {
  const value = flags.get(name)
  return typeof value === "string" ? value : undefined
}

export function renderCli(argv: string[] = process.argv.slice(2)): void {
  const flags = new Map<string, string | boolean>()
  const subjects: string[] = []
  const fill: string[] = []
  const click: string[] = []
  const focus: string[] = []
  let blur = false
  let keepFocus = false
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--subject") subjects.push(argv[++index])
    else if (arg === "--fill") fill.push(argv[++index])
    else if (arg === "--click") click.push(argv[++index])
    else if (arg === "--focus") focus.push(argv[++index])
    else if (arg === "--blur") blur = true
    else if (arg === "--keep-focus") keepFocus = true
    else flags.set(arg.replace(/^--/, ""), argv[++index] ?? true)
  }
  const storyId = flags.get("story")
  if (typeof storyId !== "string" || !storyId) {
    console.error("usage: node src/cli.ts parity render --story <storyId> [--width N] [--tree]")
    process.exit(2)
  }
  const rootSelector = stringFlag(flags, "root") ?? DEFAULT_ROOT
  const tree = flags.has("tree")
  capture({
    storyId,
    rootWidth: Number(flags.get("width") ?? 274),
    viewport: Number(flags.get("viewport") ?? flags.get("width") ?? 274),
    viewportHeight: Number(flags.get("height") ?? 1400),
    rootSelector,
    subjects: subjects.length ? Object.fromEntries(parsePairs(subjects)) : { field: DEFAULT_ROOT },
    offsetOrigin: stringFlag(flags, "offset-origin"),
    fill: parsePairs(fill),
    click,
    focus,
    blur,
    keepFocus,
    expectState: stringFlag(flags, "expect-state"),
    stateEvidence: stringFlag(flags, "state-evidence"),
    screenshot: stringFlag(flags, "screenshot"),
    tree: tree ? { selector: rootSelector, depth: Number(flags.get("depth") ?? 4) } : undefined,
  })
    .then((probe) => {
      if (tree) console.log(formatProbeTree(Array.isArray(probe.tree) ? probe.tree : []))
      else console.log(JSON.stringify(probe, null, 2))
    })
    .catch((error) => {
      console.error(error.message)
      // A capture or state mismatch is missing evidence (exit 2), not a delta.
      if (error instanceof CaptureError || error.message.includes("ECONNREFUSED")) process.exit(2)
      else process.exit(1)
    })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  enterRoot()
  renderCli()
}
