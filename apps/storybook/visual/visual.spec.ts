import { readFileSync } from "node:fs"

import { expect, test } from "@playwright/test"

import {
  selectedVisualStories,
  UNSTABLE_VISUAL_STORIES,
  visualSnapshotName,
  VISUAL_WIDTHS,
} from "../../../packages/ui-cli/src/test/visual-cases.ts"

// Every story of the built Storybook, at the three widths of the design
// system's breakpoints. Baselines are produced only on Linux, by CI.
const HEIGHT = 900

interface IndexEntry {
  id?: string
  type: string
  tags?: string[]
}

interface StorybookRender {
  currentRender?: { id?: string; phase?: string }
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

const stories = selectedVisualStories(index.entries, scope)

console.log(
  scope === null
    ? `visual: the complete catalogue, ${stories.length} stories`
    : `visual: ${stories.length} stories of the diff's scope`,
)

for (const story of stories) {
  test.describe(story, () => {
    test.skip(UNSTABLE_VISUAL_STORIES.has(story), "unstable render: see UNSTABLE_VISUAL_STORIES")

    for (const width of VISUAL_WIDTHS) {
      test(`${story} @${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: HEIGHT })
        await page.clock.install({ time: new Date("2025-01-15T10:00:00+01:00") })
        await page.goto(`/iframe.html?id=${story}&viewMode=story`)

        await page.evaluate(() => document.fonts.ready.then(() => undefined))

        // "finished" follows the play function and its cleanup, so the
        // captured page includes the final interactive state.
        const handle = await page.waitForFunction(
          (storyId) => {
            const render = window.__STORYBOOK_PREVIEW__?.currentRender
            if (render?.id !== storyId) return false
            const phase = render.phase
            const settled = ["finished", "errored", "aborted"]
            return phase && settled.includes(phase) ? phase : false
          },
          story,
          { timeout: 30_000, polling: 100 },
        )
        const phase = await handle.jsonValue()
        if (phase === "errored" || phase === "aborted") {
          throw new Error(`Story ${story} did not render: phase "${phase}"`)
        }

        await page.waitForLoadState("networkidle")

        await expect(page).toHaveScreenshot(visualSnapshotName(story, width), { fullPage: true })
      })
    }
  })
}
