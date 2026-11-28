/// <reference types="vitest/config" />
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vite"

import { prefixedCandidates } from "../../packages/pagopa-ui/build/prefixed-candidates.ts"

const dirname = path.dirname(fileURLToPath(import.meta.url))
// The stories document the design system, so the alias and the coverage
// surface point at the package they document.
const packageRoot = path.resolve(dirname, "../../packages/pagopa-ui")

// The engine set belongs to the pass, not to the project: v8 coverage is
// collected on Chromium only, a pull request proves WebKit, and the full pass -
// the nightly one - runs Firefox and WebKit. Every story still runs in all
// three engines, just not in the same pass.
function storybookInstances(mode: string): { browser: "chromium" | "firefox" | "webkit" }[] {
  if (mode === "coverage") return [{ browser: "chromium" }]
  if (mode === "webkit") return [{ browser: "webkit" }]
  return [{ browser: "firefox" }, { browser: "webkit" }]
}

// The accessibility conditions run on the engine of the pass; Chromium keeps
// the coverage pass and Firefox keeps the full pass, as before.
function conditionInstances(
  mode: string,
  contextOptions: { forcedColors?: "active"; reducedMotion?: "reduce" },
): { browser: "chromium" | "firefox" | "webkit"; provider: ReturnType<typeof playwright> }[] {
  const browser = mode === "coverage" ? "chromium" : mode === "webkit" ? "webkit" : "firefox"
  return [{ browser, provider: playwright({ contextOptions }) }]
}

// A condition project: the whole catalogue under one browser context the
// default pass never opens. Each condition owns its config directory, because
// `@storybook/addon-vitest` names the Vitest project after it, and its own tag
// exclusion, because the exclusion belongs to the condition: forced colours
// replaces a reviewed source colour, reduced motion keeps the colour and
// changes only the timing.
function conditionProject(options: {
  name: string
  directory: string
  mode: string
  contextOptions: { forcedColors?: "active"; reducedMotion?: "reduce" }
  exclude?: string[]
}) {
  return {
    extends: true,
    plugins: [
      storybookTest({
        configDir: path.join(dirname, options.directory),
        ...(options.exclude ? { tags: { exclude: options.exclude } } : {}),
      }),
    ],
    test: {
      name: options.name,
      // Same budget as the storybook project: the proof is the story's own
      // assertions, and a boot that loses to a loaded machine is noise.
      testTimeout: 120000,
      setupFiles: [
        path.join(dirname, "src/support/queries-setup.ts"),
        path.join(dirname, "src/support/a11y-setup.ts"),
        // Always loaded: a setup file that only appears when the option is
        // present could never notice the option going missing.
        path.join(dirname, options.directory, "expect-condition.ts"),
      ],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({}),
        // The workspace chain runs the story passes beside the packed-artifact
        // consumer and its own browsers; the 60s default expires on a busy
        // machine and reports a dead session instead of a failing test.
        connectTimeout: 120000,
        instances: conditionInstances(options.mode, options.contextOptions),
      },
    },
  }
}

// The browser projects run the stories; the package keeps the design system
// build and its unit project.
export default defineConfig(({ mode }) => ({
  base: "./",
  envDir: false,
  plugins: [
    prefixedCandidates({
      base: dirname,
      entry: path.resolve(dirname, "src/preview.css"),
      mirror: path.resolve(dirname, ".generated/prefixed-candidates.txt"),
    }),
    react(),
    tailwindcss(),
  ],
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
      exclude: [
        "**/*.stories.*",
        // Generated artwork. Every module carries one drawing and one shell
        // wrapper per pinned variant, and a story renders one variant, so the
        // other half is uncovered by construction and no test can change that.
        // Counted, it moves the aggregate without saying anything about the
        // hand-written code the thresholds are there to protect.
        "**/src/components/icons/generated/**",
      ],
      // Ratchet policy: thresholds follow current coverage with a small margin
      // and never go down. Raise them as new stories land (see CONTRIBUTING).
      // A per-file gate matches the path relative to this app, so each one
      // steps back to the workspace root first: a gate no file reaches protects
      // nothing, and the module it names goes ungated.
      thresholds: {
        statements: 90,
        branches: 83,
        functions: 90,
        lines: 90,
        "../../**/src/components/inputs/{autocomplete,select-field,drag-and-drop}.tsx": {
          perFile: true,
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        "../../**/src/components/inputs/field-utils.ts": {
          statements: 100,
          branches: 85,
          functions: 100,
          lines: 100,
        },
        "../../**/src/components/primitives/form-control-utils.ts": {
          statements: 100,
          branches: 85,
          functions: 100,
          lines: 100,
        },
        "../../**/src/components/primitives/button.tsx": {
          statements: 95,
          branches: 90,
          functions: 100,
          lines: 95,
        },
        "../../**/src/components/{inputs/date-picker,primitives/calendar}.tsx": {
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
          // is busy, and a timeout is a false alarm, not a defect. The same
          // budget covers the story iframe booting, which pays for the whole
          // module graph: on a loaded machine it is the boot, not the story,
          // that runs out.
          testTimeout: 120000,
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
            // See the condition project: the chain runs two browser passes at
            // once and the default connect budget is not enough for both.
            connectTimeout: 120000,
            // The coverage pass runs Chromium only (v8 coverage is not collected
            // in Firefox and WebKit); a pull request proves WebKit; the full
            // pass runs the other two engines.
            instances: storybookInstances(mode),
          },
        },
      },
      // Forced colours replaces the reviewed source colours, so the stories
      // that pin them opt out through the `color-pinned` tag.
      conditionProject({
        name: "storybook-conditions",
        directory: ".storybook-conditions",
        mode,
        contextOptions: { forcedColors: "active" },
        exclude: ["color-pinned"],
      }),
      // Reduced motion changes the timing and keeps every colour, so nothing is
      // excluded: the seventy `color-pinned` stories are exactly the animated
      // controls whose reduced-motion behaviour has to be proven.
      conditionProject({
        name: "storybook-reduced-motion",
        directory: ".storybook-reduced-motion",
        mode,
        contextOptions: { reducedMotion: "reduce" },
      }),
    ],
  },
}))
