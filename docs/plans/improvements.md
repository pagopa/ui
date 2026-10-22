# Design System Report — pagopa-ui

Strategic, impact-first review of the repository as of 2026-10-22 (`main` at
`03c3a3d`). Scope: consumer DX, long-term maintainability and the agent-first
Figma → React flow. No code was changed to produce it; every number below is
reproducible with the commands in the appendix.

---

## 0. Executive summary

The repository is unusually rigorous: hermetic Figma checks, a read-only Figma
contract, a token class contract with a ratcheting baseline (arbitrary lengths
at **0**), import layers, a packed-artifact consumer test in three engines, an
a11y contract that runs after every story, and a device-aware drift gate. The
foundations are right; **do not dismantle them**.

The problems are about _where_ the rigor is spent:

1. **The two headline promises are not yet proven by the gates.**
   _Visual fidelity_: 223 registry nodes are `implemented`, but only **34 nodes**
   have a parity case (88 cases). Button, Checkbox, Avatar, Badge, Chip,
   Tooltip, Snackbar… have none. And there is **no gating visual regression**:
   Chromatic is label-only with `exitZeroOnChanges: true`. A change to one shared token
   can silently restyle hundreds of stories and nothing fails.
2. **Consumer DX was optimised last.** One 386 KB ESM bundle (88 KB gzip) plus
   a 125 KB global CSS file. `"use client"` is in 4 source files and lost in
   the bundle, which breaks Next.js App Router consumers. About 60 Italian text
   defaults are scattered across props with no locale provider. The public API
   is assembled through `export *`, nothing snapshots it, and the names mix
   layers and languages. All of this is cheapest to fix **before the first
   publication**, which hasn't happened yet.
3. **Tooling outweighs the product.** `ui-cli` is **13.3k lines + 8.9k lines of
   tests** for **12.8k lines of components**. The bespoke parity engine
   (~5k lines) is excellent at _alignment_ but expensive per node. That's why
   coverage is low, and it does nothing for _regression_.
4. **The agent context is heavy and partly stale.** About 19.5k words of agent
   docs (≈11k loaded for a single "new from Figma" task) plus **70 KB of prose**
   in registry notes (up to 2.7k characters per note). Stale references exist even though
   `docs` checks pass. The prop conventions are duplicated across two skills and
   have already diverged.
5. **CI speed has a single big lever that isn't pulled.** There's no remote
   cache, and Nx 23 discards a restored local cache across runners, so every
   `dependsOn` chain re-runs. `library:check` is one 2,100-line test running
   serially in three engines on every PR. The `storybook-conditions` pass
   doubles every story run.

### Top 8 actions (80/20)

| #   | Action                                                                                                                                    | Area               | Impact    | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------- | ------ |
| 1   | Add a **gating visual regression** on stories at 3 widths (Chromatic gating or Playwright `toHaveScreenshot`), separate from Figma parity | QA / fidelity      | Very high | M      |
| 2   | **Pre-publication API pass**: curated explicit exports, an API report snapshot gate, renames, drop the `device` prop                      | Consumer DX        | Very high | M      |
| 3   | **Per-module build** (`preserveModules`), preserved `"use client"` directives, and an RSC consumer in `library:check`                     | Consumer DX        | High      | S–M    |
| 4   | **Locale provider** with an Italian default dictionary and the prop override kept (prop > provider > default)                             | Consumer DX / a11y | High      | M      |
| 5   | **Self-hosted Nx remote cache** (Azure Blob), the green chain as one Nx target, `library:check` on Chromium only for PRs                  | CI / DX            | High      | S–M    |
| 6   | **Bootstrap the evidence bundle** and wire `parity verify` into the gate; one-command `parity align <nodeId>`                             | Agent flow         | High      | S–M    |
| 7   | **Shrink the agent context**: turn "traps" into checks, cap registry notes, de-duplicate skills, fix stale references and check commands  | Agent flow         | High      | S      |
| 8   | **Responsive type tokens** (one token re-valued per breakpoint) instead of `-mobile` classes swapped inside components                    | Token-first        | Medium    | M      |

---

## 1. Snapshot

