# Action 08 — Only Figma breakpoints in Tailwind

| Field         | Value                                                               |
| ------------- | ------------------------------------------------------------------- |
| Branch        | `improve/08-responsive-tokens`                                      |
| Worktree      | `../pagopa-ui-imp-08`                                               |
| Ports         | Storybook 6108 · static server 6208                                 |
| Depends on    | 01, 02 and 07 merged                                                |
| Person gate   | `G-VIS` (Linux baselines committed on `main`)                       |
| Report source | [../improvements.md](../improvements.md), the "token-first" finding |

## Goal

The token layer already defines the Figma breakpoints, with their own names:

| Token (Figma)                | Theme variable             | Width  | Variant        |
| ---------------------------- | -------------------------- | ------ | -------------- |
| `Foundations/breakpoint-sm`  | `--breakpoint-tablet`      | 600px  | `tablet:`      |
| `Foundations/breakpoint-md`  | `--breakpoint-tablet-md`   | 900px  | `tablet-md:`   |
| `Foundations/breakpoint-lg`  | `--breakpoint-desktop`     | 1200px | `desktop:`     |
| `Foundations/breakpoint-xl`  | `--breakpoint-desktop-xl`  | 1536px | `desktop-xl:`  |
| `Foundations/breakpoint-2xl` | `--breakpoint-desktop-xxl` | 1920px | `desktop-xxl:` |

No component uses them. About 100 classes use Tailwind's default `sm:`
(640px), `md:` (768px) and `lg:` (1024px), so components switch layout at
widths that don't exist in Figma. The token-first rule is broken in the one
place no check looks at.

After this action:

- components and stories use only the Figma variants;
- the Tailwind default breakpoints are removed from the theme, so `sm:` no
  longer generates CSS;
- a foundation rule rejects the default variants (ceiling 0), and two more
  rules freeze the other off-token responsive patterns (`text-*-mobile` pairs,
  default container-query sizes) so they can only decrease.

## Decisions (final, do not reopen)

- Keep the token theme keys (`tablet`, `tablet-md`, `desktop`, `desktop-xl`,
  `desktop-xxl`). Do not rename them to `sm`/`md`/`lg`: the manifest is
  generated from Figma and the keys are part of it.
- Mapping, by nearest width:

  | Old          | New            |
  | ------------ | -------------- |
  | `sm:`        | `tablet:`      |
  | `md:`        | `tablet-md:`   |
  | `lg:`        | `desktop:`     |
  | `xl:`        | `desktop-xl:`  |
  | `2xl:`       | `desktop-xxl:` |
  | `max-<old>:` | `max-<new>:`   |

  Apply it mechanically. Don't redesign any component.

- Expected visual effect at the gate widths (320, 600, 1200): only `sm:` →
  `tablet:` changes rendering, at 600. `md:` and `lg:` change behaviour only
  between 768 and 1200, which the gate doesn't capture. The person accepts the
  600 diffs with the `visual:update` label.
- Container-query sizes (`@lg:`, `@md/alert:`, `@4xl/footer:`) and the
  `text-*-mobile` typography pairs stay as they are; they get a ratchet only.
  Replacing them needs a design decision (deferred in the orchestrator file).
- `IDModule`'s `device` prop stays.

## Ownership

Allowed:

- `packages/pagopa-ui/src/components/**/*.tsx` — breakpoint variant edits only
- `apps/storybook/src/**/*.tsx` — breakpoint variant edits only
- `packages/ui-cli/src/figma/tokens.ts` (`emitCss` only)
- `packages/tokens/src/figma.generated.css`
- `packages/ui-cli/src/checks/foundation.ts` (`RULES` only) and its tests under
  `packages/ui-cli/tests/`
