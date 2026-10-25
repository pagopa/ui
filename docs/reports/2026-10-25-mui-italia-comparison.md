# `@pagopa/ui` vs `@pagopa/mui-italia` — design system comparison

Date: 2026-10-25
Local snapshot: `@pagopa/ui` 0.0.1 at `a8b3fa4` (clean tree)
External snapshot: `@pagopa/mui-italia` 2.7.0 at `4a8f138` (`develop`, shallow clone)

## 1. Scope and method

Two codebases were read side by side, not two websites:

- **`@pagopa/ui`** — the Nx monorepo in this directory: `packages/pagopa-ui`
  (components), `packages/tokens` (design foundations), `packages/artwork`
  (icons and pictograms), `packages/ui-cli` (checks and Figma tooling),
  `apps/storybook` (stories, guides, accessibility support).
- **`@pagopa/mui-italia`** — a single-package repository: a Material UI v5
  theme plus 54 component re-exports, Storybook 10, Chromatic, semantic release.

Measurements come from the working trees (file counts, package manifests, CI
workflows, API reports, budget files). No build or test suite was executed for
either project during this review, so the numbers describe **declared and
configured** guarantees, not a green run. Where a claim depends on a run
(coverage, browser passes), it is labelled as a gate rather than a result.

The comparison is asymmetric by nature: `mui-italia` is a **theme over MUI**,
so part of its component behaviour, accessibility and performance is inherited
from `@mui/material`; `@pagopa/ui` builds its own primitives on Base UI. The
report separates what each project owns from what it inherits.

## 2. Executive summary

`@pagopa/ui` is the more rigorously engineered system: explicit design tokens
generated from Figma, per-module ESM output, a machine-checked text and
accessibility contract, coverage gates, multi-engine browser tests, a CSS
payload budget and a Figma drift/parity pipeline. It is also **young and not
yet distributable at scale**: version 0.0.1, `UNLICENSED`, GitHub Packages only,
React 19 only, first release pending.

`mui-italia` is the more **adopted and operationally proven** system: public
npm, MIT, five years of public releases and production use across PagoPA
products, mature semantic release, Chromatic on every pull request. It is
also **technically dated and lightly tested**: MUI v5 (two majors behind),
React 18 peer, Emotion runtime, ESLint 8
(EOL), Babel pipeline, 19 test files for 55 component folders, no coverage
gate, no automated accessibility assertions, no Figma traceability.

| Dimension                   | `@pagopa/ui` | `mui-italia` | Winner                     |
| --------------------------- | -----------: | -----------: | -------------------------- |
| Component quality           |          4.0 |          3.0 | `@pagopa/ui`               |
| Tests                       |          5.0 |          2.0 | `@pagopa/ui`               |
| Accessibility               |          5.0 |          3.0 | `@pagopa/ui`               |
| DX — consumer               |          3.0 |          4.0 | `mui-italia`               |
| DX — maintainer             |          3.0 |          3.0 | tie (different trade-offs) |
| Technology stack            |          5.0 |          2.0 | `@pagopa/ui`               |
| Figma alignment             |          5.0 |          2.0 | `@pagopa/ui`               |
| Performance                 |          4.0 |          2.0 | `@pagopa/ui`               |
| **Average (equal weights)** |     **4.25** |     **2.60** | **`@pagopa/ui`**           |

Scores are 1–5 and compare the two systems to each other, not to the market.
Equal weights are used because the brief asked for eight dimensions; a team
that values adoption over engineering should weight consumer DX and licensing
much higher, and the gap narrows sharply.

## 3. Snapshot