| Metric                                                           | Value                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Components source (`packages/pagopa-ui/src/components/**/*.tsx`) | 12,811 lines                                                               |
| Stories and support (`apps/storybook/src`)                       | 17,605 lines; 95 story files, ~407 stories; 28 guides                      |
| Tooling (`packages/ui-cli/src`)                                  | 13,300 lines (parity ≈ 5.1k, `figma/sync.ts` 1.3k, `figma/tokens.ts` 1.0k) |
| Tooling tests (`packages/ui-cli/tests`)                          | 8,915 lines                                                                |
| Figma catalogue (`src/catalog/figma`)                            | ≈ 830 KB JSON: inventory 550 KB, registry 166 KB, parity cases 108 KB      |
| Inventory                                                        | 353 nodes · 299 implemented · 26 pending · 9 excluded · 19 mocked          |
| Registry                                                         | 273 entries (223 implemented) + 4 bulk rules; notes total 69,822 chars     |
| Parity corpus                                                    | 88 cases on **34 nodes**; 161 residues; 0 drafts                           |
| Device gate                                                      | 29 implemented device sets · 66/66 device cases covered · 0 exceptions     |
| `parity verify` on a clean clone                                 | **fails**: `docs/figma-parity/{source,manifest}.json` missing              |
| Token contract                                                   | foundation baseline: arbitrary lengths 0, 3 reasoned exceptions            |
| Published artifact                                               | `dist/pagopa-ui.js` 386 KB (88 KB gzip), single file; `styles.css` 125 KB  |
| `"use client"` files                                             | 4 (directive not preserved in the single bundle)                           |
| Oxlint warnings (`packages/pagopa-ui`)                           | 47 (non-gating), 18 `complexity`, 21 `prefer-tag-over-role`                |
| Agent docs (AGENTS, CONTRIBUTING, skills, refs, CLI README)      | ≈ 19.5k words                                                              |

---

## 2. Consumer developer experience

### 2.1 Packaging: one bundle, no RSC story — **High**

- `vite.config.ts` builds one ES entry with no `preserveModules`. The output is
  one 386 KB `dist/pagopa-ui.js`. Bundlers can still tree-shake named exports,
  but the top-level side effects (for example `createCn` from `cn/config`) and
  one big module limit how much they can drop. Consumers also can't deep-import
  a family.
- Only 4 source files carry `"use client"`, and a single-file bundle cannot
  keep per-module directives anyway. In a Next.js App Router app, any component
  using hooks or Base UI fails when rendered from a Server Component unless the
  consumer wraps it. For PA front-ends (Next.js is common) this is the first
  thing a consumer hits.
- **Recommendation**
  - Build with `preserveModules` (`preserveModulesRoot: src`) and keep the
    directives (for example `rollup-plugin-preserve-directives`, or Vite 8's
    equivalent).
  - Mark every interactive module as client, and leave purely presentational
    ones server-safe.
  - Add subpath exports per family (`@pagopa/ui/inputs`, …) only if bundle
    analysis justifies it; preserved modules alone usually do.
  - Extend `library:check` with a **minimal Next.js App Router consumer** that
    renders a page from a Server Component. The packed-consumer check is
    already the right place to prove it.
- Keep the single global CSS (125 KB): with Tailwind v4 and a design system
  this size, per-component CSS isn't worth it. Document the payload budget
  (`data/css-budget.json`) in the package README so consumers know what they
  pay.

### 2.2 Texts and i18n: contract yes, mechanism no — **High**

- The text contract in `pagopa-ui-standards` (every string overridable,
  consumers own sentences) is excellent and rare.
- The mechanism is per-prop only. About 60 literal defaults are spread across
  components, Italian in practice: `closeLabel = "Chiudi finestra"`
  (`overlays/dialog.tsx:29`), `"Chiudi pannello"` (`drawer.tsx:56`),
  `"Caricamento"` (`overlay.tsx:6`), and the `it` locale hardwired as the
  calendar default (`primitives/calendar.tsx:15`). Some live in internal
  helpers (`AccordionSkeleton`, "Caricamento in corso") that a consumer only
  reaches if each parent forwards them.
