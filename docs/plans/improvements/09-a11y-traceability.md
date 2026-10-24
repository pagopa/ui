# Action 09 — Accessibility traceability

| Field         | Value                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Branch        | `improve/09-a11y-traceability`                                        |
| Worktree      | `../pagopa-ui-imp-09`                                                 |
| Ports         | Storybook 6109 · static server 6209                                   |
| Depends on    | 02 merged (the API report lists the public exports)                   |
| Person gate   | none (the manual screen reader pass is a person step after merge)     |
| Report source | [../improvements.md](../improvements.md), the "accessibility" finding |

## State on 2026-10-24

- `apps/storybook/.storybook/preview.tsx` sets `a11y.test: "error"`, excludes
  `[data-base-ui-focus-guard]`, and still comments that reason with
  `.migration/project.md`. It has **no** `runOnly` tag set and no
  `config.rules`, so the `region` rule is not disabled today.
- The contract changed shape since this plan: `a11yContractAfterEach` records
  `{ id, canvas, parameters }` into `globalThis.__pagopaA11yContractSurface`,
  and `runA11yContract()` (called from `src/support/a11y-setup.ts`, a Vitest
  `afterEach`) runs the checks. Tags are **not** part of the recorded surface;
  step 3 adds them.
- `expectLiveRegions` already proves that every **visible** live region carries
  content; the new `live-region` tag proves that a story with a dynamic message
  actually announces it. Six components render live regions: `overlay`,
  `banner`, `snackbar-error-code`, `ko-state`, `table-list`, `error-summary`.
- The accessibility guide has 10 rows in "Criteria by component type".
- `packages/pagopa-ui/etc/pagopa-ui.api.md` does not exist yet: this action
  waits for 02, as its "Depends on" says.

## Goal

The automatic layer is strong (axe on every story, the shared contract, the
reflow and forced-colours conditions). Three gaps keep it from being evidence
for a Public Administration accessibility statement:

1. axe runs its default rule set. Which WCAG level is checked is implicit and
   changes with the axe version.
2. The contract checks that a visible `role="alert"` has content, but nothing
   proves that a story with a dynamic message actually announces it through a
   polite or assertive region.
3. The criteria table in the accessibility guide is per component type, and
   nothing ties a public component to a row. A new export can ship without a
   declared conformance.

After this action: axe runs an explicit WCAG tag set, stories with a dynamic
announcement prove it, and a check fails when a public component has no row in
a conformance map.

## Decisions (final, do not reopen)

