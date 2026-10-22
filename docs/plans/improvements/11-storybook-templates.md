# Action 11 — Templates out of the package

| Field         | Value                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Branch        | `improve/11-storybook-templates`                                                                   |
| Worktree      | `../pagopa-ui-imp-11`                                                                              |
| Ports         | Storybook 6111 · static server 6211                                                                |
| Depends on    | 01, 02, 07, 08 merged (visual baselines, registry renames, foundation rules, breakpoint migration) |
| Person gate   | none                                                                                               |
| Report source | [../improvements.md](../improvements.md), §3.3 "Demo code inside the library"                      |

## Goal

`packages/pagopa-ui/src/components/templates/figma/` holds the Figma page
templates: 5 `implemented` compositions (`LogIn`, `FeedbackPage`,
`DialogTemplate`, `SecurityCodeDialog`, `InformativeDrawer`), each with parity
cases, plus 19 `mocked` placeholders rendered by `TemplateShell`. That makes
about 1,100 lines and 24 registry entries.

They are not shipped: the build follows only `src/pagopa-ui.ts`, coverage
excludes them, and `library.css` skips them. Even so, they sit inside the
component tree, so every rule needs an exception for them: the `templates`
layer in the layer check, its third-party exemption, the exclusions in actions
02 and 04, and the coverage exclude. Agents also read the folder as component
space.

After this action:

- the templates live in `apps/storybook/src/templates/`, next to the stories
  that render them;
- `packages/pagopa-ui/src/components` contains only shippable code;
- the layer check retires `templates` the way it retired `screens`;
- the Figma registry and the foundation check follow the files to their new
  place, with no loss of coverage.

## Decisions (final, do not reopen)

- Destination: `apps/storybook/src/templates/<File>.tsx`. The `figma/` level
  is dropped. Imports keep the `@/…` alias, which Storybook and the tooling
  both resolve to `packages/pagopa-ui/src`.
- The 5 implemented templates stay private demos. Making a template public API
  is a separate product decision, outside this action.
- Registry `target.module` values become workspace-relative
  (`apps/storybook/src/templates/LogIn.tsx`), the same form `target.story`
  already uses. Statuses, exports, stories, notes and parity cases don't
  change.
- The token-first rules keep covering the templates: the foundation check
  scans `apps/storybook/src/templates` as a second root. No count in
  `foundation-baseline.json` changes. A count that changes means the scan lost
  or gained files: that is a bug to fix, not a ceiling to edit.
- `templates` joins the removed layers in the layer check: a file under
  `src/components/templates/` fails as "removed layer must not exist".
- `index.ts` (a barrel nothing imports) is deleted, not moved.
- Rendering doesn't change: the host visual reference must match on every
  story.

## Ownership

Allowed:

- `packages/pagopa-ui/src/components/templates/**` (moved out, then gone)
- `apps/storybook/src/templates/**` (new)
- `apps/storybook/src/{LogIn,FeedbackPage,DialogTemplate,SecurityCodeDialog,InformativeDrawer}.stories.tsx`
  (one import line each)
- `apps/storybook/vite.config.ts` (the coverage `exclude` entry for templates)
- `packages/pagopa-ui/src/catalog/figma/registry.json` (`target.module`
  values only)
- `packages/pagopa-ui/src/library.css` (the `@source not` line for templates)
- `packages/pagopa-ui/project.json` (`inputs` of `figma:check` and
  `foundation:check`)
- `packages/tokens/src/foundation-exceptions.json` (the `file` value of
  entries under `templates/`)
- `packages/ui-cli/src/figma/sync.ts` (the module existence checks)
- `packages/ui-cli/src/checks/foundation.ts`, `packages/ui-cli/src/checks/import-layers.ts`
- `packages/ui-cli/tests/checks/{import-layers,foundation,story-taxonomy}.test.mjs`,
  `packages/ui-cli/tests/figma/sync.test.mjs`
- `packages/ui-cli/README.md` (the `import-layers.ts` row)
- `CONTRIBUTING.md` (the folder list)
- `.agents/skills/pagopa-ui-standards/references/definition-of-done.md` (the
  layer lines)
- `docs/plans/improvements/reports/11.md`

## Steps

### 1. Measure

1. `wc -l packages/pagopa-ui/src/components/templates/figma/*` (expected
   about 1,100 lines in 9 files).
2. The registry entries that point at the folder, by status:

   ```sh
   node -e 'const r=require("./packages/pagopa-ui/src/catalog/figma/registry.json");const c={};for(const e of Object.values(r.entries)){const t=e.target||{};const m=[t.module,...(t.additionalTargets||[]).map(x=>x.module)];if(m.some(x=>(x||"").includes("components/templates/")))c[e.status]=(c[e.status]||0)+1};console.log(c)'
   ```

   Expected: `{ mocked: 19, implemented: 5 }`. Any other value is fine; record it.

