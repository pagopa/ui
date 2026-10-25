import { readFileSync } from "node:fs"

import { expect, test } from "@playwright/test"

// Every story of the built Storybook, at the three widths of the design
// system's breakpoints. Baselines are produced only on Linux, by CI.
const WIDTHS = [320, 600, 1200] as const
const HEIGHT = 900

// Stories that cannot settle in two consecutive runs; each one carries the
// cause that kept it out of the gate.
const UNSTABLE = new Set<string>([])

interface IndexEntry {
  id: string
  type: string
  tags?: string[]
}

interface StorybookRender {
  currentRender?: { phase?: string }
}

declare global {
  interface Window {
    __STORYBOOK_PREVIEW__?: StorybookRender
  }
}

const index: { entries: Record<string, IndexEntry> } = JSON.parse(
  readFileSync(new URL("../dist/index.json", import.meta.url), "utf8"),
)

const stories = Object.values(index.entries)
  .filter((entry) => entry.type === "story" && !(entry.tags ?? []).includes("no-visual"))
  .sort((a, b) => a.id.localeCompare(b.id))

for (const story of stories) {
  test.describe(story.id, () => {
    test.skip(UNSTABLE.has(story.id), "unstable render: see UNSTABLE in visual.spec.ts")

    for (const width of WIDTHS) {
      test(`${story.id} @${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: HEIGHT })
        await page.clock.install({ time: new Date("2025-01-15T10:00:00+01:00") })

        await page.goto(`/iframe.html?id=${story.id}&viewMode=story`)

        await page.evaluate(() => document.fonts.ready.then(() => undefined))

        // The story is ready when its render reached a terminal phase; the
        // store reports "finished" after the play function and the cleanup.
        const handle = await page.waitForFunction(
          () => {
            const phase = window.__STORYBOOK_PREVIEW__?.currentRender?.phase
            const settled = ["completed", "played", "finished", "errored", "aborted"]
            return phase && settled.includes(phase) ? phase : false
          },
          undefined,
          { timeout: 30_000, polling: 100 },
        )
        const phase = await handle.jsonValue()
        if (phase === "errored" || phase === "aborted") {
          throw new Error(`Story ${story.id} did not render: phase "${phase}"`)
        }

        await page.waitForLoadState("networkidle")

        await expect(page).toHaveScreenshot(`${story.id}-${width}.png`, { fullPage: true })
      })
    }
  })
}
