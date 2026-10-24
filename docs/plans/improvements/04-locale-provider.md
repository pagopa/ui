# Action 04 — Locale: one dictionary behind `UIProvider`

| Field         | Value                                                         |
| ------------- | ------------------------------------------------------------- |
| Branch        | `improve/04-locale-provider`                                  |
| Worktree      | `../pagopa-ui-imp-04`                                         |
| Ports         | Storybook 6104 · static server 6204                           |
| Depends on    | 02 merged (it creates `UIProvider` and renames components)    |
| Person gate   | none                                                          |
| Report source | [../improvements.md](../improvements.md), the "texts" finding |

## State on 2026-10-24

- The review counted "about 130" literal defaults. A destructuring-only
  heuristic on `src/components` (templates excluded) finds **107 defaults in 46
  files**; the raw regex of step 1 also matches JSX attributes such as
  `className=`, so the AST check is the source of truth, not a grep.
- The text contract is in place: `CHANGELOG.md` (`Unreleased`) records the
  overridable text props and the function-valued labels (`pageLabel`,
  `slotLabel`, `stepLabel`, `statusLabel`, `fileMeta`, …). Every existing prop
  keeps its name and type; only the defaults move.
- `DatePicker` already exposes `locale` (BCP 47, default `"it-IT"`) and
  `calendarLocale`; step 5.2 reads their defaults from the provider instead of
  hard-coding them.
- `src/lib` contains only `cn.ts`: `ui-provider` does not exist yet.
- `primitives/calendar.tsx` imports `it` from `react-day-picker/locale`, and
  `import-layers` allows third-party imports only in `primitives`; the fallback
  of step 3.5 is therefore the current behaviour.
- `docs/plans/refactor-locale.md` still exists and is deleted by step 7.4.
- There is no `text-defaults` check and no `packages/ui-cli/src/checks/`
  entry for it.

## Goal

Today about 110 Italian text defaults are literals spread across about 46
component files (`closeLabel = "Chiudi finestra"`,
`pageLabel = (page) => \`Pagina ${page}\``, …). Each is overridable by a prop,
so the text contract holds, but an application that needs English, or a
different wording for one label everywhere, must pass the same prop at every
call site.

After this action:

- every default lives in one typed dictionary;
- `<UIProvider locale="en-US" messages={enMessages}>` switches the whole tree;
- a partial `messages` object overrides single keys;
- the precedence is **prop > provider > default dictionary**.

## Decisions (final, do not reopen)

- The **default dictionary stays Italian** (`itMessages`). The product renders
  Italian; switching the default would change every story and baseline.
- Ship `enMessages` as a second, complete dictionary. No other language.
- No i18n runtime dependency (no i18next, no react-intl): React context only.
- The provider is the existing `UIProvider` from action 02. This action adds
  `locale`, `messages` and `calendarLocale` to it; it doesn't create a second
  provider.
- The dictionary lives in `packages/pagopa-ui/src/lib/ui-provider/messages/`,
  one object per language, grouped by component:
  `messages.dialog.closeLabel`, `messages.pagination.pageLabel(page)`.
  Components import from `src/lib`, never the reverse.
- A text that depends on data stays a function in the dictionary, with the
  same signature as the existing prop (`(page: number) => string`).
- Every existing text prop keeps its name and type. Only its default moves.
- Templates under `src/components/templates/` are demos: out of scope.
- `docs/plans/refactor-locale.md` is superseded by this file and is deleted.

## Ownership

Allowed:

- `packages/pagopa-ui/src/lib/ui-provider/**`
- `packages/pagopa-ui/src/components/**/*.tsx` except `templates/**`
  (default values only, plus the hook call that reads them)
- `packages/pagopa-ui/src/pagopa-ui.ts` (new exports)
- `packages/pagopa-ui/{README.md, CHANGELOG.md}`, `.nx/version-plans/**`
- `packages/pagopa-ui/etc/pagopa-ui.api.md` (via `api:update`)
- `packages/ui-cli/src/checks/text-defaults.ts`, its test,
  `packages/ui-cli/src/cli.ts` (registering the check),
  `packages/pagopa-ui/project.json` (the new target and the `test.dependsOn`)
- `apps/storybook/src/UIProvider.stories.tsx`, `apps/storybook/src/guides/**`
- `.agents/skills/pagopa-ui-standards/SKILL.md` (one sentence, step 7)
- `docs/plans/refactor-locale.md` (delete)
- `docs/plans/improvements/reports/04.md`

