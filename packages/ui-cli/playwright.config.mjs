import { defineConfig } from "@playwright/test"

// Consumer specs for the packed artifact: src/checks/library.ts builds and serves
// the isolated application and passes its URL through CONSUMER_URL, so the
// config only declares the engine projects and the runner policy. One retry
// absorbs load-related flakiness of the long native-flow sequence.
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "library.spec.mjs",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  // The native flow runs for two to three minutes on a cold engine, so the
  // budget sits above the slowest browser: a slow runner must fail an
  // assertion, not the clock.
  timeout: 300_000,
  reporter: [["list"]],
  use: { baseURL: process.env.CONSUMER_URL },
  projects: [
    // The headless shell never reports the tab a modifier or middle click
    // opens: the tab exists and navigates, the context `page` event never
    // arrives, and a test that waits for it hangs until its deadline. The full
    // Chromium build (the `chromium` channel, installed with `playwright
    // install chromium`) reports it, so the chromium project runs on that.
    { name: "chromium", use: { browserName: "chromium", channel: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
})
