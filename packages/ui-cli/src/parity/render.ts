import { UsageError } from "../lib/command.ts"
export { capture } from "../adapters/storybook.ts"
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

export const STORYBOOK_URL = "http://localhost:6006"
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
export class CaptureError extends UsageError {
  readonly code: string

  constructor(code: string, message: string) {
    super(`${code}: ${message}`)
    this.name = "CaptureError"
    this.code = code
  }
}

const RULER_WIDTH = 100
const WIDTH_TOLERANCE = 2

// The marker a story puts on the element that draws its source width
// (`apps/storybook/src/support/source-frame.tsx`): the capture forces that width,
// so the story has to declare it too or the reader sees another composition.
export const SOURCE_FRAME_ATTRIBUTE = "data-source-frame"

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

export { capturePreflight, probeFunction } from "../adapters/dom-probe.ts"

// The story's own source frame, read before the capture forces the width: the
// element a story marks with `data-source-frame` must measure the width it
// declares, and at least one of those widths must be a case width of the node.
// A story that marks none collapses for every reader (the global `centered`
// layout shrinks the root to a few pixels) while the forced capture still
// measures the source composition: the two renders are different components.
export type SourceFrameReport = {
  drawn: Array<{ declared: number; measured: number }>
  expected: number[]
  ok: boolean
  waived?: boolean
}

export function sourceFrameReport({
  drawn,
  expected,
  waived = false,
  storyId,
}: {
  drawn: Array<{ declared: number; measured: number }>
  expected: number[]
  waived?: boolean
} & { storyId: string }): SourceFrameReport {
  const ok =
    drawn.length > 0 &&
    drawn.some((frame) =>
      expected.some((width) => Math.abs(frame.declared - width) <= WIDTH_TOLERANCE),
    )
  if (ok) return { drawn, expected, ok }
  const message =
    drawn.length === 0
      ? `${storyId} draws no source frame (${SOURCE_FRAME_ATTRIBUTE}) at ${expected.join(" or ")}px: wrap the composition in \`SourceFrame\` (apps/storybook/src/support/source-frame.tsx) so the Storybook render is the composition the capture measures`
      : `${storyId} draws its source frame at ${drawn.map((frame) => frame.declared).join(", ")}px against the case ${expected.join(" or ")}px`
  if (!waived) throw new CaptureError("story-collapsed", message)
  return { drawn, expected, ok, waived: true }
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
  // The widths the story must draw itself (the container-scoped case widths of
  // its node). The capture forces `rootWidth` regardless, so a story without a
  // frame passes here and collapses for every reader: `story-collapsed` is that
  // disagreement, and a waived story reports it instead of throwing.
  expectFrames?: number[]
  frameWaiver?: boolean
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