Forbidden: everything else. Never change a rendered default string: moving a
string must not alter one character of it.

## Steps

### 1. Measure: the inventory of literal defaults

Write the check first, in report-only mode, so the inventory is a command, not
a guess.

1. Create `packages/ui-cli/src/checks/text-defaults.ts`, exposed as
   `node src/cli.ts check text-defaults`, following the pattern of the other
   checks in `cli.ts`. It scans `packages/pagopa-ui/src/components/**/*.tsx`
   (excluding `templates/`, `*.test.tsx` and `*.unit.test.tsx`) for
   destructuring defaults that are text:
   - a line matching `^\s+(\w+)\s*=\s*("[^"]*"|\([^)]*\)\s*=>\s*\`)`;
   - whose value contains at least two letters;
   - whose name is not in a `NON_TEXT_PROPS` set defined in the check:
     `className`, `variant`, `size`, `type`, `as`, `tone`, `role`, `align`,
     `side`, `orientation`, `status`, `state`, `mode`, `position`, `placement`,
     `direction`, `layout`, `kind`, `id`, `name`, `emphasis`, `color`, `theme`,
     `level`, `icon`, `locale`, `inputMode`, `autoComplete`, `density`,
     `appearance`, `device`, `format`, `shape`, `surface`, `intent`, `href`,
     `homeHref`, `accept`. Extend the set only with non-text props you find
     in step 1.3, and list each addition in the report.
2. It prints `file:line name` for each hit and the total. Add a `--max <n>`
   flag that exits 1 when the total exceeds `n`.
3. Run it. Review the hits. A hit that is not user-facing text is a false
   positive: add its prop name to `NON_TEXT_PROPS` (only if the name is never
   text anywhere) or report it.
4. Add a unit test with a small fixture file covering: a string default, a
   function default, a `className` default (ignored).