- `packages/tokens/src/foundation-baseline.json` (new rules' counts only)
- `.agents/skills/figma-to-code/references/{devices.md, visual-parity.md}`
- `.agents/skills/pagopa-ui-standards/SKILL.md` (one line, step 6)
- `packages/pagopa-ui/CHANGELOG.md`, `.nx/version-plans/**`
- `docs/plans/improvements/reports/08.md`

Forbidden: the token manifest (`packages/tokens/src/manifest.json`), the
visual baselines (only the CI label writes them), parity cases, the registry.

## Steps

### 1. Measure

Run and record each count:

```sh
grep -rhoE '(^|[^@a-z0-9-])(max-)?(sm|md|lg|xl|2xl):' packages/pagopa-ui/src/components --include=*.tsx | wc -l
grep -rhoE '(^|[^@a-z0-9-])(max-)?(sm|md|lg|xl|2xl):' apps/storybook/src --include=*.tsx | wc -l
grep -rhoE '(^|[^@a-z0-9-])(tablet|tablet-md|desktop|desktop-xl|desktop-xxl):' packages/pagopa-ui/src apps/storybook/src --include=*.tsx | wc -l
grep -rhoE 'text-[a-z0-9-]+-mobile\b' packages/pagopa-ui/src/components --include=*.tsx | wc -l
grep -rhoE '@(3xs|2xs|xs|sm|md|lg|xl|[2-7]xl)(/[a-z-]+)?:' packages/pagopa-ui/src/components --include=*.tsx | wc -l
```

Expected roughly: 100 · 14 · 0 · 13 · 20. Write them in the report.

Then, under the heavy lock, record a host visual reference **before** any
change (temporary folder, never committed):

```sh
cd apps/storybook && VISUAL_SNAPSHOT_DIR=/tmp/pagopa-ui-visual-08 \
  pnpm exec playwright test -c visual/playwright.config.ts --update-snapshots=all
```

Done when: the five counts are in the report and `/tmp/pagopa-ui-visual-08`
holds PNGs.

### 2. Foundation rules first

In `packages/ui-cli/src/checks/foundation.ts`, add to `RULES`:

- `default-breakpoint`:
  `/(?<![@\w-])(?:max-)?(?:sm|md|lg|xl|2xl):/g` — viewport variants come only
  from the Figma breakpoints.
- `mobile-text-class`: `/\btext-[a-z0-9-]+-mobile\b/g` — device typography
  pairs; frozen until a responsive type decision exists.
- `default-container-query`:
  `/@(?:3xs|2xs|xs|sm|md|lg|xl|[2-7]xl)(?:\/[a-z-]+)?:/g` — container sizes not
  backed by a Figma container token; frozen.

Then:

1. `pnpm nx run pagopa-ui:foundation:check -- --measure` and set the three
   counts in `packages/tokens/src/foundation-baseline.json` to the measured
   values. The ceiling for `default-breakpoint` is temporary; step 4 lowers it
   to 0.
2. One unit test per rule: one hit and one miss. The `default-breakpoint` miss
   cases must include `tablet:flex`, `@md/alert:flex` and `data-[state=open]:`.

Done when: `pnpm nx run pagopa-ui-cli:test` and
`pnpm nx run pagopa-ui:foundation:check` pass.

### 3. Remove the Tailwind default breakpoints

1. In `emitCss` (`packages/ui-cli/src/figma/tokens.ts`), inside the loop that
   writes the `breakpoint` category, emit `  --breakpoint-*: initial;` as the
   first line of that block, before the first breakpoint comment.
2. Apply the same line by hand at the same position in
   `packages/tokens/src/figma.generated.css` (there is no Figma input to
   regenerate from). `tokens:check` proves the file matches the generator.
3. Add an assertion to the existing token tests in `packages/ui-cli/tests/`
   that the emitted CSS contains `--breakpoint-*: initial;` before
   `--breakpoint-tablet:`.

Done when: `pnpm nx run pagopa-ui-tokens:test` and
`pnpm nx run pagopa-ui-cli:test` pass.

### 4. Migrate the variants

1. Write a temporary Node script in `/tmp` (never committed) that, for every
   `.tsx` file under `packages/pagopa-ui/src/components` and
   `apps/storybook/src`, replaces the regex of `default-breakpoint` with the
   mapping in "Decisions", keeping the `max-` prefix.
2. Run it, then `git diff --stat`. Review 5 random hunks: each must change
   only a variant prefix inside a class string.
3. Lower the `default-breakpoint` ceiling in `foundation-baseline.json` to 0.
4. If `foundation:check` still reports `default-breakpoint` hits (for example a
   variant built from a template string), fix them by hand with the same
   mapping.

Done when:

- `pnpm nx run pagopa-ui:foundation:check` passes with ceiling 0;
- the step-1 grep for default variants prints 0 for both folders;
- `pnpm nx run-many -p pagopa-ui pagopa-ui-storybook -c=ci -t fmt,lint,typecheck`
  passes.

### 5. Prove the visual effect

1. `pnpm nx run pagopa-ui-storybook:build` under the heavy lock.
2. Under the heavy lock, compare with the reference from step 1:

   ```sh
   cd apps/storybook && VISUAL_SNAPSHOT_DIR=/tmp/pagopa-ui-visual-08 \
     pnpm exec playwright test -c visual/playwright.config.ts
   ```

3. List the failing screenshots. Expected: only `-600` captures fail. Any
   `-320` or `-1200` failure is a mapping mistake: fix it, at most two
   attempts (rule 13).
4. Run the story suites (`test:stories`, `test:coverage`) under the lock. A
   `play` assertion that depends on a width between 640 and 1200 may change:
   fix the story only if its assertion encodes the old breakpoint, and list it.

Done when: the failing captures are all at 600 and listed in the report (story
id, one line on what moved).

### 6. Documentation

1. `devices.md`: in the section that lists the responsive variants, state that
   only `tablet:`, `tablet-md:`, `desktop:`, `desktop-xl:` and `desktop-xxl:`
   exist, with their widths, and that `default-breakpoint` rejects the
   Tailwind ones. Remove any sentence that names `sm:`, `md:` or `lg:` as a
   viewport breakpoint.
2. `visual-parity.md`: if it mentions breakpoint variants, align it the same
   way. Keep the skill agnostic (no component names).
3. `pagopa-ui-standards/SKILL.md`: where it lists the Tailwind-scale
   prohibitions (text sizes, font weights, palette), add "and the default
   breakpoints". One line.

Done when: `pnpm nx run pagopa-ui:docs` passes.

### 7. Release bookkeeping

- `CHANGELOG.md`, `### Changed`: "Responsive layouts switch at the Figma
  breakpoints (600, 900, 1200, 1536, 1920px) instead of Tailwind's defaults.
  Consumers' own `sm:`/`md:`/`lg:` classes inside library styles no longer
  apply."
- Version plan `minor` (rendering change for consumers between 600 and 1200px).

## Acceptance

Quick:

```sh
pnpm nx run-many -p pagopa-ui pagopa-ui-storybook pagopa-ui-cli pagopa-ui-tokens -c=ci -t fmt,lint,typecheck
pnpm nx run pagopa-ui:foundation:check
pnpm nx run pagopa-ui-tokens:test
pnpm nx run pagopa-ui-cli:test
pnpm nx run pagopa-ui:docs
pnpm nx release plan:check
```

Heavy (under the lock): the Storybook build, step 5, `pagopa-ui:library:check`.

## Stop conditions

- Step 5 shows more than 40 failing `-600` captures, or any `-320`/`-1200`
  failure you can't fix in two attempts.
- `--breakpoint-*: initial` breaks a non-variant utility (the build or the
  library check fails because a class like `max-w-screen-*` is missing).
- The library check (`library.spec.mjs`) fails on a layout assertion at a
  width between 640 and 1200.

## Commits

1. `feat(ui-cli): reject off-token responsive variants in the foundation check`
2. `feat(tokens): keep only the Figma breakpoints in the theme`
3. `fix(pagopa-ui): switch layouts at the Figma breakpoints`
4. `docs(skills): name the Figma breakpoint variants`
5. `chore(release): plan the breakpoint change`
6. `docs(plans): report action 08`

## Report additions

- The five counts, before and after.
- The failing `-600` captures from step 5.
- Person steps: on the pull request, review the visual diff artifacts and add
  the `visual:update` label; pause M5 burn-down sessions until merged.
