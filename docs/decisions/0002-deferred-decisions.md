# ADR-0002 — Deferred decisions with triggers

- **Status:** Accepted — deferrals recorded on 2026-10-12; the Titillio entry
  added and resolved on 2026-10-14.
- **Date:** 2026-10-12 (Titillio entry: 2026-10-14)
- **Related:** [ADR-0001](./0001-rework.md) — the rework whose boundaries produced these deferrals.

## 1. Context

The rework (F0–F6) deliberately stopped at boundaries that need a product or
infrastructure trigger rather than more engineering. This ADR records each
deferred decision with its context, the options that remain open, the trigger
that reopens it and the expected impact, so none of them is rediscovered as a
surprise.

## 2. Workspace split — resolved 2026-10-19

**Resolved 2026-10-19:** the repository is an Nx monorepo with one package,
`packages/pagopa-ui` ([ADR-0005](./0005-nx-monorepo.md)). The workspace, the
validation flow and `nx release` exist; the layer split (tokens, artwork, the
stories as an application) stays deferred with its own trigger. The original
deferral is kept below for the record.

**Decision deferred:** splitting the repository into separately versioned
packages (tokens, components, assets, Figma catalogue) instead of the current
single private package with layered `src/` directories.

- **Current state:** one package (`pagopa-ui`), `private`, unpublished; the
  layers are enforced by `check-import-layers` and the tokens and assets are
  generated into `src/`.
- **Options:** (a) keep the single package; (b) split tokens/assets into a
  foundation package consumed by the UI package; (c) a full multi-package
  workspace.
- **Trigger:** a second consumer package, or independent versioning needs for
  tokens/assets (for example an application that wants the tokens without the
  components).
- **Impact when triggered:** pnpm workspace, per-package exports, CI matrix and
  release flow; the import-layer contract becomes cross-package dependency
  rules.

## 3. lucide → `PagoPAIcon` replacement

**Decision deferred:** replacing the remaining `lucide-react` icons with the
published `PagoPAIcon` catalogue.

- **Current state:** lucide is confined to `src/components/primitives` through
  `primitives/icons.ts`; the public components expose `PagoPAIcon`.
- **Options:** (a) keep both (lucide for internal affordances); (b) replace
  icon-by-icon as source coverage allows; (c) drop lucide entirely.
- **Trigger:** the PagoPA source set covers the internal glyphs actually used
  (chevrons, close, check, loader, calendar affordances).
- **Impact when triggered:** a smaller dependency surface and one artwork
  pipeline; requires re-checking every affected story and the artifact
  contract.

## 4. Public API evolution

**Decision deferred:** renaming or reshaping public exports (names, prop
shapes) beyond the current frozen surface.

- **Current state:** the 109 runtime exports of `src/pagopa-ui.ts` are frozen
  through the rework; retired pass-throughs are documented in the README.
- **Options:** (a) keep the surface; (b) additive evolution with deprecations;
  (c) breaking cleanups before the first release.
- **Trigger:** the first publication of the package.
- **Impact when triggered:** semver and a changelog are adopted (Changeset,
  _adopt_ in the PagoPA DX Technology Radar); breaking changes need a migration
  note.

## 5. Dark mode

**Decision deferred:** supporting a dark application theme.

- **Current state:** the application theme is light-only; the dark pictogram
  artwork is artwork, not dark-theme support. The semantic tokens in
  `src/index.css` are single-valued.
- **Options:** (a) light-only; (b) dark variants for the semantic layer behind
  a class/attribute switch; (c) system-preference driven.
- **Trigger:** a product requirement for dark surfaces.
- **Impact when triggered:** the semantic layer gains a second set of values,
  the Figma collections need dark values (today they are light), and every
  forced-colors and contrast test must be re-run.

## 6. Titillio font adoption — resolved 2026-10-14

**Decision deferred:** shipping the source Titillio family instead of the
bundled Titillium Web substitution.