|                   | `@pagopa/ui`                                          | `mui-italia`                                      |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------- |
| Repository shape  | Nx monorepo, 4 packages + 1 app                       | single package                                    |
| Version / licence | 0.0.1, `UNLICENSED`                                   | 2.7.0, MIT                                        |
| Registry          | GitHub Packages (auth required)                       | public npm                                        |
| First release     | pending                                               | 0.3.0 in 2021, 122 stable versions, 1,313 commits |
| React             | 19.2 peer only                                        | 18.3 peer                                         |
| UI foundation     | Base UI headless + CVA + Tailwind v4                  | Material UI v5 + Emotion                          |
| Public components | 111 runtime exports (API Extractor)                   | 54 re-export entries across 55 folders            |
| Component modules | 113 `.tsx` across 7 families + primitives             | 55 folders, theme overrides                       |
| Stories           | 95 files, 488 story exports                           | 68 files, 288 story exports                       |
| Guides / docs     | 52 guides + ADRs + glossary                           | 21 MDX docs + README                              |
| Unit tests        | 3 Node suites                                         | 19 suites, 150 `it()`                             |
| Behaviour tests   | every story runs in a real browser                    | Testing Library in jsdom                          |
| Coverage gate     | 90/83/90/90 + per-file gates                          | none (Codecov commented out)                      |
| Accessibility     | automated contract + conformance map                  | addon + written review checklist                  |
| Visual regression | Playwright snapshots + Chromatic                      | Chromatic (`--only-changed`)                      |
| Figma             | inventory 353 nodes, 300 parity cases, drift workflow | optional links in stories                         |
| Release           | Nx version plans, release PR                          | semantic-release, RC tags, CHANGELOG              |
| Lint / format     | oxlint (95/119 shared rules), oxfmt                   | ESLint 8 (EOL), Prettier 3                        |
| Build             | Vite 8, `preserveModules`, per-module `"use client"`  | Babel + `tsc` + `tsc-alias`                       |
| Package manager   | pnpm 11, Node 24                                      | Yarn 3, Node 22                                   |

## 4. Component quality

### `@pagopa/ui`

- **Layered architecture.** `primitives` (31 files) sit under seven families
  (`inputs`, `navigation`, `feedback`, `content`, `data-display`,
  `composites`, `overlays`), so a consumer can compose or replace at the right
  level. `layers:check` enforces the import direction.
- **Variants are typed data, not ad-hoc styles.** `button.tsx` declares 11
  variants and 8 sizes with CVA, and documents the forced-colors decision in a
  comment — the pattern repeats across the library.
- **Behaviour is deliberate.** The button keeps a busy action in the tab order
  (`focusableWhenDisabled`) so keyboard and screen-reader users are not
  stranded; outlined strokes use inset rings _and_ a real border under forced
  colors.
- **Text is a contract, not a string.** Every user-facing default lives in the
  UI provider's message dictionary (`en.ts` / `it.ts`), and
  `check text-defaults` fails on a literal default in a component. A consumer
  can translate the whole system.
- **API surface is reviewed.** `etc/pagopa-ui.api.md` (1,710 lines, 111 runtime
  exports: 106 functions and 5 constants) is generated by API Extractor, so a
  breaking change is visible in review.
- **Domain coverage is comparable.** Checkout, payment, product, organisation,
  attachment modules, identity-provider picker, PSP logos, microevento, header,
  footer, preheader, side nav: the PagoPA product vocabulary is present.

Weakness: the components are **young and unproven in production**. There is no
public adopter list, no long tail of real-world edge cases, and the repository
has 215 commits. Architectural quality is not the same as hardening.

### `mui-italia`

- **MUI behaviour for free.** Focus management, menus, selects and form
  semantics come from `@mui/material`, which is mature and widely exercised.
- **Deep PagoPA domain knowledge.** `HeaderProduct`, `FooterPreLogin` /
  `FooterPostLogin` / `FooterCheckout`, `TOSAgreement`, `Walkthrough`,
  `MISpidSelectOIDialog`, `PartySwitch`, `ProductSwitch`: these encode years of
  product decisions and are the real reason applications depend on the package.
- **Theme-first philosophy.** The README asks consumers to "use all the
  standard library + this theme" and avoid custom styles; `theme.ts` is 1,029
  lines of tokens and overrides.
- **Weaknesses.** Styling is split between the global theme and per-component
  `sx`/`styles.ts`, so a variant can be expressed in two places. Several
  user-facing strings are hard-coded Italian defaults and only partly
  overridable (`MIButtonLoader` `'Caricamento in corso'`, `LangSwitch`
  `Seleziona lingua: …`, `ProductSwitch` `aria-labelledby`, `PartySwitch`
  `Nessun ente trovato`). There is no generated API report, so prop changes are
  caught only by TypeScript at the consumer.

**Verdict:** `@pagopa/ui` 4.0, `mui-italia` 3.0. `@pagopa/ui` has the better
design and the stronger contracts; `mui-italia` has the better battle record.

## 5. Tests

### `@pagopa/ui`

- **Three layers, each with a purpose.** Three Node unit suites for pure logic
  (`field-utils`, `pagination-utils`, `ui-provider`), the story suite as the
  behaviour layer, and Playwright visual snapshots.
