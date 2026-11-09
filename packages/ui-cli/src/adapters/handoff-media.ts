import fs from "node:fs"
import path from "node:path"
import type { ExternalCommand } from "./handoff.ts"

export type MediaCaptureInput = {
  baseUrl: string
  storyId: string
  width: number
  viewport: number
  height: number
  selector: string
  focus: boolean
  screenshot: string
}

export type MediaCaptureResult = {
  screenshot: string
  box: { x: number; y: number; width: number; height: number }
}

export async function captureHandoffFrame(input: MediaCaptureInput): Promise<MediaCaptureResult> {
  const { chromium } = await import("playwright")
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({
      viewport: { width: Math.max(320, input.viewport), height: input.height },
      deviceScaleFactor: 2,
    })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto(
      `${input.baseUrl}/iframe.html?id=${encodeURIComponent(input.storyId)}&viewMode=story`,
      {
        waitUntil: "networkidle",
      },
    )
    await page.waitForSelector(input.selector, { timeout: 15000 })
    if (input.focus) await page.keyboard.press("Tab")
    await page.evaluate(() => document.fonts.ready)
    const element = page.locator(input.selector).first()
    const box = await element.boundingBox()
    if (!box || box.width <= 0 || box.height <= 0)
      throw new Error(`cannot measure handoff clip ${input.selector}`)
    fs.mkdirSync(path.dirname(input.screenshot), { recursive: true })
    await page.screenshot({
      path: input.screenshot,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
      scale: "device",
    })
    return { screenshot: input.screenshot, box }
  } finally {
    await browser.close()
  }
}

export type MediaGit = ExternalCommand
