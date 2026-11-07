import type { Responsive } from "../parity/diff.ts"
import type { ProbeTreeNode } from "../parity/render.ts"

export type ProbeInput = {
  subjects?: Record<string, string>
  origin?: string
  bandRoot?: string
  tree?: { selector?: string; depth: number }
}
type ResponsiveScan = {
  rootBox: DOMRect
  seen: Map<string, number>
  scrollable: NonNullable<Responsive["scrollable"]>
  clipped: NonNullable<Responsive["clipped"]>
  escaped: NonNullable<Responsive["escaped"]>
  truncated: NonNullable<Responsive["truncated"]>
}
declare global {
  var __pagopaProbe: typeof probeDom
  var __pagopaPreflight: typeof preflightDom
}
const round = (value: number): number => Math.round(value * 100) / 100

export function probeFunction(input: ProbeInput = {}) {
  return globalThis.__pagopaProbe(input)
}
export function capturePreflight(input: Parameters<typeof preflightDom>[0]) {
  return globalThis.__pagopaPreflight(input)
}
function probeDom(input: ProbeInput = {}) {
  const subjects = input.subjects ?? {}
  const output: Record<string, ReturnType<typeof style>> = {}
  for (const [key, selector] of Object.entries(subjects)) {
    output[key] = style(document.querySelector(selector), input.origin)
  }
  const tree: ProbeTreeNode[] = []
  if (input.tree) {
    const start = document.querySelector(input.tree.selector ?? input.bandRoot ?? "#storybook-root")
    const walk = (element: Element, depth: number): void => {
      if (!input.tree || depth > input.tree.depth) return
      const measured = style(element, input.origin)
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
    responsive: responsiveBlock(input.bandRoot),
    ...(input.tree ? { tree } : {}),
  }
}

function style(element: Element | null, originSelector?: string) {
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
    columnGap: computed.columnGap === "normal" ? undefined : round(parseFloat(computed.columnGap)),
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

function visibleTextOf(root: Element): number {
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

function label(element: Element, seen: Map<string, number>): string {
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

function paints(element: Element, computed: CSSStyleDeclaration): boolean {
  if (computed.backgroundImage !== "none") return true
  if (!/rgba?\([^)]*,\s*0\)$/.test(computed.backgroundColor)) return true
  if ((parseFloat(computed.borderTopWidth) || 0) > 0) return true
  return Boolean(element.textContent?.trim())
}

function responsiveBlock(bandRootSelector: string | undefined) {
  const storyRoot = document.querySelector("#storybook-root")
  const root = (bandRootSelector && document.querySelector(bandRootSelector)) || storyRoot
  if (!root) return undefined
  const scan: ResponsiveScan = {
    rootBox: root.getBoundingClientRect(),
    seen: new Map(),
    scrollable: [],
    clipped: [],
    escaped: [],
    truncated: [],
  }
  walkResponsive(root, { clipped: false, own: false }, scan)
  const band = bandRows(root)
  return {
    rows: band.rows,
    band,
    clipped: scan.clipped,
    escaped: scan.escaped,
    truncated: scan.truncated,
    scrollable: scan.scrollable,
  }
}

function walkResponsive(
  element: Element,
  inside: { clipped: boolean; own: boolean },
  scan: ResponsiveScan,
): void {
  const view = element.ownerDocument.defaultView
  if (!view) return
  const computed = view.getComputedStyle(element)
  if (computed.display === "none" || computed.visibility === "hidden") return
  if (computed.contentVisibility === "hidden") return
  if (computed.position === "fixed") return
  if (/(^|\s|:)sr-only/.test(String(element.className ?? ""))) return
  if (element instanceof HTMLDetailsElement && !element.open) return
  const box = element.getBoundingClientRect()
  const selector = label(element, scan.seen)
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
  const next = recordOverflow(element, computed, box, selector, ownDecoration, inside, scan)
  for (const child of element.children) {
    walkResponsive(child, next, scan)
  }
}

function recordOverflow(
  element: Element,
  computed: CSSStyleDeclaration,
  box: DOMRect,
  selector: string,
  ownDecoration: boolean,
  inside: { clipped: boolean; own: boolean },
  scan: ResponsiveScan,
) {
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
    scan.scrollable.push({
      selector,
      x: Math.max(hiddenX, 0),
      y: Math.max(hiddenY, 0),
      before: before > 1 ? before : 0,
    })
  } else if (!inside.clipped) {
    recordClipping(element, computed, box, selector, ownDecoration, hiddenX, hiddenY, scan)
  }
  return {
    clipped:
      inside.clipped || scrollsX || scrollsY || overflowX === "hidden" || overflowY === "hidden",
    own: ownDecoration,
  }
}

function recordClipping(
  element: Element,
  computed: CSSStyleDeclaration,
  box: DOMRect,
  selector: string,
  ownDecoration: boolean,
  hiddenX: number,
  hiddenY: number,
  scan: ResponsiveScan,
) {
  {
    if (
      hiddenX > 1 &&
      (computed.overflowX === "hidden" || computed.overflowX === "clip") &&
      element.clientWidth > 0
    ) {
      scan.clipped.push({
        selector,
        axis: "x",
        hidden: round(hiddenX),
        client: element.clientWidth,
      })
    }
    if (
      hiddenY > 1 &&
      (computed.overflowY === "hidden" || computed.overflowY === "clip") &&
      element.clientHeight > 0
    ) {
      scan.clipped.push({
        selector,
        axis: "y",
        hidden: round(hiddenY),
        client: element.clientHeight,
      })
    }
    const edges = {
      left: round(scan.rootBox.left - box.left),
      right: round(box.right - scan.rootBox.right),
      top: round(scan.rootBox.top - box.top),
      bottom: round(box.bottom - scan.rootBox.bottom),
    }
    const outside = Object.fromEntries(
      Object.entries(edges)
        .filter(([, value]) => value > 1)
        .map(([key, value]) => [key, Math.round(value)]),
    )
    if (Object.keys(outside).length && paints(element, computed) && !ownDecoration) {
      scan.escaped.push({ selector, edges: outside })
    }
    const textLeaf = [...element.childNodes].some(
      (node) => node.nodeType === 3 && (node.textContent ?? "").trim(),
    )
    if (
      textLeaf &&
      hiddenX > 1 &&
      (computed.textOverflow === "ellipsis" || computed.whiteSpace === "nowrap")
    ) {
      scan.truncated.push({
        selector,
        hidden: round(hiddenX),
        text: element.textContent.trim().replace(/\s+/g, " ").slice(0, 60),
      })
    }
  }
}

function bandRows(root: Element) {
  const bandChildren = root
    ? [...root.children].filter((child) => {
        const view = root.ownerDocument.defaultView
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
  const bandView = root?.ownerDocument.defaultView
  const bandStyle = root && bandView ? bandView.getComputedStyle(root) : null
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
  return { selector: label(root, new Map()), children: bandChildren.length, rows: lines }
}

function preflightDom({
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
  const state = captureState(root, expectState, evidence)
  return {
    dpr: window.devicePixelRatio,
    rulerWidth,
    rootWidth: root ? Math.round(root.getBoundingClientRect().width * 100) / 100 : 0,
    state,
  }
}

function captureState(
  root: Element | null,
  expectState: string | undefined,
  evidence: string | undefined,
) {
  const control = ["input", "textarea", "select", "button"]
    .map((tag) => root?.querySelector(tag))
    .find(Boolean)
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
    else state = builtInState(root, control, expectState)
  }
  return state
}

// Install named page-side functions before evaluating the probe. Serializing
// this fixed bundle keeps each browser function independent of module scope.
export function probeScript(): string {
  const functions = [
    round,
    style,
    visibleTextOf,
    label,
    paints,
    responsiveBlock,
    walkResponsive,
    recordOverflow,
    recordClipping,
    bandRows,
    probeDom,
    preflightDom,
    captureState,
    builtInState,
  ]
  const declarations = functions
    .map((fn) =>
      fn.toString().startsWith("function") ? fn.toString() : `const round = ${fn.toString()}`,
    )
    .join(";\n")
  return `${declarations};globalThis.__pagopaProbe=probeDom;globalThis.__pagopaPreflight=preflightDom;`
}

function builtInState(
  root: Element | null,
  control: Element | null | undefined,
  expectState: string,
) {
  const fail = (detail: string) => ({ state: expectState, ok: false, detail })
  let state
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
  switch (expectState) {
    case "enabled":
      state =
        control && !disabled()
          ? { state: expectState, ok: true }
          : fail("no enabled control inside the story root")
      break
    case "disabled":
      state = disabled() ? { state: expectState, ok: true } : fail("the control is not disabled")
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
    case "open": {
      const openSelector = "[aria-expanded='true'], [data-state='open'], [open]"
      state =
        root?.matches(openSelector) || root?.querySelector(openSelector)
          ? { state: expectState, ok: true }
          : fail("no open control inside the story root")
      break
    }
    case "error":
      state = root?.querySelector("[aria-invalid='true'], [data-invalid], [role='alert']")
        ? { state: expectState, ok: true }
        : fail("no invalid or alert state inside the story root")
      break
    default:
      state = fail(`no built-in evidence for the state "${expectState}": pass an evidence selector`)
  }
  return state
}