Done when: the check runs and the total (about 105–110 on 2026-10-24; the
review's older 130 may differ) is in the report as "before".

### 2. Define the dictionary type and the Italian dictionary

1. Create `src/lib/ui-provider/messages/types.ts` exporting `Messages`: one
   key per component (camelCase of the export, for example `dialog`,
   `pagination`, `datePicker`), each an object whose keys are the **prop
   names** that have a default, with the prop's type.
2. Create `messages/it.ts` exporting `itMessages: Messages`, built by copying
   every default found in step 1 **verbatim** (copy-paste, never retype).
3. Export a `DeepPartial<T>` helper type (internal, not public).

Done when: `pnpm nx run pagopa-ui:typecheck` passes and the number of leaf keys
in `itMessages` equals the step 1 total minus the reported false positives.

### 3. Extend `UIProvider`

In `src/lib/ui-provider/ui-provider.tsx`:

1. Add the props:
   - `locale?: string` (BCP 47, default `"it-IT"`);
   - `messages?: DeepPartial<Messages>`;
   - `calendarLocale?: Locale` (the react-day-picker `Locale` type; default
     the `it` locale already used in `primitives/calendar.tsx`).
2. Merge `messages` deeply over `itMessages` **once per change**, with
   `useMemo`.
3. Export a hook `useMessages<K extends keyof Messages>(key: K): Messages[K]`
   and `useLocale(): { locale: string; calendarLocale: Locale }`. Both work
   without a provider, returning the Italian defaults.
4. Nesting: an inner `UIProvider` merges over the outer one, so a section can
   override a few keys.
5. Import the `it` locale from `react-day-picker/locale` **only** in
   `primitives/calendar.tsx` and pass it through context: the import-layers
   check allows third-party imports only in primitives. If `src/lib` cannot
   import from `primitives`, keep `calendarLocale` `undefined` in context and
   let `Calendar` fall back to `it`.

Done when: typecheck passes and `pnpm nx run pagopa-ui:layers:check` passes.

### 4. Create the English dictionary

Create `messages/en.ts` exporting `enMessages: Messages`, a complete
translation. Use plain, short UI English. Keep function signatures. Export
`itMessages` and `enMessages`, together with the types `Messages` and
`UIProviderProps`, from `src/pagopa-ui.ts`.

Done when: typecheck passes (the type makes a missing key a compile error).

### 5. Move the defaults (one family per commit)

For each family folder (`overlays`, `navigation`, `inputs`, `feedback`,
`content`, `data-display`, `composites`, `primitives`, `icons`):

1. In each component with hits, remove the literal default from the
   destructuring and read it from the dictionary:

   ```tsx
   const t = useMessages("dialog")
   const label = closeLabel ?? t.closeLabel
   ```

   Keep the prop optional with the same type, and update its JSDoc `@default`
   to name the dictionary key (`@default messages.dialog.closeLabel`).

2. `DatePicker`: the `locale` and `calendarLocale` props already exist; when
   they are absent, read them from `useLocale()` instead of the hard-coded
   `"it-IT"`/`undefined` defaults.
3. A component that must stay a server component (no hook today, no
   `"use client"`) still needs the hook now. Add `"use client"` as the file's
   first line and list the file in the report: action 03 reviews directives.
4. Run `node src/cli.ts check text-defaults` (in `packages/ui-cli`): the total
   drops by the number of moved defaults.
5. Run the unit tests and the stories of the family.

Done when, after the last family: the check reports 0.

### 6. Turn the check into a gate

1. Add a target `text-defaults:check` to `packages/pagopa-ui/project.json`
   (`"options": { "command": "node src/cli.ts check text-defaults --max 0" }`,
   inheriting the `*:check` target defaults of `nx.json`).
2. Add it to the `dependsOn` of the `test` target.

Done when: `pnpm nx run pagopa-ui:text-defaults:check` passes, and fails when
you temporarily add `fooLabel = "Prova"` to a component. Revert the probe.

### 7. Stories, guide and rules

1. In `apps/storybook/src/UIProvider.stories.tsx`, add:
   - `English`: `<UIProvider locale="en-US" messages={enMessages}>` around a
     `Dialog` (open), a `Pagination` and a `DatePicker`. Its `play` asserts
     the English accessible names (`"Close dialog"` or whatever `enMessages`
     says, read from `enMessages`, not hard-coded);
   - `PartialOverride`: `messages={{ pagination: { previousLabel: "Indietro" } }}`,
     asserting the overridden label and an untouched Italian one.
2. Add a "Languages and texts" section to `packages/pagopa-ui/README.md` (at
   most 20 lines): the precedence, a full switch, a partial override.
3. In `.agents/skills/pagopa-ui-standards/SKILL.md`, replace the sentence
   "Where the repository exposes a text mechanism, use it." with: "A default
   lives in the default dictionary of the UI provider and the component reads
   it there; the check `text-defaults` rejects a literal default." Keep the
   skill free of file paths.
4. Delete `docs/plans/refactor-locale.md`. If `docs/plans/README.md` links it,
   leave that file alone and list the dangling link under "Outside scope".

Done when: the stories pass (heavy lock) and `pnpm nx run pagopa-ui:docs`
passes.

### 8. Release bookkeeping

- CHANGELOG `### Added`: `UIProvider` `locale`, `messages`, `calendarLocale`;
  `itMessages`, `enMessages`; the `Messages` type.
- `pnpm nx release plan minor -p pagopa-ui -m "feat(i18n): add the default dictionary and the English one"`.
- `pnpm nx run pagopa-ui:api:update`.

## Acceptance

Quick:

```sh
pnpm nx run-many -p pagopa-ui,pagopa-ui-cli,pagopa-ui-storybook -c=ci -t fmt,lint,typecheck
pnpm nx run-many -p pagopa-ui -t text-defaults:check,layers:check,api:check,docs
pnpm nx run pagopa-ui-cli:test
pnpm nx run pagopa-ui:test -c=ci
```

Heavy (under the lock):

```sh
pnpm nx run pagopa-ui-storybook:test:stories
pnpm nx run pagopa-ui:library:check
```

If action 01 is merged, the visual check must pass with **no** baseline
change: run it in the Linux container (see `CONTRIBUTING.md`, "Visual
regression") if Docker is available, otherwise say so in the report.

## Stop conditions

- A moved default would change a rendered string.
- `layers:check` rejects `src/lib` importing types or values it needs, and the
  fallback of step 3.5 doesn't solve it.
- More than 15 hits are neither text nor a clean false positive.

## Commits

1. `feat(ui-cli): report literal text defaults`
2. `feat(pagopa-ui): add the message dictionaries and extend UIProvider`
3. One `refactor(<family>): read text defaults from the dictionary` per family
4. `test(ui-cli): gate literal text defaults`
5. `docs: document languages and texts`
6. `chore(release): plan the i18n minor release`
7. `docs(plans): report action 04`

## Report additions

- The text-defaults total before and after, and the `NON_TEXT_PROPS` additions.
- The files that gained `"use client"`.
- Person step: have someone fluent review `en.ts` wording.
