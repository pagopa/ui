import { defineConfig } from "@playwright/test"

const port = process.env.VISUAL_PORT ?? 6201
const baseURL = `http://localhost:${port}`
// Baselines live next to the suite; a host run can point VISUAL_SNAPSHOT_DIR
// elsewhere, because only Linux baselines are committed.
const snapshots = process.env.VISUAL_SNAPSHOT_DIR ?? "{testDir}/__screenshots__"

export default defineConfig({
  testDir: ".",
  testMatch: "visual.spec.ts",
  outputDir: "test-results",
  fullyParallel: true,
  workers: process.env.CI ? 4 : 2,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  snapshotPathTemplate: `${snapshots}/{arg}{ext}`,
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 0,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    colorScheme: "light",
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
    trace: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "node serve.mjs",
    url: `${baseURL}/index.json`,
    reuseExistingServer: !process.env.CI,
  },
})
