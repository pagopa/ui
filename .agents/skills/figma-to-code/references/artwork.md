# Artwork — icons and pictograms

Generated artwork is never hand-edited: the generators own `artwork.*`, the
manifests and the runtime modules. Catalogue names are stable public aliases of
manifest `nodeId`s: a source rename or page move never renames the API.

## Icons

1. **Registry.** Every published icon identity has an explicit entry in
   `catalog.registry` with `localAsset` and the same `target.export` as the
   existing icon entries — one typed icon API; its `filled` prop is deprecated.
   Set `localAsset.rendering: "mask"` for a
   monochrome icon that inherits `currentColor` (forced-colour foregrounds
   included), `"image"` to keep brand colours. A component set needs
   `defaultVariantNodeId` and identity-keyed variant aliases; the actual geometry
   decides, not the source labels (a set whose Filled/Outlined labels are
   inverted keeps its source default and aliases follow the geometry). Rounded
   source geometry and defaults are kept.
2. **Regenerate** offline from the pinned snapshot:
   `node packages/ui-cli/src/cli.ts assets icons --write --input <figma.snapshot>`.
3. **Inspect** the regenerated SVGs and their manifest entries: the review
   follows the [node-review.md](node-review.md) rules.
4. `pnpm nx run pagopa-ui-artwork:assets:check` (icons and pictograms
   together). There is no icon font, text fallback or missing-glyph
   exception. Unchanged artwork may keep its pinned version; the check still
   compares design fingerprints, variant identities, checksums and geometry.

Third-party glyphs (the Lucide set) are imported only through the `primitives`
icon module; no other layer imports them.

## Pictograms

1. **Export** the variants at the pinned version (needs the token; the person
   runs it when it is unavailable):
   `node packages/ui-cli/src/cli.ts assets pictograms --export --input <figma.snapshot>`.
2. **Import**: `node packages/ui-cli/src/cli.ts assets pictograms --write --input <figma.snapshot>`.
3. **Inspect** the light and dark variants (fixed variants, not a theme switch;
   dark artwork needs a contrasting caller surface), then
   `pnpm nx run pagopa-ui-artwork:assets:check`.

Pictogram accounting stays on the page rule and the asset manifest.

## Provenance and licence

- The source and licence sit on the registry bulk rule (`provenance`), with
  complete per-identity `provenanceOverrides` where an identity differs (a brand
  override is a complete block, never a partial one).
- `packages/ui-cli/src/figma/asset-provenance.ts` is the only resolver. The manifests stamp
  `provenance` and `kind`; the runtime modules carry no provenance strings.
- A missing or stale block fails `assets:check` (icons and pictograms
  together).
- The artwork catalogue labels non-Material identities, and the build ships
  `dist/licenses/artwork.txt`. An attribution whose terms are still unconfirmed
  stays credited until the person confirms it.
- Never invent an icon category: the source page is a manual grid without
  containing frames.

## New public names

A new public icon or pictogram name needs a source mapping or a reasoned
`catalog.apiExceptions` entry; `figma:check` verifies that the public names cover
the node-keyed manifests.

**Done when** `pnpm nx run pagopa-ui-artwork:assets:check` passes, the regenerated artwork has been
inspected, and the decision per changed identity is recorded (the drift pull
request merge or the session report).