- `docs/plans/refactor-locale.md` proposes a provider, but it's a pasted prompt
  rather than a plan. It contains a type syntax error
  (`deepMerge<T Record<string, any extends>>`), and it switches the defaults
  to **English**, which is the wrong default for an Italian public-sector
  audience.
- **Recommendation**
  - Add a dependency-free `PagoPAUIProvider` (or `LocaleProvider`) with
    precedence _prop > provider > component default_.
  - Make the **Italian dictionary the default** and ship an English dictionary
    as a second export.
  - Type the dictionary per component and composed globally, so a missing key
    is a compile error. The calendar locale follows the provider.
  - This also gives agents one place to put new strings, instead of inventing
    a default per prop.
  - Rewrite `refactor-locale.md` as a real plan (or delete it) before an agent
    executes it literally.

### 2.3 Public API: uncurated and frozen too late — **Very high**

- `src/pagopa-ui.ts` is `export *` over eight families plus hand-picked
  primitives. Whatever a family `index.ts` exports becomes public. The
  "frozen surface" (109 runtime exports per ADR-0002) is a convention, not a
  check: `figma:check` maps exports to the registry, but no API report fails
  when a signature changes.
- The names mix layers and languages:
  - Italian or Figma-frame names: `loghi-psp`, `microevento`, `white-template`,
    `safe-area`, `ko-state`/`ok-state`.
  - Overlapping layers: `navigation/accordion` vs `primitives/accordion`;
    `overlays/dialog|drawer|popover|tooltip` vs the primitives of the same name.
  - Several state panels (`ok-state`, `ko-state`, `waiting-state`,
    `empty-state`) beside a generic `state-panel`.
- The Figma device axis leaks into one public prop:
  `IdModule.device?: "mobile" | "desktop"` (`composites/id-module.tsx:23`).
  This contradicts the repository's own prop convention: "a layout that changes
  with the width is never a prop".
- There's no composition escape hatch. The native-`<a>` rule is right, but
  `buttonVariants` is internal, and Base UI's `render` prop isn't exposed. A
  consumer using Next `Link` or React Router `Link` with button styling has no
  supported path.
- **Recommendation: one pre-publication API pass** (the last cheap moment for
  breaking changes).
  1. Replace `export *` with explicit named exports per family.
  2. Add an **API report gate** (`@microsoft/api-extractor`, or a `tsc
     --declaration` snapshot diffed in `library:check`). An unreviewed change
     to the public `.d.ts` then fails.
  3. Settle names in English and product terms, and keep Figma names in the
     registry and guides. Merge or un-export duplicated layers.
  4. Remove `device` from `IdModule` (the width decides).
  5. Expose a supported router-link path: a `render` prop on the button-like
     components, or a public `buttonVariants`.

### 2.4 Theming and tokens for consumers — **Medium**

- Theming happens only by overriding CSS variables, and which variables are
  public is undocumented. `pagopa-ui-tokens` is private, so consumers can't use
  tokens in JS (charts, canvas, e-mail templates) or in a non-Tailwind
  stylesheet.
- **Recommendation**
  - Declare the **public token contract**: the semantic `--*` variables a
    consumer may read or override. Ship them as `@pagopa/ui/tokens.css` plus a
    typed `@pagopa/ui/tokens` (JSON/TS).
  - Keep the Figma-named primitives internal. This is ADR-0002's trigger
    ("an application that wants the tokens without the components") arriving
    early, at near-zero cost.

### 2.5 Distribution — **Low (governance)**

GitHub Packages needs a PAT with `read:packages` even for public consumers.
For a PA design system meant for adoption by many suppliers, a public npmjs
scope removes the setup step. This is a governance decision, noted here only
because it's the first friction a new consumer meets.

---

## 3. Long-term maintainability

### 3.1 Two concerns, one tool: alignment vs regression — **Very high**

The parity engine (`packages/ui-cli/src/parity`, ≈5.1k lines) answers "does
this story match the Figma variant within 2 px per property?". That's the
right question when a node is **implemented or changed**. It's the wrong tool
for "did this PR change anything visually?":

- It needs the 160 MB snapshot or the evidence bundle, a running Storybook,
  hand-calibrated selectors and up to three fix passes per case. As a result
  only 34/223 implemented nodes have a case, after weeks of work.
