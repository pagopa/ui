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
  timeout: 180_000,
  reporter: [["list"]],
  use: { baseURL: process.env.CONSUMER_URL },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
})
