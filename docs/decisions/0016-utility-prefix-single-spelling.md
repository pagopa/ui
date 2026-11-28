# ADR-0016 — A utility is declared once, under the `pui:` prefix

- **Status:** Accepted — 2026-11-26. Supersedes the temporary two-spelling
  contract of [ADR-0014](./0014-utility-prefix.md); the prefix itself stands.
- **Date:** 2026-11-26
- **Context:** ADR-0014 introduced `pui:` as a second spelling of every utility
  so the tree could be renamed over several tickets without a moment where a
  component rendered unstyled. The rename has landed: a component names
  `pui:flex`, and the stories name it too. The second spelling now costs every
  consumer and buys nothing — and, worse, it keeps alive exactly the collision
  the prefix was introduced to remove.
- **Related:** [ADR-0011](./0011-css-cascade-layers.md) — the layers the prefix
  lives inside; [the coexistence
  spec](../../packages/ui-cli/tests/e2e/library-host-css-coexistence.spec.mjs) —
  the artifact shape and the host collision, asserted in three engines;
  `packages/pagopa-ui/src/library.css`, `src/scan.css`,
  `packages/pagopa-ui/build/prefixed-candidates.ts`,
  `packages/pagopa-ui/vite.config.ts` — the implementation;
  `packages/ui-cli/src/checks/utility-prefix.ts` — the gate that holds the tree
  to one spelling; `packages/ui-cli/data/css-budget.json` — the size the
  doubling cost and the size this ADR restores.

## 1. Problem

Two costs survived the migration.

- **The sheet declares each utility twice.** A bare `.p-6` and a `.pui\:p-6`
  with identical declarations, for all 1174 utilities the catalogue reaches:
  103 KB raw, 14 KB gzip, on top of every consumer's payload, whether or not the
  host has a Tailwind of its own.
- **The bare twin is the collision.** A host on Tailwind v4 emits `.p-6` with
  its own theme. While the artifact also declares `.p-6`, that host rule lands
  on library markup by construction, and ADR-0011's layer order only decides
  which of the two wins — the library's utility still moves when the host's
  does. The prefix removes the collision only once _no_ library rule answers to
  the bare name. A stylesheet that emits both is in the worst position: the tree
  is renamed, so nothing depends on the bare spelling, and the bare spelling is
  still there to be hit.

ADR-0014 predicted that the ticket ending the migration would delete the
variant, the mirror and the plugin. That prediction was wrong in a way worth
recording: **the variant and the mirror are what make the single spelling
possible.** `@custom-variant pui (&)` is the prefix — native `prefix()` is still
declined for the reasons in ADR-0014 §2.1, which this ADR does not revisit — and
the mirror is the only mechanism that can emit a candidate set narrower than the
tree it is built from.

## 2. Decision

**The published stylesheet compiles the generated mirror alone, so each utility
is declared once, as its `pui:` class.**

1. **The scan surface is excluded, not filtered.** The published entry
   `src/library.css` imports the library stylesheet and excludes every source
   tree with `@source not`: `../src`, `../../artwork/src`, `../../tokens/src`.
   The only sources left are the mirror, so the emitted set is exactly the
   mirror: `.pui\:flex` and no `.flex`. Exclusion happens before emission, so no
   bare selector is ever built, let alone post-filtered out of the artifact.
2. **The mirror is written from a separate scan entry.** `src/scan.css` imports
   the same `index.css` and excludes only `src/catalog` — the Figma corpus, whose
   prose names candidates no component renders — and it is the surface the build
   plugin scans to write `.generated/prefixed-candidates.txt`. `renderCandidates`
   now emits the prefixed spelling only; the bare twin has no writer left.
3. **The build root moves out of the package.** `@tailwindcss/vite` prepends
   `{ base: root, "**/*" }` to the scanner whenever the compiler reports no root
   of its own. With `root` at the package, that implicit source re-scanned `src`
   and brought every bare twin back, `@source not` notwithstanding. The library
   build therefore runs with Vite's `root` set to the generated directory, so the
   implicit source covers the mirror and nothing else. Storybook keeps its own
   root, its own entry and its own surface: the stories are a demo, not the
   artifact, and `apps/storybook/src/preview.css` still imports the preflight
   before the package stylesheet.
4. **A gate holds the tree to the single spelling.**
   `packages/ui-cli/src/checks/utility-prefix.ts` (`pnpm ui-cli check
   utility-prefix`) walks `src`, `apps/storybook/src` and
   `apps/storybook/.storybook`, collects the tokens in a class position —
   `className`/`class` attribute values, the arguments of `cn`, `clsx`, `twMerge`
   and `cva`, and the `const`s those reach — and reports every one spelled
   without the prefix. It runs in `pagopa-ui:test`'s dependencies and in
   `verify-fast`, so it fails a commit rather than a release.
   Its oracle is the stylesheet itself: the check compiles
   `src/library.css` and asks whether naming the candidate adds a rule the empty
   sheet lacks. A token that is not a utility of this theme — `group`, a
   `data-`/`aria-` marker, a hand-written class, a typo, a word in prose — is
   therefore not a problem, and a theme utility the foundation mints next month
   is covered the day it exists. A lexical allowlist cannot do either.