- It deliberately has no pixel baselines ("What does not exist" in
  `parity-tooling.md`).
- Chromatic exists but doesn't gate.

The gap: **no gate protects the 189 implemented nodes without a case from
regressions**, and that includes the most-used components.

**Recommendation**

- **Regression (every PR, gating):** story-level screenshot baselines at 3
  widths (mobile/tablet/desktop from `device-policy.json`). The cheapest
  options are Chromatic with `exitZeroOnChanges: false` and TurboSnap, or
  Playwright `toHaveScreenshot` over the Storybook index in the Chromium job.
  Reviewers approve diffs in the PR. This covers every story on day one.
- **Alignment (on Figma delta or new node only):** keep the parity engine,
  scoped to nodes in the drift delta and new implementations, as today's
  device gate already does.
- This also simplifies the `sharp` pixel checks inside `library.spec.mjs`.
  Keep only the ones that prove packed-artifact behaviour (fonts, artwork),
  not looks.

### 3.2 ROI of the tooling surface — **High**

Tooling (22k lines including tests) is 1.7× the component code. Most of it is
justified: `figma:check`, `layers:check`, the token class contract and
`library:check` are high-ROI and should stay. The overhead sits in the
meta-layers:

| Mechanism                                                                                               | Verdict                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hermetic `figma:check`, device gate, read-only Figma                                                    | **Keep**: core value, fast (~2 s)                                                                                                                                                                                       |
| Token class contract + shrinking baseline                                                               | **Keep**: it's why arbitrary px are at 0                                                                                                                                                                                |
| `layers:check` (custom, 145 lines)                                                                      | Keep. `dependency-cruiser` would do it with config, but the custom check is small and tested                                                                                                                            |
| Parity engine (5.1k lines)                                                                              | Keep, but **freeze features** and scope it to alignment (§3.1); invest in a higher-level command (§4.3), not in more flags                                                                                              |
| `docs` check enforcing that the `figma-to-code` skill is "agnostic" (no component names, nodeIds, ADRs) | **Reconsider**. Portability only pays if the skill is extracted and reused elsewhere. Today it forces indirection (`catalog.registry` keys instead of paths), and it already points agents at the wrong location (§4.4) |
| Registry `note` prose (70 KB, up to 2.7k chars)                                                         | **Cap** it. Notes have become agent memory that no reviewer reads; behaviour belongs in guides, measurements in parity cases                                                                                            |
| `docs/plans` (5 files, ~1.4k lines) and ADR history in operational docs                                 | Archive closed plans; rule 8 in `docs/plans/README.md` ("no history in the instructions") is right, apply it to the plans too                                                                                           |
| 4 workspace packages + 1 app for an unpublished 0.0.1 library                                           | Acceptable for Nx caching, but **stop here**: no further splits until a second consumer exists (ADR-0002 trigger)                                                                                                       |

### 3.3 Demo code inside the library — **Medium**

`src/components/templates/figma` holds the Figma page templates: 5
`implemented` compositions with parity cases and 19 `mocked` placeholders
rendered by `TemplateShell.tsx` (507 lines), about 1,100 lines in total. They
are not shipped: the build follows only the public entry, coverage excludes
them and `library.css` skips them. But they sit inside the component tree, so
every rule carries an exception for them: a `templates` layer with a
third-party exemption, exclusions in the API and text plans, and a coverage
exclude. Move them to `apps/storybook/src/templates`: the library then contains
only shippable code, and the layer rule "nothing in components imports
stories" becomes trivially true. The registry and the foundation check must
follow the files (action 11).

### 3.4 Code health signals — **Medium**

- **47 oxlint warnings, non-gating**: 18 `complexity` (DatePicker 28,
  RadioField 27) and 21 `jsx-a11y/prefer-tag-over-role`. Non-gating warnings
  only grow. Apply the same ratchet you use for tokens (`--max-warnings
  <current>` lowered over time), and treat `prefer-tag-over-role` as an a11y
  backlog, not noise.
- **Per-package `.oxlintrc.json` with duplicated rules**: move to a root config
  with `extends`.
