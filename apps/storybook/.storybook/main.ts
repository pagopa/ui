import path from "node:path"
import { fileURLToPath } from "node:url"
import type { StorybookConfig } from "@storybook/react-vite"

const dirname = path.dirname(fileURLToPath(import.meta.url))
// The stories document packages/pagopa-ui: `@/…` names its source, exactly as
// it does inside the package.
const designSystem = path.resolve(dirname, "../../../packages/pagopa-ui/src")

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-designs",
    "@storybook/addon-mcp",
  ],
  framework: "@storybook/react-vite",
  viteFinal: (viteConfig, { configType }) => ({
    ...viteConfig,
    envDir: false,
    resolve: {
      ...viteConfig.resolve,
      alias: { ...viteConfig.resolve?.alias, "@": designSystem },
    },
    ...(configType === "PRODUCTION"
      ? {
          build: {
            ...viteConfig.build,
            rolldownOptions: {
              ...viteConfig.build?.rolldownOptions,
              // The accessibility contract imports the Vitest browser context
              // lazily, inside a catch: Vitest provides that virtual module at
              // test time, so the static documentation build must keep it as an
              // external dynamic import instead of resolving it.
              external: ["@vitest/browser/context"],
            },
          },
        }
      : {}),
  }),
}
export default config