- **Stories are the test suite.** `@storybook/addon-vitest` runs all 488 story
  exports in a real browser. The coverage gate is **90% statements, 83%
  branches, 90% functions, 90% lines**, with stricter per-file gates for
  `autocomplete`, `select-field`, `drag-and-drop`, `field-utils`,
  `form-control-utils`, `button`, `date-picker` and `calendar`.
- **Engine strategy is explicit.** Chromium carries v8 coverage on every PR,
  WebKit proves the PR, Firefox + WebKit run nightly. The same split applies to
  the packed artifact.
- **The artifact is tested, not just the source.** `library:check` installs the
  packed tarball into a plain app and runs it on three engines — the check that
  catches a missing `exports` entry or a broken `"use client"`.
- **Visual regressions are owned in-repo.** Playwright snapshots plus Chromatic.
- **Ratchets, not wishes.** Coverage thresholds "follow current coverage with a
  small margin and never go down".

Weakness: the suite is **expensive**. Browser projects, three engines, a packed
artifact and a 60 s timeout for the icon catalogue make CI heavy, and the
package itself keeps only three unit suites, so a failure in a story is the
first signal for most logic.

### `mui-italia`

- 19 test files, 150 `it()` blocks, covering **12 of 55 component folders**
  (~22%). Most components have no behavioural test at all.
- Tests use Testing Library well where they exist (`getByRole`, `toBeChecked`,
  `fireEvent`), so the quality per test is good; the coverage is the problem.
- No coverage threshold. The Codecov steps in `code-review.yml` are commented
  out.
- Chromatic runs `--only-changed`, so visual review is real but depends on a
  human accepting the snapshot.
- CI does run `yarn test`, `yarn lint` and `yarn build` on pull requests.

**Verdict:** `@pagopa/ui` 5.0, `mui-italia` 2.0. This is the widest gap in the
comparison and the least arguable one.

## 6. Accessibility

### `@pagopa/ui`

- **A shared contract, inherited by every story.** `a11y-contract.ts` runs
  after each story and verifies the ARIA APG behaviour for the widgets actually
  rendered (focus guards, popup roles, group semantics, tab order), then
  re-runs the layout at **320 px reflow, increased text spacing and zoom**.
- **More than one environment.** The contract also runs with `forcedColors:
  active` and `reducedMotion: reduce`.
- **Coverage is enforced structurally.** `check a11y-conformance` maps every
  PascalCase runtime export of the API report to a row of the accessibility
  guide, so a new export cannot ship without a declared conformance type.
- **Guide and map are tied.** `guides/accessibility.md` is the human view;
  `src/a11y/conformance.json` is the machine one.
- Storybook's `addon-a11y` is present as a manual aid, not as the gate.

Weakness: the contract is **presence-driven and bespoke**, not a full axe-core
rule set. It proves the patterns the team encoded; it does not claim WCAG
conformance across every rule.

### `mui-italia`

- `@storybook/addon-a11y` is installed, so violations are visible in Storybook
  and in Chromatic review, but **nothing asserts them in CI** (no `axe` or
  `toHaveNoViolations` anywhere in `src`).
- A serious written review checklist exists
  (`.github/instructions/accessibility.instructions.md`): semantics, keyboard,
  focus, accessible names, live regions, translatable labels. It is guidance
  for reviewers, not an executable check.
- The underlying MUI components are accessible by default, which raises the
  floor considerably.
- Hard-coded Italian `aria-label` values in some components undermine the
  translatable-labels rule the checklist itself states.

**Verdict:** `@pagopa/ui` 5.0, `mui-italia` 3.0. MUI gives `mui-italia` a high
floor; `@pagopa/ui` has a ceiling that is actually verified.

## 7. DX — consumer

### `@pagopa/ui`

Strengths:

- **One import for styles, typed subpath exports** (`.`, `./styles.css`,
  `./tokens`, `./tokens.css`), so tokens can be consumed without the component
  stylesheet.
- **No Tailwind, shadcn or repository aliases required** by the consumer; the
  build ships compiled CSS, fonts, artwork and declarations.
- **Per-module ESM with `"use client"` on browser modules**, documented for
  Next.js App Router: a Server Component imports only what it needs.
- **Router integration and i18n are first-class**: `UIProvider` takes a
  `linkComponent` and the message dictionary.
- **A real install guide**, including `.npmrc` for the scoped registry and the
  exact peer requirements.

Weaknesses, and they are significant:

- **GitHub Packages only.** Every consumer needs a PAT with `read:packages`.
  This is friction in CI, in onboarding and in any environment that cannot
  authenticate to GitHub.
