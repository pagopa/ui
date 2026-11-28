// A third config directory, for the same reason as `.storybook-conditions`:
// `@storybook/addon-vitest` derives the Vitest project name from the config
// directory, and reduced motion is a condition of its own, not a suffix of the
// forced-colours pass. The re-exported `stories` globs stay relative to the
// config directory, so this sibling resolves to the same files.
export { default } from "../.storybook/main.ts"
