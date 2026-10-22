# Action 02 — Public API: report gate, approved renames, router links

| Field         | Value                                                               |
| ------------- | ------------------------------------------------------------------- |
| Branch        | `improve/02-public-api`                                             |
| Worktree      | `../pagopa-ui-imp-02`                                               |
| Ports         | Storybook 6102 · static server 6202                                 |
| Depends on    | nothing                                                             |
| Person gate   | `G-API`: the rename table below is approved before the agent starts |
| Report source | [../improvements.md](../improvements.md), the "public API" finding  |

Approval: PENDING

> **Person:** fill the "Decision" column, change the line above to
> `Approval: APPROVED` and commit to `main`. Allowed decisions:
>
> - `rename` — use the proposed name;
> - `keep` — leave the current name;
> - `use <Name>` — use the name you write instead.
>
> An empty cell counts as `keep`.

## Rename table

| #   | Current export(s)                                     | Proposed                                                  | Why                                                  | Decision |
| --- | ----------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- | -------- |
| R1  | `IDModule`, `IDModuleProps`, `IDModuleProviderOption` | `IdentityProviderPicker`, `…Props`, `…Option`             | Says what it does; no acronym casing                 |          |
| R2  | `KOState` (+ props type)                              | `ErrorState`                                              | `KO` is jargon; pairs with `EmptyState`              |          |
| R3  | `OKState` (+ props type)                              | `SuccessState`                                            | Pairs with R2                                        |          |
| R4  | `LoghiPSP` (+ props type)                             | `PaymentProviderLogos`                                    | Italian and acronym in an English API                |          |
| R5  | `Microevento` (+ props type)                          | `MicroEvent`                                              | Italian in an English API                            |          |
| R6  | `WhiteTemplate` (+ props type)                        | `PageSurface`                                             | Describes the role, not the colour                   |          |
| R7  | `Spacing`, `SpacingSize`                              | `Spacer`, `SpacerSize`                                    | A component is a thing, not a property               |          |
| R8  | `CorrectionValid`, `CorrectionNotValid`               | one `CorrectionTag` with `status: "valid" \| "not-valid"` | Two exports for one component with two states        |          |
| R9  | `DropDown`, `MenuDropDown`, `DropDownItem`            | `Dropdown`, `MenuDropdown`, `DropdownItem`                | Matches `DropdownMenu*` casing already in the source |          |
| R10 | `figmaIconNames`, `figmaPictogramNames`               | `iconNames`, `pictogramNames`                             | Consumers don't need to know the source tool         |          |
| R11 | `TextAreaField` (+ props type)                        | `TextareaField`                                           | Matches `Textarea`                                   |          |
| R12 | `CameraViewElement` (+ props type)                    | `CameraView`                                              | `Element` adds nothing                               |          |

Kept on purpose (no row): `PagoPAIcon`, `PagoPAPictogram`, `WaitingState`,
`EmptyState`, `SafeArea`, `PinPoint`, `ProgressKpi`.

## Goal

Make the public surface a deliberate, reviewed contract:

1. Any change to exported names or types shows up as a diff in a committed API
   report, and the check fails until the report is updated.
2. Names read as English product vocabulary, before more consumers adopt
   version 0.x (`pagopa-ui@0.0.1` is already tagged and published).
3. Applications using a client router (Next.js, React Router) can render
   library links with their own link component.

## Decisions (final, do not reopen)

- The rows marked `rename` or `use <Name>` are applied, **with no deprecated
  aliases**. The package is 0.x: the change ships as a `minor` version plan with
  a migration table in the CHANGELOG.
- Never change a `data-*` attribute, a CSS class, a `data-slot` value or a
  Figma node id. Parity roots and tests rely on them.
- Rename the story file and its title with the export, so the story id follows
  the new name. Old story ids are not redirected.