- **`UNLICENSED`.** Adoption outside PagoPA is legally blocked, and even inside
  the group a new team must ask before using it.
- **React 19.2 only.** Applications still on React 18 cannot adopt it, which is
  most of the current PagoPA estate.
- **0.0.1 and "first release pending".** No deprecation policy, no migration
  history, no proven upgrade path.
- **New API vocabulary.** Consumers must learn `UIProvider`, the token
  contract and the family structure; there is no MUI familiarity to lean on.

### `mui-italia`

Strengths:

- **`npm install` and go.** Public registry, MIT, no auth.
- **MUI is a known quantity.** Any React developer already knows the API; the
  theme is additive and the escape hatch (`sx`) is familiar.
- **Deep, documented domain components** with 21 MDX pages and a Storybook
  published on Chromatic.
- **A published changelog and RC channel**, so consumers can stage upgrades.

Weaknesses:

- **Seven peer dependencies** (`@mui/material`, `@mui/system`, `@mui/lab`
  alpha, `@mui/x-date-pickers`, `@mui/icons-material`, Emotion ×2) that the
  consumer must align and keep aligned.
- **React 18 peer** blocks React 19 applications.
- **Hard-coded Italian strings** in several components force workarounds for
  multilingual products.
- **No SSR/RSC guidance**; Emotion requires cache wiring for streaming SSR,
  which the README does not cover.

**Verdict:** `@pagopa/ui` 3.0, `mui-italia` 4.0. Engineering quality does not
compensate for an install path that most consumers cannot use yet.

## 8. DX — maintainers

### `@pagopa/ui`

Strengths:

- **Nx affected graph**: a change runs only the projects and targets it
  touches; `nx show project` is the entry point for every task.
- **Deterministic checks for the fuzzy things**: import layers, doc links,
  token manifest vs generated CSS/TS, artwork provenance and identity,
  `"use client"` directives, public tokens, text defaults, a11y conformance,
  CSS budget, packed artifact.
- **Generated code is verified byte for byte**, so a "fix" pass cannot silently
  rewrite the artwork or token modules.
- **Modern toolchain**: Node 24, pnpm 11, Vite 8, Vitest 5, TypeScript 6/7
  preview, oxlint/oxfmt. Renovate keeps it current.
- **Release is a reviewed pull request**, not a push from CI: version plans in
  `.nx/version-plans`, changelog and consumed plan in the same commit.

Weaknesses:

- **Enormous process surface.** Skills, a rules ledger, a parity evidence
  ledger, drift triage, device policy, note-length baselines, CSS budget,
  exceptions files. A new contributor must learn the workflow before writing a
  component.
- **No remote Nx cache**, by an explicit decision documented in
  `docs/plans/pipeline-proposal.md`, so CI redoes work on every runner.
- **Browser-heavy feedback loop.** The fast path is narrow; the full pass is
  the gate.
- **The system is pre-1.0**, so the maintainers are still inventing the
  conventions they will have to live with.

### `mui-italia`

Strengths:

- **A single package with a single build**: `yarn build` runs Babel, `tsc`,
  `tsc-alias` and writes a publish-ready `package.json` into `dist`.
- **Release automation is mature**: semantic-release with a custom preset, RC
  tags, generated changelog, npm publish from an artifact.
- **Familiar structure**: one folder per component, co-located stories and
  tests, no workspace graph to learn.
- **Dependabot and a PR template** keep routine maintenance moving.

Weaknesses:

- **Dated toolchain**: ESLint 8 is end-of-life, Yarn 3 (not 4), Babel instead
  of a bundler, `tsconfig` target ES2020, Storybook `typescript.check: false`.
- **Weak safety net** makes refactoring risky: sparse tests, no coverage gate,
  no API report, no artifact consumer test.
- **17 open pull requests and 2 open issues** on the public repository suggest
  review capacity, not abandonment.
- **Documentation drift risk**: 21 MDX pages for 55 components, and no check
  that a component has a story or a guide.

**Verdict:** 3.0 vs 3.0. `@pagopa/ui` trades onboarding cost for guarantees;
`mui-italia` trades guarantees for simplicity. Neither is obviously better for
a maintainer; they fail in opposite directions.

## 9. Technology stack

