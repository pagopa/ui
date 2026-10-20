# ADR-0003 — Artwork provenance: source, licence and theming of icons and pictograms

- **Status:** Accepted — 2026-10-14. The Flaticon attribution terms remain an
  open verification (see §4).
- **Date:** 2026-10-14
- **Context:** icon and pictogram provenance investigation
  (the report was removed in the F0 cleanup; its outcome is this decision). At the time
  of the investigation, 153 icon identities and 76 pictograms shipped as pinned
  SVG artwork whose source and licence terms lived only in the Figma pages, as a
  link card and a screenshot; the pinned set is 155 identities after the
  2026-10-14 export.

## 1. Problem

The manifests recorded `fileKey`, `version`, `nodeId`, fingerprints and
checksums, but not where the artwork came from or under which terms it is
redistributed. Most glyphs derive from Material Symbols (Apache-2.0, attribution
expected), the pictograms come from a Flaticon collection by SeyfDesigner, and
seven brand marks plus four hand-made glyphs are not Material at all. Nothing in
the repository said any of this, so no check could keep it true.

## 2. Decision

1. **Provenance is policy, keyed like everything else.** The icon and pictogram
   bulk rules in `registry.json` carry a `provenance` block (provider, origin,
   licence, optional links, note) and, for the icons, complete per-identity
   `provenanceOverrides`. `scripts/figma-asset-provenance.mjs` is the single
   resolver: it validates the enum and fields, refuses unknown identities and
   fails when the block is missing.
2. **The manifests are the machine record.** `figma-icons.mjs` and
   `figma-pictograms.mjs` stamp the resolved block into every manifest entry
   (plus `kind: "glyph" | "logo"` for icons), and `icons:check` /
   `pictograms:check` fail when a published entry is missing it or drifted from
   the policy. The generated runtime modules stay free of provenance strings.
3. **The provenance surfaces where people look.** The Storybook catalogue labels
   every non-Material identity and links the Figma page; `icons.md` and
   `pictograms.md` document the sources, the licence and the mui-italia
   mapping; the packaged artifact carries a factual artwork notice
   (`dist/licenses/artwork.txt`).
4. **The public API does not split.** `PagoPAIcon` keeps one typed surface; the
   generated `IconVariantsByName` map narrows variants per identity and
   `iconAssetsByName` replaces the per-render scan. `filled` is deprecated in
   favour of the source aliases.
5. **Pictogram artwork stays two fixed source variants** (light/dark) until
   ADR-0002 §5 (dark mode) triggers; the mui-italia two-layer theme-coloured
   approach is the recorded alternative for that trigger.

## 3. Consequences

- A new icon or pictogram cannot land without declaring its provenance: the CI
  chain fails on the missing or stale block, exactly like the pinned geometry.
- Brand overrides are complete blocks, not merges: a brand mark can never
  inherit the Material Symbols licence URL.
- The Storybook catalogue and guides become the human-readable licence record;
  they are generated from the same manifests the checks verify.
- Icon categories remain uncaptured: the Figma icon page is a manual grid
  without containing frames, so a `category` field has no machine source yet.
  Grouping today uses `kind` and the origin label; a category needs the design
  side to nest the icons in frames or to provide a mapping.

## 4. Open verification

The Flaticon acquisition licence (standard vs premium) still has to be confirmed
in the account that downloaded the collection. The credit `SeyfDesigner —
Flaticon` with the collection link is recorded in the manifests and guides
either way; if the licence forbids attribution, remove it from the packaged
notice and the guides and record the licence type on the bulk rule.