- Historical documents keep the old names: `docs/decisions/**`, `docs/plans/**`
  (except this action's report) and the released sections of `CHANGELOG.md`.
- Router links go through one provider, `UIProvider`, created in
  `packages/pagopa-ui/src/lib/ui-provider/`. In this action it carries only
  `linkComponent`. Action 04 adds the locale to the same provider.
- `Button` already accepts the Base UI `render` prop. This action proves it with
  a story and a test; it doesn't change it. `buttonVariants` stays private.
- The API report uses `@microsoft/api-extractor`. If it cannot read this
  package's declarations after two attempts, use the fallback in step 3.

## Ownership

Allowed:

- `packages/pagopa-ui/src/**` (components, `lib/ui-provider/**`, the catalogue
  JSON files in `src/catalog/figma/`)
- `packages/pagopa-ui/{project.json, package.json, README.md, CHANGELOG.md, figma-to-code.yaml}`
- `packages/pagopa-ui/api-extractor.json`, `packages/pagopa-ui/etc/**` (new)
- `.nx/version-plans/**`
- `apps/storybook/src/**` (stories, guides, story-titles if any)
- `apps/storybook/visual/__screenshots__/**` (renames only, with `git mv`)
- `packages/ui-cli/src/checks/library-artifact.ts` (export lists only)
- `packages/ui-cli/tests/fixtures/library-consumer/**`,
  `packages/ui-cli/tests/e2e/library.spec.mjs` (renamed identifiers only)
- `packages/ui-cli/src/checks/api-report.ts` and its test (fallback only)
- `pnpm-lock.yaml`, `CONTRIBUTING.md` (one paragraph about the API report)
- `docs/plans/improvements/reports/02.md`

Forbidden: `.github/**`, `.agents/**`, `docs/decisions/**`,
`packages/tokens/**`, `packages/artwork/**`, `.storybook/preview.tsx`.

## Steps

### 1. Measure and read the approval

```sh
grep -E '^\| R[0-9]+' docs/plans/improvements/02-public-api.md
pnpm nx run pagopa-ui:build
node -e 'import("./packages/pagopa-ui/dist/pagopa-ui.js").then(m=>console.log(Object.keys(m).length))'
```

1. Write the list of approved rows (`rename` or `use <Name>`) into the report.
   Rows with `keep` or an empty Decision are not touched.
2. Record the runtime export count as "before". If the import fails because of
   a CSS or DOM import, count the `export` names in
   `packages/pagopa-ui/dist/types/pagopa-ui.d.ts` and its re-exports instead,
   and say which method you used.

Done when: the approved list and the count are in your notes.

### 2. Add the API report (before any rename)

1. `pnpm --filter @pagopa/ui add -D @microsoft/api-extractor`.
2. Create `packages/pagopa-ui/api-extractor.json`:
   - `mainEntryPointFilePath`: `<projectFolder>/dist/types/pagopa-ui.d.ts`;
   - `apiReport.enabled: true`, `reportFolder: "<projectFolder>/etc/"`,
     `reportTempFolder: "<projectFolder>/dist/api/"`;
   - `docModel.enabled: false`, `dtsRollup.enabled: false`;
   - `messages`: set `ae-missing-release-tag` and
     `ae-forgotten-export` to `logLevel: "none"` (the package has no release
     tags yet).
3. Add scripts to `packages/pagopa-ui/package.json`:
   - `"api:check": "api-extractor run"`
   - `"api:update": "api-extractor run --local"`
4. Add targets to `packages/pagopa-ui/project.json`:
   - `api:check` with `"dependsOn": ["build"]`, `"cache": true`,
     `"inputs": ["production", "^production"]` if those named inputs exist
     (check `nx.json`), otherwise `"default"`;
   - `api:update` with `"dependsOn": ["build"]`, `"cache": false`.
5. Add `"api:check"` to the `dependsOn` array of the `test` target. This puts
   it in the green chain and in CI without editing the chain.
6. `pnpm nx run pagopa-ui:api:update`, then
   `pnpm nx run pagopa-ui:api:check`.

Done when: `packages/pagopa-ui/etc/pagopa-ui.api.md` exists, `api:check`
passes, and adding `export const __probe = 1` to `src/pagopa-ui.ts` makes
`api:check` fail. Remove the probe afterwards.

### 3. Fallback, only if api-extractor fails twice

Write `packages/ui-cli/src/checks/api-report.ts`, exposed as
`node src/cli.ts check api [--write]`, following the existing pattern of the
other checks in `packages/ui-cli/src/cli.ts`:

- Use the TypeScript compiler API (the `typescript` package already in the
  workspace) on `packages/pagopa-ui/dist/types/pagopa-ui.d.ts`.
- For every exported symbol, sorted by name, print one block: the name, its
  kind (`function`, `type`, `interface`, `const`) and
  `checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation)`.
- Compare with `packages/pagopa-ui/etc/pagopa-ui.api.md`; `--write` rewrites it.
- Add a unit test with a tiny fixture `.d.ts`.
- Wire it as the `api:check` and `api:update` targets of step 2.

Done when: the same "Done when" as step 2 holds.

### 4. Commit the baseline

Commit the report and the targets **before** renaming, so the rename commits
show the API diff.

### 5. Apply each approved rename (one commit per row)

For each approved row, in table order:

1. Rename the export, its props type and every internal reference
   (`git grep -n '\bOldName\b'`). Rename the source file only when its file
   name is the kebab-case of the export (for example `ko-state.tsx` →
   `error-state.tsx`), and update the family `index.ts`.
2. Rename the story file with `git mv` and update its `title`. Update the
   story-title map in `packages/pagopa-ui/src/catalog/figma/story-titles.json`
   (path and title).
3. Update the catalogue:
   - `registry.json`: `target.export` and `target.story`;
   - `parity-cases.json`: `export` and `storyId`;
   - `figma-to-code.yaml` if it names the export.
4. Update the consumers of the name:
   - `REQUIRED_EXPORTS` in `packages/ui-cli/src/checks/library-artifact.ts`;
   - `packages/ui-cli/tests/fixtures/library-consumer/**`;
   - `packages/ui-cli/tests/e2e/library.spec.mjs`;
   - the guides in `apps/storybook/src/guides/**` and
     `packages/pagopa-ui/README.md`.
5. Visual baselines: if `apps/storybook/visual/__screenshots__` exists, rename
   every PNG whose name starts with the old story id prefix to the new prefix
   with `git mv`. The images don't change.
6. Row R8 only: create `content/correction-tag.tsx` exporting `CorrectionTag`
   with `status: "valid" | "not-valid"`. It renders exactly what the two old
   components render for each status, including their `data-*` attributes.
   Both registry entries target `CorrectionTag`, with the story export for each
   status. Delete the two old files and merge the two story files into
   `CorrectionTag.stories.tsx`, keeping one story per previous story.
7. `pnpm nx run pagopa-ui:api:update` and check that the diff of
   `etc/pagopa-ui.api.md` shows only this row's names.
8. Run `pnpm nx run-many -p pagopa-ui,pagopa-ui-storybook,pagopa-ui-cli -c=ci -t typecheck,lint`
   and `pnpm nx run pagopa-ui:figma:check`.
9. Commit `refactor(api)!: rename <Old> to <New>`.

Done when, for each row:

- `git grep -nw '<Old>' -- ':!docs/decisions' ':!docs/plans' ':!packages/pagopa-ui/CHANGELOG.md'`
  prints nothing;
- typecheck, lint and `figma:check` pass.

### 6. `UIProvider` with `linkComponent`

1. Create `packages/pagopa-ui/src/lib/ui-provider/ui-provider.tsx` (first line
   `"use client"`):

   ```ts
   type LinkComponentProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
     href: string
     ref?: React.Ref<HTMLAnchorElement>
   }
   type UIProviderProps = {
     linkComponent?: React.ElementType<LinkComponentProps>
     children: React.ReactNode
   }
   ```

   - It exports `UIProvider`, `useLinkComponent()` (returns the configured
     component, or `"a"`), and the types `UIProviderProps` and
     `LinkComponentProps`.
   - The context default is `{ linkComponent: "a" }`, so a tree without a
     provider renders as today.
   - Add `index.ts` re-exporting the public names.

2. Export `UIProvider`, `UIProviderProps` and `LinkComponentProps` from
   `src/pagopa-ui.ts`. `useLinkComponent` stays internal.
3. Replace every `<a href=…>` rendered for a **navigation link** with the
   component from `useLinkComponent()`, keeping every other prop and class:
   - `navigation/breadcrumb.tsx`, `navigation/footer.tsx`,
     `navigation/header.tsx`, `navigation/side-nav.tsx`,
     `navigation/preheader.tsx`, `composites/id-module.tsx` (or its renamed
     file), `content/list-item.tsx`.
   - Do **not** change `skip-to-main-content.tsx`: an in-page `#id` link must
     stay a plain anchor.
   - Find any remaining case with
     `git grep -n '<a$\|<a ' packages/pagopa-ui/src/components -- ':!*/templates/*'`.
4. Add `apps/storybook/src/UIProvider.stories.tsx` (title
   `Components/UIProvider`), with:
   - a story `RouterLink`, where a fake link component adds
     `data-router-link` and calls `event.preventDefault()`, wrapping a
     `Breadcrumb` and a `Footer`;
   - a `play` function asserting that the links carry `data-router-link` and
     keep their accessible names;
   - a story `ButtonAsLink` rendering
     `<Button render={<a href="/somewhere" />} nativeButton={false}>`, whose
     `play` asserts `getByRole("link", { name })`. If `nativeButton` doesn't
     exist in the installed Base UI version, use the prop its types offer and
     say so in the report.
5. Add a unit test in `src/lib/ui-provider/` asserting the default is `"a"`.
6. Add a "Router links" section of at most 15 lines to
   `packages/pagopa-ui/README.md`, with a Next.js example
   (`<UIProvider linkComponent={Link}>`).
7. `pnpm nx run pagopa-ui:api:update`.

Done when:

- the two stories pass in `pnpm nx run pagopa-ui-storybook:test:stories`
  (under the heavy lock);
- the unit test passes;
- `git grep -n '<a ' packages/pagopa-ui/src/components -- ':!*/templates/*'`
  only lists `skip-to-main-content.tsx`.

### 7. Release bookkeeping

1. In `packages/pagopa-ui/CHANGELOG.md`, under `## Unreleased`:
   - `### Changed`: a line "Renamed exports" followed by a table
     `| Before | After |` with every applied rename;
   - `### Added`: `UIProvider` with `linkComponent`; the API report.
2. `pnpm nx release plan minor -p pagopa-ui -m "feat(api)!: rename exports and add UIProvider"`.
3. Add one paragraph to `CONTRIBUTING.md` under "Workflow", item 4: an API
   change updates `etc/pagopa-ui.api.md` with
   `pnpm nx run pagopa-ui:api:update`, and the diff is reviewed in the pull
   request.

Done when: `pnpm nx release plan:check` passes.

## Acceptance

Quick:

```sh
pnpm nx run-many -p pagopa-ui,pagopa-ui-storybook,pagopa-ui-cli -c=ci -t fmt,lint,typecheck
pnpm nx run pagopa-ui:api:check
pnpm nx run-many -p pagopa-ui -t figma:check,layers:check,foundation:check,docs
pnpm nx run pagopa-ui-cli:test
```

Heavy (under the lock):

```sh
pnpm nx run pagopa-ui-storybook:test:stories
pnpm nx run pagopa-ui:library:check
```

Then the full green chain (rule 22).

## Stop conditions

- The approval line doesn't read `Approval: APPROVED`. Stop immediately; do
  nothing.
- A rename makes `figma:check` report a change in a parity verdict or a node
  status (not just a renamed target).
- Row R8 cannot be merged without a visual change. Skip R8, keep the two old
  exports, and report it as `PARTIAL`.
- The API report still fails after the fallback.

## Commits

1. `build(pagopa-ui): add the API report gate`
2. One `refactor(api)!: rename <Old> to <New>` per approved row
3. `feat(pagopa-ui): add UIProvider with a router link component`
4. `chore(release): plan the minor release for the API cleanup`
5. `docs(plans): report action 02`

## Report additions

- Runtime export count before and after, and the list of applied renames.
- Whether api-extractor or the fallback is in use.
- Person steps:
  - review the `etc/pagopa-ui.api.md` diff in the pull request;
  - resume the M5 sessions after the merge (they must rebase on the new names).