| Layer           | `@pagopa/ui`                                 | `mui-italia`                   |
| --------------- | -------------------------------------------- | ------------------------------ |
| Runtime UI base | Base UI 1.9 (headless)                       | Material UI 5.14               |
| Styling         | Tailwind CSS 4, compiled                     | Emotion 11 (runtime CSS-in-JS) |
| Variants        | CVA                                          | theme + `sx`                   |
| React           | 19.2                                         | 18.3                           |
| Build           | Vite 8 library mode, `preserveModules`       | Babel 7 + `tsc` + `tsc-alias`  |
| Types           | API Extractor report, `verbatimModuleSyntax` | `tsc` declarations only        |
| Test            | Vitest 5 browser + Playwright                | Vitest 3 + jsdom               |
| Docs            | Storybook 10 + 52 guides                     | Storybook 10 + 21 MDX          |
| Lint            | oxlint (Rust)                                | ESLint 8 (EOL)                 |
| Workspace       | Nx 23 + pnpm 11                              | none, Yarn 3                   |
| Node            | 24                                           | 22                             |

`@pagopa/ui` is on a current, coherent stack with a clear upgrade path.
`mui-italia` is on a stack that still works but is **two MUI majors and one
React major behind**, with an EOL linter and a transpile-only build. The risk
is not that it breaks today; it is that the next upgrade (MUI 7, React 19,
ESLint 9) is a large, untested migration.

**Verdict:** `@pagopa/ui` 5.0, `mui-italia` 2.0.

## 10. Figma alignment

### `@pagopa/ui`

This is the system's strongest differentiator and it is fully automated:

- **Inventory**: 353 Figma components/nodes with variant axes, dependencies and
  asset keys.
- **Registry and rules ledger**: per-node briefs, `.Regole` cards, open
  comments, design requests; `figma:rules` keeps the committed English ledger
  and a node is not finished while a targeting rule is `pending` or `stale`.
- **Parity cases**: 300 explicit code↔Figma cases, verified in CI
  (`figma:parity:verify`) before the coverage job.
- **Device policy**: a canonical width per device (`mobile: 320`) and named
  aliases, so a Figma "XS Mobile" and a code breakpoint cannot drift apart.
- **Drift workflow**: a scheduled check opens the drift pull request; triage is
  a documented, queued process, not an ad-hoc audit.
- **Tokens are generated**: `packages/tokens` emits CSS custom properties and
  typed TS from the Figma foundations; `tokens:check` compares manifest,
  generated CSS and TS.
- **Figma is read-only** by policy: the repository reads the file and never
  writes to it.

Weakness: the process is **heavy and Figma-coupled**. A design change can
create a queue of nodes, evidence exceptions and a drift PR; the maintainers
pay for traceability with throughput.

### `mui-italia`

- Figma appears only as an **optional link in story documentation**; the
  contributor instructions say to ask for it and to use a TODO when missing.
- There is no inventory, no node registry, no parity suite and no drift check.
- Tokens live in `src/tokens` (`colors/italia.ts`) and `theme.ts`, maintained by
  hand. Whether they still match the Figma library is a human question.
- The design-system instructions for Copilot are written in Italian and
  describe conventions, not a verifiable link to the file.

**Verdict:** `@pagopa/ui` 5.0, `mui-italia` 2.0. This is a category difference,
not a degree.

## 11. Performance

### `@pagopa/ui`

- **No runtime CSS-in-JS.** Styles are compiled at build time into one
  stylesheet; rendering does not serialize styles per component.
- **Per-module ESM output.** 492 JS modules, `preserveModules`, one ES module
  per source module, so a consumer bundler keeps each client boundary and
  imports only what it uses. The whole library is ~112 KB gzip of JS; a typical
  page imports a fraction.
- **CSS is budgeted.** The published stylesheet is 128,373 bytes raw and
  21,600 bytes gzip against ceilings of 200,000 / 30,000 / 20,000 (raw / gzip /
  brotli). Growth fails the build; a drop wider than the slack must be recorded
  with a reason.
- **Tokens can ship alone** (`tokens.css`), so a page that only needs colours
  and spacing does not pay for the component stylesheet.
- **Fonts and artwork are bundled** (Titillio, SVG catalogue), which is good
  for determinism and a cost for payload; there is no per-asset budget.

Weakness: **there is no JS size budget**. CSS is gated; JavaScript is measured
only indirectly by the packed-artifact check. A heavy dependency added to a
widely imported module would not fail a gate.

### `mui-italia`

- **Emotion runtime** serializes styles during render and needs SSR cache
  wiring; this is the main structural cost.