5. **A hand-written class is still not a utility.** `pagopa-icon` and
   `loading-spinner-motion` are the library's own markup contract — the pictogram
   and the spinner's motion, each spelled by the component that needs it — and
   they stay unprefixed in `pagopa-ui.utilities`; the gate asks the stylesheet,
   sees that naming them adds no rule the empty sheet lacks, and leaves them
   alone. The coexistence spec pins the list, so a utility that loses its prefix
   is caught even if the gate is bypassed. `shimmer` is not on that list: it is
   `@utility shimmer` in the `shadcn/tailwind.css` dependency, so a component
   spelling it bare is a utility like any other, and the artifact carries the
   dependency's `.shimmer` reduced-motion reset whether or not a candidate asks
   for it.
6. **The host proof is an assertion.** The coexistence spec asserts the artifact
   declares `.pui\:p-6`, that the utilities layer carries exactly those two bare
   names, and — in chromium, firefox and webkit — that a host `.p-6` measuring
   5px still measures 5px on a host element inside the library's dialog portal,
   while the dialog body keeps its own 24px. Before this ADR the second half of
   that assertion was inverted: the host's `.p-6` moved the dialog.

## 3. Consequences

- **The artifact sheds 42% of its raw bytes.** `dist/styles.css` measured raw
  246 851 / gzip 36 556 / brotli 23 545 with the two spellings and raw 143 498 /
  gzip 21 929 / brotli 17 965 with one: 103 353 raw, 14 627 gzip and 5 580 brotli
  bytes removed. The budget records the smaller figure, so growth past it fails
  and the next doubling has to be argued for.
- **A bare utility now renders nothing.** That is the intent, but it moves the
  enforcement from the compiler to the gate: a component copied from a guide
  written before ADR-0014, or a class built by string concatenation the gate
  cannot see, is inert rather than styled. The gate found sixteen of those in the
  landed tree — six `aspect-*` on `image.tsx`, four `*:data-[slot=select-value]:*`
  on `select.tsx`, four destructive and `focus:**:` variants on
  `dropdown-menu.tsx`, one `data-disabled:` variant on `accordion.tsx` — and the
  fix was to spell them, not to emit the twin again.
- **The mirror stays generated, never committed.** It remains a function of the
  sources: stale, it would emit utilities no source references, or miss one a new
  component needs. `.generated/` is ignored and the plugin rewrites the mirror
  before Tailwind reads the stylesheet, in build and on watch.
- **The build reads the tree twice.** The plugin compiles the scan entry for
  candidates and Vite compiles the artifact from the mirror; the second compile
  is the fast one (545 ms on the landed tree) because the mirror is 1174 lines
  rather than the whole package.
- **Native `prefix()` stays open, unchanged.** It is still one global switch
  that renames every theme variable the artifact declares (`--font-sans`,
  `--radius-2`, …) and the `group` marker a `group-hover/nav` variant points at.
  The variant remains the reversible half-step, and no longer a temporary one.

## 4. Alternatives

- **Keep emitting both spellings.** The status quo: correct rendering during
  the migration, and now pure cost — 103 KB raw on every consumer plus a bare
  twin that a Tailwind host still collides with.
- **Compile the whole tree and delete the bare rules from the artifact.** A
  post-processing pass over the CSS text could drop every unprefixed rule. It has
  to keep nested preludes, `@supports` wrappers and `--tw-*` fallbacks intact
  while deleting parts of selector lists, and it leaves the collision in the scan
  surface: the bare candidates are still built, still counted against the scan
  and still one bug away from being emitted. Excluding the sources answers the
  same question earlier and in one line.
- **Hold the tree to the prefix with a lexical list of utilities.** A JSON file
  of known utilities checked against the source. Rejected on measurement: a
  lexical sweep of the tree produced 79 candidate tokens of which most were
  inert — markers, hand-written classes, words — so the list must both miss
  theme aliases (`bg-accent`) and flag non-utilities. Asking the stylesheet
  whether a candidate emits a rule is the same question Tailwind answers, and it
  cannot drift.
- **Adopt `prefix(pui)` and drop the custom variant.** Unchanged from ADR-0014:
  the option renames the theme variables a consumer reads and the `group` marker
  a variant points at. The single spelling does not make that rename cheaper; it
  is a separate decision with its own blast radius.
