import fs from "node:fs"
import path from "node:path"
import type { Page } from "playwright"
import { UsageError } from "../lib/command.ts"
import {
  captureChecks,
  CaptureError,
  capturePreflight,
  DEFAULT_ROOT,
  DISABLE_MOTION_CSS,
  probeFunction,
  SCHEMA_VERSION,
  SOURCE_FRAME_ATTRIBUTE,
  sourceFrameReport,
  STORYBOOK_URL,
  type CaptureOptions,
  type SourceFrameReport,
} from "../parity/render.ts"
import { probeScript } from "./dom-probe.ts"

export async function storybookAnswers(baseUrl = STORYBOOK_URL): Promise<boolean> {
  try {
    return (await fetch(`${baseUrl}/index.json`, { signal: AbortSignal.timeout(3000) })).ok
  } catch {
    return false
  }
}
async function readSourceFrames(
  page: { evaluate: <T>(fn: (attribute: string) => T, attribute: string) => Promise<T> },
  expected: number[],
  { storyId, waived }: { storyId: string; waived: boolean },
): Promise<SourceFrameReport> {
  const drawn = await page.evaluate((attribute: string) => {
    return [...document.querySelectorAll(`[${attribute}]`)].map((element) => ({
      declared: Number(element.getAttribute(attribute)) || 0,
      measured: Math.round(element.getBoundingClientRect().width),
    }))
  }, SOURCE_FRAME_ATTRIBUTE)
  return sourceFrameReport({ drawn, expected, waived, storyId })
}

export async function capture(input: CaptureOptions): Promise<Record<string, unknown>> {
  const options = normalizedCapture(input)
  const {
    rootWidth,
    viewport,
    viewportHeight,
    rootSelector,
    bandRoot,
    expectRootWidth,
    subjects,
    offsetOrigin,
    expectState,
    stateEvidence,
    screenshot,
    tree,
  } = options
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
    const frame = await preparePage(page, options)
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
    return capturedReport(options, origin, preflight, subjectsProbe, frame)
  } catch (error) {
    if (error instanceof Error && /CONNECTION_REFUSED|ECONNREFUSED/.test(error.message))
      throw new UsageError(error.message)
    throw error
  } finally {
    await browser.close()
  }
}

function normalizedCapture({
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
  expectFrames,
  frameWaiver = false,
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
}: CaptureOptions) {
  return {
    storyId,
    rootWidth,
    viewport,
    viewportHeight,
    rootSelector,
    bandRoot,
    widthTarget,
    expectRootWidth,
    expectFrames,
    frameWaiver,
    subjects,
    offsetOrigin,
    fill,
    click,
    focus,
    blur,
    keepFocus,
    expectState,
    stateEvidence,
    screenshot,
    tree,
    baseUrl,
  }
}

async function preparePage(page: Page, options: ReturnType<typeof normalizedCapture>) {
  const {
    storyId,
    rootWidth,
    rootSelector,
    widthTarget,
    expectFrames,
    frameWaiver,
    fill,
    click,
    focus,
    blur,
    keepFocus,
    expectState,
    stateEvidence,
    baseUrl,
  } = options
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(`${baseUrl}/iframe.html?id=${storyId}&viewMode=story`, {
    waitUntil: "networkidle",
  })
  await page.waitForSelector(rootSelector, { timeout: 15000 })
  await page.addScriptTag({ content: probeScript() })
  await page.addStyleTag({ content: DISABLE_MOTION_CSS })
  // The story's own frame, read before the capture forces anything: a
  // container-scoped story that declares none renders narrow in Storybook
  // while the forced capture measures the source width.
  const frame = expectFrames?.length
    ? await readSourceFrames(page, expectFrames, { storyId, waived: frameWaiver })
    : undefined
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
  const hoverTarget =
    expectState === "hover" && stateEvidence?.endsWith(":hover")
      ? stateEvidence.slice(0, -":hover".length)
      : undefined
  if (hoverTarget) {
    await page.hover(hoverTarget)
  } else {
    await page.mouse.move(0, 0)
  }
  await page.waitForTimeout(250)
  return frame
}

function capturedReport(
  options: ReturnType<typeof normalizedCapture>,
  origin: string,
  preflight: ReturnType<typeof capturePreflight>,
  subjectsProbe: ReturnType<typeof probeFunction>,
  frame: SourceFrameReport | undefined,
): Record<string, unknown> {
  const { storyId, rootWidth, viewport, viewportHeight, keepFocus, focus, tree } = options
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
    ...(frame ? { frame } : {}),
    ...(tree ? { tree: subjectsProbe.tree } : {}),
  }
}