- **Large multi-component family files** (`inputs/text-fields.tsx` 545 lines,
  `menus.tsx` 390): split by component when touched. That improves agent edit
  precision and reviewability, but don't do it as a standalone refactor.

---

## 4. Effectiveness of the agent-first flow

### 4.1 What works and should be kept

- Figma is read-only, the token comes from the environment, and `.env` is
  never read: clear, enforced in docs and tooling.
- The `nodeId` as identity, the registry as the single status source, and the
  drift PR as the review record (ADR-0001): a sound, auditable model.
- The delta-scoped device gate (ADR-0004): new work can't skip mobile, and
  history burns down without blocking.
- The "done when" phrasing in every reference and the exit-code semantics
  (`2` = missing evidence, never a pass): good agent ergonomics.
- The drift workflow: pinned actions, branch guard, artifacts, no coding agent
  with secrets in CI.

### 4.2 The evidence bundle was designed but never bootstrapped — **High**

`parity verify` fails on a clean clone because `docs/figma-parity/source.json`
and `manifest.json` are missing. Without them, an agent session without the
person's 160 MB snapshot and token can't read the source side of any case.
That was the whole point of milestone M2. The drift workflow would generate the
bundle, but only on a run that finds drift.

**Recommendation:** run `parity evidence --write` once and commit it (under the
10 MB cap). Then add `parity verify` to `figma:check` (or the `pagopa-ui:test`
dependencies), so the bundle can't go stale silently.

### 4.3 The per-node loop is too manual — **High**

Aligning one node means, per device: `parity source`, then `parity check`,
choosing `--state`, `--expect-state`, `--height`, `--viewport`, `--root`,
`--subject-root`, `--subject`, `--compare-offset`, `--compare-box`, `--strict`,
`--residue`, `--ignore`, `--save-case` and `--note`. Then capture, report and
registry. That flexibility is why each node costs a lot of tokens and turns,
and why only 34 nodes are covered.

**Recommendation:** add one orchestrating command, for example
`ui-cli parity align <nodeId>`, that:

1. derives devices, widths, heights and states from the inventory and the
   device policy;
2. proposes selectors from the story's `data-slot` attributes (the components
   already use `data-slot` consistently);
3. captures every declared device and writes **one side-by-side report**
   (source PNG | render PNG | numeric deltas) per node;
4. leaves the agent only the decisions: fix, residue or ignore.

Order the burn-down by **dependency fan-in** from the inventory graph
(Button, Icon, Badge first). An `implemented` primitive used by 40 parents is
worth more than 10 leaves.

### 4.4 Context cost and stale guidance — **High**

- Volume: a "new component from Figma" task loads AGENTS + CONTRIBUTING + two
  SKILL files + 7 references, about 11k words, before reading any registry
  note.
- Stale references the `docs` check does not catch (it validates paths, not
  commands or file names):
  - `figma-to-code/SKILL.md` says to read `figma-to-code.yaml` "at the
    repository root", but it lives in `packages/pagopa-ui/`.
  - `parity-tooling.md` names `source.mjs`, `render.mjs` and `diff.mjs`; the
    code is `.ts`.
  - `visual-parity.md` and the standards skill say `pnpm storybook`, which
    isn't a root script.
  - `figma-to-code.yaml` mentions `pnpm docs:check`.
  - `.storybook/preview.tsx` cites `.migration/project.md`, which doesn't
    exist.
  - `foundation-baseline.json` cites `scripts/check-foundation.mjs`.
- Duplication with drift: `prop-conventions.md` exists in both skills, and the
  copies already differ.
- Skill noise: 23 tracked files of Nx Cloud skills (`monitor-ci`,
  `nx-cloud-*`) in `.github/skills`, while `nx.json` has
  `neverConnectToCloud: true`. They compete for skill routing and can never
  apply.
