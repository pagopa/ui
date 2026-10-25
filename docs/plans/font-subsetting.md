# Font subsetting — cut the text payload without moving a pixel

Status: **proposed, blocked on D1** (OFL reserved name). M0 can run now; M2–M5
start only after the licensing route is chosen. Common rules:
[README.md](./README.md).

## Goal

Ship only the characters the library can render, so an Italian page downloads
about 60–90 KB of text font instead of 150 KB, without a single pixel changing.

Measured today, on a small service page built twice with the same content (one
consumer on `@pagopa/ui`, one on `@pagopa/mui-italia` 2.7.0) and run through
Lighthouse 13.5, mobile profile, median of three runs:

| Metric                  | `@pagopa/ui` | `@pagopa/mui-italia` |
| ----------------------- | ------------ | -------------------- |
| Performance score       | 83           | 96                   |
| First contentful paint  | 3.45 s       | 2.25 s               |
| Total transferred       | 475 KB       | 217 KB               |
| **of which text fonts** | **150 KB**   | **36 KB**            |
| JavaScript, gzip        | 302 KB       | 179 KB               |
| CSS, gzip               | 21 KB        | 0.5 KB               |

The font is the second largest line item after JavaScript and the only one that
can be cut by more than half with no design decision. The rest of the gap is
tracked elsewhere (stylesheet surface, component dependencies).

## Starting point (measured 2026-10-25)

The three faces vendored in `packages/pagopa-ui/src/assets/fonts/titillio` are
unmodified upstream files:

| File                      | Bytes  | Codepoints | OS/2 weight | CSS weight |
| ------------------------- | ------ | ---------- | ----------- | ---------- |
| `Titillio-Regular.woff2`  | 50,632 | 608        | 400         | 400        |
| `Titillio-Semibold.woff2` | 51,204 | 608        | 500         | 600        |
| `Titillio-Bold.woff2`     | 51,608 | 608        | 600         | 700        |

`src/index.css` declares the three faces with `font-display: swap` and no
`unicode-range`, so every browser fetches all three full files.

Coverage of the source faces, by block:

| Block                   | Codepoints  |
| ----------------------- | ----------- |
| Latin (U+0000–00FF)     | 191         |
| Latin Extended-A/B      | 163         |
| Vietnamese (U+1E00–)    | 91          |
| Punctuation and symbols | 32          |
| Currency                | 5           |
| Greek                   | 4 (Δ Ω μ π) |
| Cyrillic                | 0           |

What constrains the change:

- `packages/ui-cli/src/checks/library-artifact.ts` asserts **exactly three**
  `.woff2` URLs in the published stylesheet and that each file exists.
- `packages/ui-cli/tests/e2e/library.spec.mjs` loads `"PagoPA Ț"` at weights 400,
  600 and 700 and requires every declared face to reach `loaded`. `Ț` is
  U+021A, in Latin Extended-A: a Latin-only subset fails this test and, worse,
  would silently fall back in production.
- The visual suite compares about 1,450 host captures and the committed Linux
  baselines with zero tolerance: any hinting or feature change surfaces as a
  diff.
- `packages/ui-cli/src/figma/tokens.ts` maps the Figma family `Titillio` to
  itself (`BUNDLED_FAMILIES`); the parity tooling
  (`packages/ui-cli/src/parity/source.ts`) assumes that identity.
- `packages/pagopa-ui/src/assets/fonts/titillio/LICENSE.txt` is OFL 1.1 with
  **Reserved Font Name "Titillio"**, and `vite.config.ts` copies it to
  `dist/licenses/titillio.txt`.
- Characters actually used by the shipped strings and the Storybook pages, above
  ASCII: `· à × — ù è ’ • → € “ ” é – … ◆ ↗ ≥ § ò © 🟢`. The arrows are not in
  the Google `latin` range; `◆` and `🟢` are in neither range and are already
  missing from the font today (they fall back).

Measured subset sizes, Regular face, produced with the two candidate tools:

| Subset                                 | `pyftsubset` (fonttools) | `subset-font` (Node/WASM) |
| -------------------------------------- | ------------------------ | ------------------------- |
| Latin only                             | 21.2 KB                  | 28.3 KB                   |
| Latin Extended-A/B (+ Vietnamese)      | 15.6 KB                  | 16.7 KB                   |
| Both in one file                       | 29.8 KB                  | not measured              |
| Both, hinting dropped (`--no-hinting`) | 13.8 KB (latin only)     | kept                      |

Both tools produce byte-identical output across repeated runs on this machine.
`pyftsubset` wins on size; `subset-font` keeps the repository Node-only.