- **MUI v5 surface**: `@mui/material`, `@mui/system`, `@mui/lab` (alpha),
  `@mui/x-date-pickers`, `@mui/icons-material` and Emotion are peer
  dependencies, so the consumer pays for all of them.
- **Tree-shaking is enabled** in the published manifest (`sideEffects: false`,
  `exports` with `./*`), and Babel preserves ES modules, so unused components
  can be dropped.
- **Bundle size is tracked**, not budgeted: the `build-size` action reports the
  built package size on pull requests.
- **No CSS payload concept**, because there is no static stylesheet.

**Verdict:** `@pagopa/ui` 4.0, `mui-italia` 2.0. Static CSS and per-module ESM
are the right architecture; the missing JS budget is the one gap.

## 12. Cross-cutting: adoption, licence, release maturity

These are not among the eight requested dimensions but they dominate the
decision, so they are stated separately.

|                  | `@pagopa/ui`                            | `mui-italia`                                  |
| ---------------- | --------------------------------------- | --------------------------------------------- |
| Licence          | `UNLICENSED`                            | MIT                                           |
| Distribution     | GitHub Packages, token required         | public npm                                    |
| Release history  | none yet (0.0.1)                        | 2.7.0, RC channel, changelog                  |
| Production users | none declared                           | PagoPA products, 22 stars, 6 forks (snapshot) |
| Migration path   | none yet                                | documented changelog                          |
| Governance       | PagoPA DX, agent-assisted, Figma-driven | PagoPA, PR review, semantic-release           |

A technically superior system that cannot be installed without a token and a
legal conversation will not replace an MIT package on npm. Conversely, an MIT
package on MUI v5 will not carry the next generation of PagoPA products without
a migration it has not tested.

## 13. Recommendations

### For `@pagopa/ui`

1. **Resolve distribution and licence before 1.0.** Either publish to public
   npm under a licence that permits internal and partner use, or provide a
   registry proxy that removes the PAT requirement. This is the single largest
   blocker to adoption and it is not a code problem.
2. **Decide the React 18 story.** Either publish a compatibility build or state
   publicly that the system is React 19-only and pair it with a migration
   guide. "React 19.2 peer" without a migration path excludes most consumers.
3. **Add a JS size budget** next to the CSS one, per entry and per component
   family, so the architectural advantage is enforced rather than assumed.
4. **Reduce the contributor learning curve.** The checks are excellent; the
   path to a first green PR is not. A "first component" walkthrough that runs
   the real commands end to end would pay for itself.
5. **Add axe-core to the accessibility contract** as a second, standards-based
   layer; keep the bespoke APG contract, but let a known rule set catch what the
   presence-driven checks cannot.
6. **Prove it in a real application.** The packed-artifact check proves the
   package loads; it does not prove a product can ship on it. One adopter with
   a public migration note is worth more than any further internal check.

### For `mui-italia`

1. **Plan the MUI 7 / React 19 migration now.** Every month on MUI v5 and
   React 18 increases the cost and the number of consumers left behind.
2. **Raise the test floor.** A coverage gate and behavioural tests for the 43
   untested component folders are the cheapest risk reduction available.
3. **Assert accessibility in CI.** `addon-a11y` without an assertion is a
   dashboard, not a gate; adding `axe` to the existing Vitest setup is a small
   change with a large payoff.
4. **Move user-facing strings into props or a provider.** The hard-coded
   Italian labels contradict the project's own accessibility checklist and
   block multilingual products.
5. **Replace ESLint 8 and the Babel build** with a current linter and a bundler
   or `tsc`-only pipeline; the current toolchain is the main maintainer tax.

### For the organisation

Run both in parallel with different roles: keep `mui-italia` as the supported
system for the React 18 estate, and treat `@pagopa/ui` as the target system for
new products once its distribution and licence are settled. A forced migration
before those two items are resolved would trade a working system for an
uninstallable one.

## 14. Reproduction

```sh
# Local system
git rev-parse --short HEAD                     # a8b3fa4
pnpm nx show project pagopa-ui
pnpm nx run pagopa-ui:figma:check
pnpm nx run pagopa-ui-storybook:test:coverage
pnpm nx run pagopa-ui:library:check

# External system
git clone --depth 1 https://github.com/pagopa/mui-italia.git
cd mui-italia
yarn install --immutable
yarn test && yarn lint && yarn build
```

Counts in this report were taken with `find`, `grep`, `du` and small Node
scripts over both working trees; the commands are listed in the review log
rather than embedded here because they are mechanical and easy to re-run.
