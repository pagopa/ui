import { defineConfig } from "oxfmt"

// Single formatter configuration for the workspace: oxfmt discovers exactly one
// file per directory, so the previous `.oxfmtrc.json` options are merged here
// instead of living in a second file.
export default defineConfig({
  semi: false,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  // The monorepo keeps hand-grouped package.json keys.
  sortPackageJson: false,
  ignorePatterns: [
    ".agents/",
    ".mise/",
    ".nx/",
    "CHANGELOG.md",
    "coverage/",
    "debug-storybook.log",
    "dist/",
    "node_modules/",
    "package-lock.json",
    "pnpm-lock.yaml",
    "pnpm-*.yaml",
    "public/",
    "storybook-static/",
    "tfmodules.lock.json",
  ],
})