- **Recommendation**
  1. **Every mechanically detectable "trap" becomes a check, and leaves the
     prose.** Candidates from `visual-parity.md`/`devices.md`:
     - Tailwind `shadow-sm|md|lg|xl`;
     - `font-medium`;
     - `min-h-11` on rows;
     - `justify-center` on scroll containers;
     - `\n` inside JSX attribute strings;
     - horizontal `after:-inset-x` inside overflow containers.

     The foundation check already does this for weights and arbitrary values;
     extend it.

  2. Extend `check docs` to verify every backticked `pnpm nx run <p>:<t>`
     against the project graph, and every backticked file name.
  3. Keep one `prop-conventions.md` (in `pagopa-ui-standards`) and let
     `figma-to-code` add only the Figma-specific mapping lines.
  4. Cap registry `note` length (for example 400 chars) in `figma:check`. Move
     the excess into the component guide or the parity case note.
  5. Remove the unused Nx Cloud skills, or the `neverConnectToCloud` setting.
     Pick one.

### 4.5 Token-first: responsive typography belongs to tokens — **Medium**

The type scale is split by device (`--text-title-lg-mobile`, … in
`figma.generated.css`), and components choose between them with breakpoint or
prop logic. There are 13 usages of `text-*-mobile`, one of them driven by the
`IdModule.device` prop. Each component re-implements the same responsive
decision, and the agent must re-derive it per node.

**Recommendation:** generate **responsive semantic type tokens**. One
`--text-title-lg` takes its mobile value by default and is re-valued at the
`sm`/`md` breakpoint (or per container size for container-scoped modules)
inside the generated layer. Components then use `text-title-lg` only. This is
the token-first way to get responsiveness, it removes a class of parity
residues, and the device axis of typography becomes data, not code.

### 4.6 Missing automation between drift and agent — **Low**

The drift PR body is already a complete work order. A cheap next step,
consistent with "no coding agent in CI": the drift workflow posts a
ready-to-paste session prompt (node list in `implementationOrder`, per-device
links, the commands of §4.3) as a PR comment. The person then starts the
session with zero setup. Assigning the PR to a cloud coding agent can come
later, once the evidence bundle (§4.2) makes the work token-free.

---

## 5. Quality gates and CI/CD

### 5.1 Accessibility (WCAG 2.1 AA / AgID) — **High**

- Strong today: axe on every story with `test: "error"`; a 690-line custom
  contract (keyboard walk, accessible names, focus paint, APG widget behaviour,
  live regions, 320 px reflow, text spacing); forced-colours and
  reduced-motion passes; touch targets via `::after`; skip link; error
  summary.
- **Gap 1 — traceability.** `preview.tsx` sets no axe `runOnly` tags, so the
  scope is "addon defaults" rather than a declared WCAG level. For a PA audit
  you want explicit `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` (and
  `best-practice` separately if you keep it gating). Consider `wcag22aa` as a
  warning to get ahead of the EN 301 549 update.
- **Gap 2 — the consumer's deliverable.** PA consumers must publish a
  _Dichiarazione di accessibilità_ (AgID). Generate a **per-component
  conformance matrix** from the contract and axe results (success criteria
  covered automatically, criteria needing manual checks, known limitations).
  Publish it in Storybook. This turns the investment into something
  consumers can attach to their own declaration, and makes the "manual
  screen-reader testing is not claimed" rule visible.
- **Gap 3 — live regions.** Only 3 `aria-live` usages exist across 13 feedback
  components. Add an explicit contract assertion for components that announce
  (snackbar, progress, async states), and add a periodic **manual AT pass**
  (NVDA + VoiceOver) on the top components, recorded in the matrix.

### 5.2 CI speed — **High**

Measured in `docs/plans/pipeline-proposal.md`: about 9.4 min per PR before the
split; the target is under 5 min.