- axe tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`,
  `best-practice`. WCAG 2.2 AA is the guide's working reference and a superset
  of 2.1 AA (AgID).
- The `region` rule stays disabled (stories are fragments, not pages).
- The conformance map is JSON next to the guide. The guide table stays the
  human view; the check ties the two by type name.
- The manual screen reader pass is a person step. This action doesn't fill in
  any manual outcome.

## Ownership

Allowed:

- `apps/storybook/.storybook/preview.tsx` (the `a11y` block and the comment
  that names `.migration/project.md`)
- `apps/storybook/src/support/a11y-contract.ts`
- `apps/storybook/src/*.stories.tsx` (the `live-region` tag and fixes that a
  new axe rule requires)
- `apps/storybook/src/guides/accessibility.md`
- `apps/storybook/src/a11y/conformance.json` (new)
- `packages/ui-cli/src/checks/a11y-conformance.ts` (new), its test,
  `packages/ui-cli/src/cli.ts` (register the check),
  `packages/ui-cli/package.json` (one script)
- `packages/pagopa-ui/project.json` (one target and one `test.dependsOn` entry)
- `packages/pagopa-ui/src/components/**` only for a real violation the new tags
  find (step 2)
- `packages/pagopa-ui/CHANGELOG.md`, `.nx/version-plans/**` (only if a
  component changes)
- `docs/plans/improvements/reports/09.md`

## Steps

### 1. Measure

1. `grep -c "" apps/storybook/src/guides/accessibility.md` and the number of
   rows in its "Criteria by component type" table.
2. The PascalCase runtime exports in `packages/pagopa-ui/etc/pagopa-ui.api.md`:
   lines matching `^export (declare )?(function|const|class) [A-Z]`. Count
   them.
3. The components that render a live region:

   ```sh
   grep -rlE 'aria-live|role="(status|alert|log)"' packages/pagopa-ui/src/components --include=*.tsx
   ```

4. Under the heavy lock, `pnpm nx run pagopa-ui-storybook:test:coverage` and
   record pass/fail counts.

Done when: the four results are in the report.

### 2. Explicit axe tags

In `.storybook/preview.tsx`, extend `parameters.a11y`:

```ts
a11y: {
  test: "error",
  options: {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
    },
  },
  config: { rules: [{ id: "region", enabled: false }] },
  context: { exclude: [["[data-base-ui-focus-guard]"]] },
},
```

Rewrite the comment above `context` so it no longer points at
`.migration/project.md` (that file doesn't exist): keep the reason in one
sentence. Add one comment line above `runOnly`: "WCAG 2.2 AA, the
accessibility guide's working reference."

Run `test:coverage` under the lock. For each new failure:

- a real violation in a component → fix the component (the smallest change;
  record it);
- a violation only in a story fixture → fix the story;
- a rule that cannot apply to an isolated story (like `region`) → disable it
  in `config.rules` with a one-line reason, and list it in the report.

Done when: `test:coverage` passes, and the report lists every new failure and
how it was resolved.

### 3. The `live-region` contract

1. In `a11y-contract.ts`, add `expectAnnouncement(canvas)`, called from
   `runA11yContract()` only when the story's tags include `live-region`.
   Extend the recorded `StorySurface` with `tags: string[]`, set from
   `context.tags` in `a11yContractAfterEach`, and read it in
   `runA11yContract()` like `parameters`.
2. It asserts that, after the story's `play`, the canvas or the document
   contains at least one visible element matching
   `[role='status'],[role='alert'],[role='log'],[aria-live='polite'],[aria-live='assertive']`
   whose trimmed text is not empty. Message:
   `a live-region story must announce content: <story id>`.
3. Tag `live-region` on the stories that show a dynamic message for each
   component found in step 1.3 (at least one story per component; prefer a
   story with a `play` that triggers the message). If a component has no such
   story, write it in the report; don't add one.
4. Prove the check: temporarily remove the content of one tagged story's
   region, run that story file, see it fail, restore it. Don't commit the
   temporary change.
5. Document the tag in one sentence in the guide, "How the criteria are
   verified", next to the live region bullet.

Done when: `test:stories` (under the lock) passes and the negative check in
3.4 failed as expected.

### 4. The conformance map

1. Create `apps/storybook/src/a11y/conformance.json`:

   ```json
   {
     "types": ["Button", "Field", "…every row name of the guide table"],
     "components": {
       "Button": { "type": "Button" },
       "UIProvider": { "type": null, "reason": "renders no UI" }
     }
   }
   ```

   - `types` are the first-column values of the guide's "Criteria by component
     type" table, exactly as written.
   - Every PascalCase runtime export from step 1.2 gets an entry. Use a guide
     type when one fits by role (a link list is "Navigation and breadcrumb", a
     snackbar is "Notifications and alerts"); otherwise `type: null` with a
     one-line `reason`.
   - When more than 5 exports need a type the table doesn't have, add rows to
     the guide table instead of using `null`: the criteria and verification
     follow the closest existing row, and the outcome says "Passing on the
     automatic layer".

2. Create `packages/ui-cli/src/checks/a11y-conformance.ts`, exposed as
   `node src/cli.ts check a11y-conformance` and following the pattern of the
   other checks registered in `packages/ui-cli/src/cli.ts`. It fails when:
   - a PascalCase runtime export of the API report has no entry;
   - an entry names an export that no longer exists;
   - a `type` is not in `types`;
   - a `types` value is not a first-column value of the guide table;
   - a `null` type has no `reason`.
3. Script `"a11y:conformance:check": "node src/cli.ts check a11y-conformance"`
   in `packages/ui-cli/package.json`, a target `a11y:conformance:check` in
   `packages/pagopa-ui/project.json` (same shape as `foundation:check`), and
   that target added to `test.dependsOn`.
4. Tests with fixtures: one per failure kind, and one passing case.
5. In the guide, under the table, one sentence: the map in
   `apps/storybook/src/a11y/conformance.json` assigns every public component to
   a row, and `a11y:conformance:check` keeps it complete.

Done when: `pnpm nx run pagopa-ui:a11y:conformance:check` passes,
`pnpm nx run pagopa-ui-cli:test` passes, and adding a fake line
`export declare function Probe(): null` to a copy of the API report used by a
test makes that test fail.

### 5. Guide wording

In `accessibility.md`:

1. "How the criteria are verified", first bullet: name the axe tags.
2. The intro paragraph keeps WCAG 2.2 AA and adds that it covers the WCAG 2.1
   AA level that AgID requires. One sentence.

Don't rewrite other sections.

Done when: `pnpm nx run pagopa-ui:docs` passes.

## Acceptance

Quick:

```sh
pnpm nx run-many -p pagopa-ui pagopa-ui-storybook pagopa-ui-cli -c=ci -t fmt,lint,typecheck
pnpm nx run pagopa-ui:a11y:conformance:check
pnpm nx run pagopa-ui-cli:test
pnpm nx run pagopa-ui:docs
```

Heavy (under the lock): `pagopa-ui-storybook:test:coverage`,
`pagopa-ui-storybook:test:stories`.

## Stop conditions

- Step 2 produces more than 15 new failing stories, or a failure needs a
  component change that alters its visual rendering.
- `packages/pagopa-ui/etc/pagopa-ui.api.md` doesn't exist (action 02 not
  merged as planned).
- The Storybook `a11y` parameters don't accept `options`/`config` in the
  installed addon version (check
  `node_modules/@storybook/addon-a11y/README.md`).

## Commits

1. `test(storybook): run axe on an explicit WCAG 2.2 AA tag set`
2. `fix(pagopa-ui): <violation>` (one per component fix, if any)
3. `test(storybook): require an announcement in live-region stories`
4. `feat(ui-cli): check the accessibility conformance map`
5. `docs(storybook): describe the axe tags and the conformance map`
6. `docs(plans): report action 09`

## Report additions

- The new axe failures and their resolution.
- The tagged `live-region` stories, and the components without one.
- The exports mapped to `null` with their reasons.
- Person steps: run the manual screen reader pass with the guide's checklist
  on the technologies it lists, and record the
  outcomes; publish the accessibility statement annex from the guide.
