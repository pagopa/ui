## 0.0.5 (2026-10-30)

### 🚀 Features

- feat(autocomplete): own the Figma multiselect types — `multiple` takes a `string[]` and renders both filled types: one removable pill per value (`removeValueLabel`, default `Elimina {value}`) beside the `[clear][chevron]` group, or `multipleDisplay="counter"` collapsing the row into the count badge that carries the clear of every value (`clearAllLabel`, `counterLabel`); the pills stay on one line and scroll when they stop fitting, so the field keeps its 48px frame. Backspace on an empty input removes the last value. Answers [#40](https://github.com/pagopa/ui/issues/40). ([#85](https://github.com/pagopa/ui/pull/85))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.0.4 (2026-10-28)

### 🚀 Features

- feat(timeline): add the source event time under the copy ([#64](https://github.com/pagopa/ui/pull/64))

### ❤️ Thank You

- Danilo Spinelli @gunzip
- gunzip

## 0.0.3 (2026-10-26)

### 🩹 Fixes

- chore(deps): bump the development toolchain (next 16.4.1, vite 8.3.3, vitest 5.0.5) ([#58](https://github.com/pagopa/ui/pull/58))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.0.2 (2026-10-25)

### 🚀 Features

- feat(i18n): add the default dictionary and the English one ([3bee6b2](https://github.com/pagopa/ui/commit/3bee6b2))
- feat(pagopa-ui): switch responsive layouts to the Figma breakpoints ([cabfafc](https://github.com/pagopa/ui/commit/cabfafc))
- feat(tokens): publish the public token contract ([67b6281](https://github.com/pagopa/ui/commit/67b6281))
- feat(api)!: rename exports and add UIProvider ([cd41149](https://github.com/pagopa/ui/commit/cd41149))

### 🩹 Fixes

- build(pagopa-ui): ship one ES module per component ([67b6281](https://github.com/pagopa/ui/commit/67b6281))
- fix(side-nav): keep the condensed toggle's 44px target ([3bee6b2](https://github.com/pagopa/ui/commit/3bee6b2))

### ❤️ Thank You

- gunzip

## 0.0.1 (2026-10-21)

### 🚀 Features

- Publish `@pagopa/ui` on GitHub Packages through the Nx Release pipeline. ([5460336](https://github.com/pagopa/ui/commit/5460336))

### ❤️ Thank You

- gunzip