3. `pnpm nx run pagopa-ui:foundation:check -- --measure`: record every count.
4. `pnpm nx run pagopa-ui:build`, then
   `shasum -a 256 packages/pagopa-ui/dist/*.css`: record the hashes.
5. Under the heavy lock, record a host visual reference (temporary folder,
   never committed):

   ```sh
   pnpm nx run pagopa-ui-storybook:build && \
   cd apps/storybook && VISUAL_SNAPSHOT_DIR=/tmp/pagopa-ui-visual-11 \
     pnpm exec playwright test -c visual/playwright.config.ts --update-snapshots=all
   ```

Done when: the five results are in the report and `/tmp/pagopa-ui-visual-11`
holds PNG files.

### 2. Let the registry point outside the package

In `packages/ui-cli/src/figma/sync.ts`, the two existence checks on
`entry.target.module` and `pair.module` (around lines 897 and 907) use
`path.join(ROOT, …)`. Replace both with `absolutePath(…)` from
`../lib/paths.ts`. It already reads `apps/…` against the workspace root and
`src/…` against the package. `runtimeExports` already goes through the same
helper, so nothing else changes.

In `packages/ui-cli/tests/figma/sync.test.mjs`, next to the existing test
that uses `src/components/templates/demo.tsx`, add two tests:

- a registry entry whose module is `apps/storybook/src/templates/demo.tsx`
  (written in the fixture workspace) passes;
- the same entry without the file fails with `module not found`.

Follow the fixture pattern of the neighbouring test. If the fixture helper
cannot create files under `apps/`, extend it, but only for that.

Done when: `pnpm nx run pagopa-ui-cli:test` passes.

### 3. Let the foundation check scan the new folder

In `packages/ui-cli/src/checks/foundation.ts`, `measure` walks only
`COMPONENTS` (`src/components`).

1. Add `const TEMPLATES = "apps/storybook/src/templates"`.
2. Make `measure` walk both roots. For `TEMPLATES`, walk
   `absolutePath(TEMPLATES)` and report each occurrence's `file` as a
   workspace-relative path (`apps/storybook/src/templates/LogIn.tsx`), so
   exception entries match it.
3. A missing `TEMPLATES` folder yields no files (`walkFiles` already returns
   `[]`): the package-only fixtures keep working.
4. Add a test in `foundation.test.mjs`: a hex colour in a fixture file under
   `apps/storybook/src/templates/` is counted.

Done when: `pnpm nx run pagopa-ui-cli:test` passes, and `foundation:check`
still passes on the unmoved tree with the counts from step 1.3.

### 4. Move the files

```sh
mkdir -p apps/storybook/src/templates
git rm -q packages/pagopa-ui/src/components/templates/figma/index.ts
for f in packages/pagopa-ui/src/components/templates/figma/*; do
  git mv "$f" apps/storybook/src/templates/
done
```

Then:

1. Check that nothing imported the barrel:
   `git grep -n 'components/templates/figma"' -- apps packages` prints nothing.
2. In the five story files, change
   `from "@/components/templates/figma/<Name>"` to `from "./templates/<Name>"`.
3. In `registry.json`, replace every
   `src/components/templates/figma/` with `apps/storybook/src/templates/`
   (a single exact-string replacement; touch no other field).
4. In `foundation-exceptions.json`, change every `file` that starts with
   `src/components/templates/figma/` the same way.
5. In `apps/storybook/vite.config.ts`, delete the coverage `exclude` entry for
   `src/components/templates/**`; keep `"**/*.stories.*"`.
6. In `packages/pagopa-ui/src/library.css`, delete the line
   `@source not "../src/components/templates";`.
7. `git grep -n 'components/templates' -- ':!docs/plans' ':!packages/ui-cli/tests'`
   prints only the lines that step 5 handles.

Done when: `packages/pagopa-ui/src/components/templates` no longer exists, and
`pnpm nx run-many -p pagopa-ui pagopa-ui-storybook -c=ci -t typecheck,lint`
passes. A lint finding in a moved file is fixed with a code change that
doesn't alter rendering; never with a disable (rule 4).

### 5. Retire the `templates` layer

In `packages/ui-cli/src/checks/import-layers.ts`:

1. Add `"templates"` to `REMOVED_LAYERS`.
2. Remove the `["templates", …]` entry from `allowedLayers()` and
   `&& layer !== "templates"` from the third-party condition.
3. Rewrite the comment above `THIRD_PARTY`: third-party runtimes are imported
   only from the primitives layer.

In `packages/ui-cli/tests/checks/import-layers.test.mjs`, the fixtures under
`src/components/templates/` test the layer this step removes. This step
explicitly allows rewriting them:

- the test that allowed a template to import a family now asserts
  `removed layer must not exist`;