## Decisions

**D1 — Licensing (blocking, the person owns it).** A subset is a Modified
Version under the OFL, and it may not carry the Reserved Font Name "Titillio".
Two routes:

- **D1a — permission.** Ask the copyright holder (Dipartimento per la
  Trasformazione Digitale, through the `pagopa/titillio` repository) for written
  permission to distribute subsetted files under the reserved name. Nothing else
  in the repository changes: family name, Figma mapping, docs stay as they are.
- **D1b — rename.** Ship the subsets under a name that does not contain
  "Titillio" (a distinct name, not a prefix or suffix: the OFL forbids the
  reserved name inside a derivative name). Visual output is identical, but the
  CSS family name, `BUNDLED_FAMILIES`, the `--font-sans` value, the e2e font
  assertion and any guide naming the family change.

No subset ships until one route is written down in
`docs/decisions/0006-font-subsetting.md`.

**D2 — Ranges.** One file per weight for the Google `latin` range plus the
characters the repository actually renders outside it: `→ ↗ ≥` and the arrows
U+2190–2199. One file per weight for the Google `latin-ext` range (which also
carries Vietnamese, so nothing covered today is lost). Everything else — `◆`,
emoji, Cyrillic (absent from the source today), superscripts and enclosed
numbers — falls back to `Arial` exactly as it does now, and the fallback is
written down.

**D3 — Two files per weight, not one.** `unicode-range` lets an Italian page
fetch only the Latin file; a page with Romanian, Polish or Vietnamese names
fetches the second one too. Worst case (both files) is still smaller than one
full face today.

**D4 — Hinting stays.** Dropping it saves another ~7 KB per file but changes
rasterisation on Windows, which no suite here can see. It is a separate decision
with its own visual review, not part of this plan.

**D5 — Tool.** Start with `subset-font@2.9.0` (BSD-3, HarfBuzz WASM, no new
runtime in CI) and record its output in a digest manifest. If the size gap
matters after M5, add `pyftsubset` behind `uv` as a second, measured option —
not by default.

**D6 — Committed output, reproducible input.** The original files stay in the
tree; the subsets are committed next to them with a manifest (source digests,
range, output digest). A `--check` command regenerates into a temporary folder
and compares bytes, so a stale or hand-edited subset fails the build.

## Milestones

### M0 — Inventory (no licence dependency)

1. Collect every codepoint used by the shipped strings: `packages/pagopa-ui/src`
   (excluding `src/catalog`) plus `apps/storybook/src`, in `.ts`, `.tsx`, `.md`
   and `.css`. Write the result, with counts, to
   `packages/pagopa-ui/src/assets/fonts/titillio/subset/characters.txt`.
2. Compare the inventory with the two ranges; list every codepoint that would be
   dropped. Expected result: the arrows and `≥` are added; `◆` and emoji are
   already missing from the source font; superscripts and enclosed numbers are
   dropped and unused.
3. Record the source digests and the block table above in the plan's report.

Acceptance: the inventory diffs cleanly against the font cmap, and no codepoint
used by a rendered string is left out without a written reason.

### M1 — Licence route (person)

1. Open the permission request (D1a) or take the rename decision (D1b).
2. Write `docs/decisions/0006-font-subsetting.md`: route, evidence, ranges,
   fallback list, and what changes if the route is reversed.
3. If the route is D1b, list every occurrence that must change: `src/index.css`,
   `BUNDLED_FAMILIES`, `--font-sans`, the e2e font assertion, guides that name
   the family.

Acceptance: the ADR is merged. Until then M2–M5 do not start.

### M2 — Generator and outputs

1. `packages/ui-cli/src/fonts/subset.ts`: reads the three source faces and the
   range file, writes the six files and `font-subset.json`, with `--check`.
2. Register `ui-cli fonts:subset` and `fonts:check`, the package scripts and the
   Nx targets; `fonts:check` joins `pagopa-ui:test.dependsOn`.
3. Unit test: a fixture face subsets to a deterministic digest; a range edit
   changes the digest; a hand-edited output file fails `--check`.

Acceptance: two consecutive `fonts:subset` runs produce byte-identical files;
`fonts:check` fails on a modified subset and passes after regeneration.

### M3 — Stylesheet and tests

1. `src/index.css`: six `@font-face` blocks with `unicode-range`, same family
   name, same `font-display: swap`, same `?no-inline` query.
2. `library-artifact.ts`: three URLs become six, each declared with its range;
   the licence copy and the icon-font assertions stay.