| Lever                                                                                                                                                    | Expected effect                                                | Effort |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------ |
| **Self-hosted Nx remote cache** on Azure Blob (Nx's self-hosted cache packages; check current licensing). This keeps the "no Nx Cloud" governance choice | All `dependsOn` re-runs and unchanged checks become cache hits | S      |
| `library:check` on **Chromium only** for PRs; three engines nightly                                                                                      | The only PR job installing three browsers                      | XS     |
| Split `library.spec.mjs` (2 tests, one ~2,050-line sequential test, `workers: 1`) into `describe` blocks with `fullyParallel`                            | Parallelism, targeted retries, readable failures               | M      |
| `storybook-conditions` (forced colours + reduced motion) on Chromium only                                                                                | Halves story executions in the WebKit pass                     | XS     |
| Drop `--with-deps` on a Playwright cache hit; move setup into one composite action                                                                       | ~40 s per job                                                  | S      |
| Remove the `*:check` chains under `test:stories`/`test:webkit` (they already run in `validate`)                                                          | Less duplicate work without a cache                            | XS     |
| Narrow the `nx affected` inputs (`tooling` = all of `packages/ui-cli/**` marks most PRs affected)                                                        | Fewer full runs on tooling-only PRs                            | S      |

### 5.3 Local feedback loop — **Medium**

The green chain is a hand-typed four-line `&&` command in `CONTRIBUTING.md`.
Encode it as **one Nx target** (for example `nx run workspace:verify`, with a
`--fast` configuration that skips the browser passes). Agents and people then
run the same thing, and the docs reference one name instead of fourteen.

---

## 6. Roadmap

**Before the first publication (now → 0.1.0)**

1. API pass (§2.3): explicit exports, API report gate, renames, drop `device`,
   router-link path.
2. Per-module build with client directives, plus an RSC consumer in
   `library:check` (§2.1).
3. Locale provider with Italian defaults (§2.2).
4. Public token contract and `@pagopa/ui/tokens` (§2.4).

**Next 30 days (in parallel, mostly CI/tooling)**

5. Gating visual regression at 3 widths (§3.1).
6. Remote cache, Chromium-only `library:check` on PRs, `verify` target
   (§5.2, §5.3).
7. Evidence bundle bootstrap plus `parity verify` in the gate (§4.2).
8. Context diet: traps → checks, de-duplicated skills, stale references,
   command-aware `docs` check, note cap, unused skills removed (§4.4).
9. Explicit axe tags (§5.1).

**Next 90 days**

10. `parity align` and the fan-in-ordered burn-down of the 189 uncovered
    implemented nodes (§4.3).
11. Responsive type tokens; retire `text-*-mobile` in components (§4.5).
12. Per-component a11y conformance matrix plus a manual AT pass (§5.1).
13. Move the demos out of the library (§3.3, action 11); oxlint warning ratchet (§3.4).

## 7. Explicitly not recommended

- **Don't** replace `figma:check`, the token class contract, `layers:check` or
  the packed-consumer `library:check` with off-the-shelf tools. They're the
  differentiators and they're cheap to run.
- **Don't** make the parity engine a per-PR gate, and don't add pixel
  baselines to it. Keep alignment and regression separate (§3.1).
- **Don't** split more packages or add per-component CSS before a real second
  consumer exists.
- **Don't** adopt Code Connect while Figma must stay read-only. The
  `ui-cli` README's analysis is correct.
- **Don't** add dark mode or theming APIs before the public token contract
  (§2.4) exists.

---

## Appendix — how the numbers were obtained

```bash
# catalogue and device coverage (hermetic, ~2 s)
cd packages/ui-cli && PAGOPA_UI_ROOT=../pagopa-ui node src/cli.ts check figma
PAGOPA_UI_ROOT=../pagopa-ui node src/cli.ts parity verify          # fails: evidence bundle missing
PAGOPA_UI_ROOT=../pagopa-ui node src/cli.ts parity queue --uncovered

# registry, cases and notes
node -e 'const r=require("./packages/pagopa-ui/src/catalog/figma/registry.json"); ...'   # statuses, note sizes
node -e 'const p=require("./packages/pagopa-ui/src/catalog/figma/parity-cases.json"); ...' # cases, nodes, residues

# artifact
ls -la packages/pagopa-ui/dist/pagopa-ui.js packages/pagopa-ui/dist/styles.css
gzip -c packages/pagopa-ui/dist/pagopa-ui.js | wc -c
grep -rl "use client" packages/pagopa-ui/src | wc -l

# lint
cd packages/pagopa-ui && pnpm exec oxlint      # 47 warnings

# sizes
find packages/ui-cli/src -name '*.ts' | xargs cat | wc -l
find packages/pagopa-ui/src/components -name '*.tsx' | xargs cat | wc -l
```

CI durations come from `docs/plans/pipeline-proposal.md` (measured
2026-10-21). They were not re-measured, because the GitHub CLI was not
authenticated in this session.