- the test that allowed a template to import a third-party runtime now asserts
  the same error;
- the other fixtures that use a templates file only as a neutral importer move
  it to `src/lib/demo.ts`, keeping their assertion.

Never delete a test; record each rewritten test in the report.

In `story-taxonomy.test.mjs`, line 39 is a comment: change "implemented as the
templates layer" to "implemented as Storybook templates".

Done when: `pnpm nx run pagopa-ui-cli:test` and
`pnpm nx run pagopa-ui:layers:check` pass.

### 6. Nx inputs

`figma:check` and `foundation:check` read files under `apps/storybook/src`,
but their inputs are only `default` and `tooling`. Nx could therefore replay a
cached pass after a template or story change. In
`packages/pagopa-ui/project.json`, give both targets:

```json
"inputs": ["default", "tooling", "{workspaceRoot}/apps/storybook/src/**/*"]
```

Done when: `pnpm nx show project pagopa-ui --json` shows that `inputs` array
on both targets, and editing one character in a moved template, then running
`pnpm nx run pagopa-ui:foundation:check`, is not a cache hit. Revert the edit
afterwards.

### 7. Prove nothing changed

1. `pnpm nx run pagopa-ui:figma:check` passes, with the same
   `implemented · pending` line as on `main`.
2. `pnpm nx run pagopa-ui:foundation:check -- --measure` prints the counts
   from step 1.3, unchanged.
3. `pnpm nx run pagopa-ui:build`; the CSS hashes equal step 1.4.
4. Under the heavy lock: `pnpm nx run pagopa-ui-storybook:build`, then the
   visual comparison against the reference:

   ```sh
   cd apps/storybook && VISUAL_SNAPSHOT_DIR=/tmp/pagopa-ui-visual-11 \
     pnpm exec playwright test -c visual/playwright.config.ts
   ```

   No screenshot fails.

5. Under the heavy lock: `pagopa-ui-storybook:test:stories`,
   `pagopa-ui-storybook:test:coverage`, `pagopa-ui:library:check`.

Done when: all five hold. When a hash or a screenshot differs, find the cause
(usually a Tailwind class that is no longer scanned), at most two attempts
(rule 13).

### 8. Documentation

1. `CONTRIBUTING.md`: delete the bullet
   `` `src/components/templates` — private page modules and demos. `` In the
   bullet that starts with `` `apps/storybook` — the documentation
   application: ``, change "the stories, the component guides" to "the
   stories, the Figma page templates (`src/templates`, never shipped), the
   component guides".
2. `definition-of-done.md`, around lines 14–19: drop "private page modules
   and demos in `templates`" from the layer sentence, and change the chain to
   `` `primitives`/`icons` ← families ← stories and page templates ``. Add one
   sentence: page templates live in `apps/storybook/src/templates` and may
   import any layer through `@/…`.
3. `packages/ui-cli/README.md`, the `import-layers.ts` row: replace "the
   families and `templates`" with "the families", and add "`templates`" next
   to the retired `screens` path.

Done when: `pnpm nx run pagopa-ui:docs` passes.

## Acceptance

Quick:

```sh
pnpm nx run-many -p pagopa-ui pagopa-ui-storybook pagopa-ui-cli -c=ci -t fmt,lint,typecheck
pnpm nx run-many -p pagopa-ui -t figma:check,foundation:check,layers:check,docs
pnpm nx run pagopa-ui-cli:test
test ! -e packages/pagopa-ui/src/components/templates
```

Heavy (under the lock): the step 7 visual comparison,
`pagopa-ui-storybook:test:stories`, `pagopa-ui-storybook:test:coverage`,
`pagopa-ui:library:check`.

## Stop conditions

- `figma:check` fails after step 4 with an error that step 2 doesn't explain
  (for example a story-identity mismatch), and two attempts don't fix it.
- A foundation count changes after the move and the cause is not the scan
  roots of step 3.
- More than 3 screenshots differ in step 7, or a CSS hash differs and the
  cause is not found.
- More than 10 lint findings in the moved files under the Storybook lint
  configuration.

## Commits

1. `feat(ui-cli): accept workspace-relative registry modules`
2. `feat(ui-cli): scan the Storybook templates in the foundation check`
3. `refactor(storybook): move the Figma page templates out of the package`
4. `feat(ui-cli): retire the templates layer`
5. `build(pagopa-ui): track Storybook sources in the Figma and foundation checks`
6. `docs: place the page templates in the Storybook app`
7. `docs(plans): report action 11`

No release bookkeeping: nothing shipped changes, as the hashes of step 7.3
prove.

## Report additions

- The step 1 measures and the step 7 results side by side.
- The rewritten import-layer tests (old assertion, new assertion).
- Lint fixes in moved files, if any.
- Person steps: none.