3. e2e: keep the `Ț` load (now proves the Latin Extended file), add `€`, `→`
   and an accented Italian word at 400/600/700.
4. If D1b: rename the family everywhere the M1 list names.

Acceptance: `library:check` passes; the visual suite passes **without updating a
single baseline**; the e2e glyph test passes.

### M4 — Coverage check, docs, release

1. `packages/ui-cli/src/checks/font-coverage.ts`: fails when a codepoint used by
   a shipped string is outside every declared range, with the codepoint, the
   file and the nearest range in the message. Reads the same inventory as M0.
2. Docs: the `titillio/README.md` provenance table gains the subset rows and
   digests; the guides mention the family only if D1b renamed it.
3. `CHANGELOG.md` row and a `patch` version plan (no public API change).

Acceptance: `fonts:check`, `font-coverage` and `docs` pass; a deliberate
`→`-only string in a component with the arrow removed from the ranges fails with
that codepoint named.

### M5 — Measure

Re-run the two-consumer smoke test (same page, same server, Lighthouse mobile
and desktop, three runs each) and record before/after for: font bytes, total
bytes, FCP, LCP, score.

## Ownership

| Path                                                                       | Who              |
| -------------------------------------------------------------------------- | ---------------- |
| `packages/ui-cli/src/fonts/**`, `src/checks/font-coverage.ts`, their tests | session          |
| `packages/ui-cli/src/cli.ts`, `package.json` (command wiring)              | session          |
| `packages/ui-cli/src/checks/library-artifact.ts`                           | session          |
| `packages/pagopa-ui/src/index.css`                                         | session          |
| `packages/pagopa-ui/src/assets/fonts/titillio/**`                          | session          |
| `packages/pagopa-ui/vite.config.ts` (licence copy)                         | session          |
| `packages/pagopa-ui/project.json`                                          | session          |
| `packages/ui-cli/tests/e2e/library.spec.mjs`                               | session          |
| `packages/ui-cli/src/figma/tokens.ts` (only if D1b)                        | session          |
| `docs/decisions/0006-font-subsetting.md`                                   | person + session |
| `CONTRIBUTING.md`                                                          | person           |

## Acceptance of the whole plan

- An Italian-only page downloads **≤ 90 KB** of fonts (`subset-font` route) or
  **≤ 70 KB** (fonttools route), from 150 KB today.
- A page that needs Latin Extended stays **≤ 115 KB**.
- The smoke-test page drops from 475 KB to ≤ 410 KB and its mobile first
  contentful paint improves by at least 0.25 s with the score ≥ 86; the exact
  figures are recorded in `reports/`.
- The visual suite passes with **zero** updated baselines.
- `fonts:check`, `font-coverage`, `library:check`, `client:check` and the full
  green chain pass.
- Licence route recorded in the ADR; source and output digests committed; the
  licence file still ships.

## Risks

| Risk                                           | Impact                                                   | Mitigation                                                                                                         |
| ---------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Subsetting without permission breaks the OFL   | a legal problem on a published package                   | D1 is blocking; the ADR records the route and the evidence                                                         |
| A glyph used by consumer data falls back       | mixed typography on names and addresses                  | Latin + Latin Extended kept, Vietnamese included; the fallback is documented and `Arial` already sits in the stack |
| A hidden codepoint in a component goes missing | a visible fallback in one label                          | the M4 coverage check fails with the codepoint and the file                                                        |
| Hinting or feature differences shift glyphs    | visual diffs, or worse, unnoticed changes                | hinting kept; zero-tolerance visual suite; the subset is compared on the same host reference                       |
| Tool output not reproducible                   | a generated file changes on every run                    | pinned version, digest manifest, byte-comparison `--check`                                                         |
| Six files instead of three                     | more requests, cold-cache cost                           | ranges are `unicode-range` scoped; the Italian page fetches three; no preload in v1                                |
| The rename route leaks into parity             | Figma family `Titillio` no longer matches the CSS family | one mapping entry, covered by the existing `BUNDLED_FAMILIES` test                                                 |

## To ask the person

1. D1a or D1b: ask upstream for permission, or rename the family in CSS?
2. Whether Latin Extended is enough, or a second script (Cyrillic, Greek) must
   ship before the package is published to other administrations.
3. Whether the ~7 KB per face saved by dropping hinting is worth a Windows
   rendering review.

## Not in this plan

- No icon font: the artwork is inline SVG and the artifact check already forbids
  one.
- No change to `DM Mono` (referenced by the type scale, not bundled).
- No stylesheet thinning: the 125 KB Tailwind output is a separate line item.
- No server-side rendering: this plan measures a client-rendered page only.
