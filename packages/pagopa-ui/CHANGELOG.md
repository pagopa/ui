## 0.1.2 (2026-11-04)

### 🚀 Features

- feat(popover): point the indicator at the trigger and keep the Timeline rail straight ([#97](https://github.com/pagopa/ui/pull/97))

  `Popover` draws its arrow through the placement middleware, so the tip tracks the trigger when the popup is shifted to stay in the viewport instead of sitting at the popup centre. `Timeline` reserves the timestamp column for a row that has none when a sibling carries one, and starts a plain row's copy at the row top: every cursor shares one rail and lines up with its title. `DownloadCard` announces `messages.downloadCard.downloadLabel` — `Scarica {file}` in Italian, `Download {file}` in English — and the new `downloadLabel` prop replaces the phrase. The Stepper's upcoming number moves from `muted-soft` to `muted-foreground`: 3.66:1 to 4.59:1 on its disc. The action and banner guides mark the `*-contrast` button family as brand and dark surface only, where its label measured 1.18:1 on the Primary Banner fill. `SectionHeader` defaults `titleAs` to `h2` and takes the shared `HeadingTag` (`h2`…`h6`), so the page keeps its single `h1` and a section title can no longer claim it: `titleAs="h1"` is now a type error, and `level` stays the visual choice. `Footer` pins a column tail to the column bottom only when a body sits above it: a column whose tail is its only content — a language control, say — keeps it under the title, level with the sibling columns' first row.

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.1 (2026-11-04)

### 🚀 Features

- feat(popper): add an anchored validation message ([#93](https://github.com/pagopa/ui/pull/93))

### 🩹 Fixes

- chore(figma): review renamed Missing element ([#93](https://github.com/pagopa/ui/pull/93))

### ❤️ Thank You

- gunzip

## 0.1.0 (2026-11-02)

### 🩹 Fixes

- fix(select,dropdown-menu): paint keyboard focus distinctly in forced colors ([#89](https://github.com/pagopa/ui/pull/89))
- fix(overlays): mount the shared portal root after mount, not during render ([#89](https://github.com/pagopa/ui/pull/89))
- fix: keep long and translated segmented-control labels visible at narrow widths and enlarged text ([#89](https://github.com/pagopa/ui/pull/89))

### ⚠️  Breaking Changes

- feat(styles)!: scope component styles to UIProvider (breaking); wrap each component tree in UIProvider ([#89](https://github.com/pagopa/ui/pull/89))

### ❤️ Thank You

- Danilo Spinelli @gunzip

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
