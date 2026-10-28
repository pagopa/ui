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

interface Scope {
  mode: "all" | "stories"
  stories?: string[]
}

const index: { entries: Record<string, IndexEntry> } = JSON.parse(
  readFileSync(new URL("../dist/index.json", import.meta.url), "utf8"),
)

// The scope of this run: `VISUAL_SCOPE` names the file `ui-cli test visual`
// wrote, which limits a pull request to the stories its diff can move. Without
// it — the nightly, a manual run, a baseline update — the run is complete.
// A relative path is read from the repository root, where the command wrote it.
function storyScope(): Set<string> | null {
  const file = process.env.VISUAL_SCOPE
  if (!file) return null
  const fromRoot = new URL(`../../../${file}`, import.meta.url)
  const scope: Scope = JSON.parse(readFileSync(file.startsWith("/") ? file : fromRoot, "utf8"))
  return scope.mode === "stories" ? new Set(scope.stories ?? []) : null
}

const scope = storyScope()

const stories = Object.values(index.entries)
  .filter((entry) => entry.type === "story" && !(entry.tags ?? []).includes("no-visual"))
  .filter((entry) => scope === null || scope.has(entry.id))
  .sort((a, b) => a.id.localeCompare(b.id))

console.log(
  scope === null
    ? `visual: the complete catalogue, ${stories.length} stories`
    : `visual: ${stories.length} stories of the diff's scope`,
)

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
