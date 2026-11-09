// A second config directory, not a second configuration. `@storybook/addon-vitest`
// derives the Vitest project name from the config directory, so the forced
// colours/reduced motion pass needs its own directory to avoid colliding with
// the `storybook` project under the Storybook test module (`VITEST_STORYBOOK`).
// This directory is a sibling of `.storybook`, so the `stories` globs of the
// re-exported config, which are relative to the config directory, resolve to
// the same files.
export { default } from "../.storybook/main.ts"
