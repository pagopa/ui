/// <reference types="vitest/config" />
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vite"

const dirname = path.dirname(fileURLToPath(import.meta.url))
// The stories document the design system, so the alias and the coverage
// surface point at the package they document.
const packageRoot = path.resolve(dirname, "../../packages/pagopa-ui")

// The browser projects run the stories; the package keeps the design system
// build and its unit project.
export default defineConfig(({ mode }) => ({
  base: "./",
  envDir: false,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(packageRoot, "src"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // The documented components live in packages/pagopa-ui.
      allowExternal: true,
      include: [`${packageRoot}/src/components/**/*.{ts,tsx}`],
      exclude: [`${packageRoot}/src/components/templates/**`, "**/*.stories.*"],
      // Ratchet policy: thresholds follow current coverage with a small margin
      // and never go down. Raise them as new stories land (see CONTRIBUTING).
      thresholds: {
        statements: 90,
        branches: 83,
        functions: 90,
        lines: 90,
        "**/src/components/inputs/{autocomplete,select-field,drag-and-drop}.tsx": {
          perFile: true,
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        "**/src/components/inputs/field-utils.ts": {
          statements: 100,
          branches: 85,
          functions: 100,
          lines: 100,
        },
        "**/src/components/primitives/form-control-utils.ts": {
          statements: 100,
          branches: 85,
          functions: 100,
          lines: 100,
        },
        "**/src/components/primitives/button.tsx": {
          statements: 95,
          branches: 90,
          functions: 100,
          lines: 95,
        },
        "**/src/components/{inputs/date-picker,ui/calendar}.tsx": {
          perFile: true,
          statements: 95,
          branches: 90,
          functions: 100,
          lines: 95,
        },
      },
    },
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin runs the stories defined in the Storybook config of this
          // application (see .storybook/main.ts).
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          // The icon/pictogram catalogue renders every source variant; the
          // 30s cap was not enough for that story on Firefox when the machine
          // is busy, and a timeout is a false alarm, not a defect.
          testTimeout: 60000,
          // The shared accessibility contract (src/support/a11y-contract.ts)
          // runs from this setup file's afterEach.
          setupFiles: [
            path.join(dirname, "src/support/queries-setup.ts"),
            path.join(dirname, "src/support/a11y-setup.ts"),
          ],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            // The coverage pass runs Chromium only (v8 coverage is not collected
            // in Firefox and WebKit); the fast pass runs the other two engines,
            // so every story still executes in the three browsers without a
            // duplicated Chromium run.
            instances:
              mode === "coverage"
                ? [{ browser: "chromium" }]
                : [{ browser: "firefox" }, { browser: "webkit" }],
          },
        },
      },
      {
        extends: true,
        plugins: [
          // The accessibility conditions Storybook does not open by default:
          // forced colors and reduced motion come from the browser context, so
          // the whole run lives in a context created with both media features.
          // Stories that pin their reviewed source colors opt out through the
          // `color-pinned` tag: forced colors intentionally replaces them.
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
            tags: { exclude: ["color-pinned"] },
          }),
        ],
        test: {
          name: "storybook-conditions",
          testTimeout: 60000,
          setupFiles: [
            path.join(dirname, "src/support/queries-setup.ts"),
            path.join(dirname, "src/support/a11y-setup.ts"),
          ],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances:
              mode === "coverage"
                ? [
                    {
                      browser: "chromium",
                      provider: playwright({
                        contextOptions: { forcedColors: "active", reducedMotion: "reduce" },
                      }),
                    },
                  ]
                : [
                    {
                      browser: "firefox",
                      provider: playwright({
                        contextOptions: { forcedColors: "active", reducedMotion: "reduce" },
                      }),
                    },
                  ],
          },
        },
      },
    ],
  },
}))