**Resolved 2026-10-14:** option (b) executed. The three unmodified WOFF2 faces
(Regular/Semibold/Bold) are vendored under `src/assets/fonts/titillio` at
upstream commit `d648338512b6e224ed8bdca50b75f72ba1e8711f` with the OFL text and
recorded digests; `src/index.css` declares them at the canonical CSS weights
(600/700), `BUNDLED_FAMILIES` maps Titillio to itself, and the artifact and
licence checks follow (`dist/licenses/titillio.txt`). The obsolete
`font-family-map` adaptations were removed from the workbench case corpus
(itself retired on 2026-10-15 — §7) because the family now matches the source.
Substitute-font measurements recorded in the registry notes and the remaining
visual-contract reasons are historical and
require per-node re-measurement — not a re-approval.

- **Current state:** the source file uses Titillio for every text style (29 of
  the 30 typography variables; `Body/Mono` is DM Mono, mapped to the platform
  `ui-monospace` stack). The library bundles `@fontsource/titillium-web` (Latin
  and Latin-ext subsets at 400/600/700) and records the replacement as a global
  adaptation (`scripts/figma-tokens.mjs`, the visual contracts and the registry
  notes). The substitution is not
  metric-compatible: Figma's Semibold (declared 500) renders at Titillium Web
  600 and Figma's Bold (declared 600) at 700 because the bundled family has no
  500 face, and the narrower substitute is compensated by curated width and
  line-break notes across the catalogue.
- **Options:** (a) keep the documented substitution; (b) vendor the
  `pagopa/titillio` WOFF2 faces unmodified at a pinned commit and ship the OFL
  text (no upstream change needed; ~50KB per face); (c) vendor subsetted faces
  (Latin/Latin-ext, ~12KB per face like today): subsetting is a Modified Version
  under the OFL, so either rename the family or obtain the reserved-name
  permission; (d) ask upstream for a package/subset distribution first (the
  repository has no tags, releases or npm package).
- **Trigger:** a user-facing pixel-fidelity requirement against the source
  typography, or the first publication of the package with a font contract to
  freeze.
- **Impact when triggered:** `src/index.css` (`@font-face` and `--font-sans`),
  `scripts/figma-tokens.mjs` (the identity family map and the declared CSS
  weights keep every existing weight reference on its face), `vite.config.ts`
  and `scripts/check-library` (licence copy and font assertions), the generated
  type-scale comments, README and every guide, visual contract or registry note
  that justifies a width deviation with the substitute; the fidelity evidence
  chain must be re-run.

## 7. Visual-contracts corpus retired — resolved 2026-10-15

The source-bound alignment workbench introduced on 2026-10-13 recorded 296 capture
cases with subjects, checks and 66 distinct deliberate adaptations in
`src/catalog/figma/visual-contracts.json`. The workbench scripts, its packets and
its protocol were retired on 2026-10-15 (`0d9577a`) and the corpus lost its
consumer: its story bindings pointed at `Alignment/*` fixtures that only the
workbench read, and the render-first method now captures the component story
itself (`references/visual-parity.md`).

- **Decision:** retire the corpus. The adaptations it recorded are archived
  in a report (removed in the F0 cleanup) and the component guides plus the
  registry notes remain the primary record;
  their re-verification belongs to the parity loop per node, not to the file.
- **Trigger (reopen):** the parity tool (`scripts/figma-parity`) needs a machine-readable
  case list. It must then adopt a regenerated corpus derived from
  `registry.json` and the component stories — not a resurrected workbench file.
- **Impact:** `visual-contracts.json` is deleted; the adaptation ids it carried
  stay binding until their component is re-verified, exactly as the registry
  notes and guides already state.

## 8. Consequences

- Each trigger is an explicit entry condition: when it appears, the decision
  reopens here rather than inside an implementation PR.
- Nothing else in the ADR-0001 plan is blocked by these deferrals.
