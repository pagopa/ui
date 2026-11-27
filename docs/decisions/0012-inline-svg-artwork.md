# ADR-0012 — Icons are inline SVG components, and an unknown name renders nothing

- **Status:** Accepted — 2026-12-02.
- **Date:** 2026-12-02
- **Context:** `PagoPAIcon` delivered the pinned source artwork two ways: a
  `span` whose `mask-image` pointed at the pinned SVG for monochrome glyphs, and
  an `img` for the multicolour brand marks. Both were network or asset requests
  at render time, both defeated `[&_svg]` sizing selectors, and the mask
  contract — a background colour, `mask-position`, `mask-size` and a
  `forced-color-adjust` override — lived in the component instead of in the
  artwork. The catalogue is 159 identities and 196 pinned variants.
- **Related:** [ADR-0003](./0003-artwork-provenance.md) (the provenance this
  decision keeps), [ADR-0006](./0006-parity-coverage-and-bulk-families.md) (the
  bulk-family verification it keeps), [ADR-0001](./0001-rework.md).

## 1. Problem

A mask is a two-hop delivery of one drawing. The consumer pays an asset request
(or an inlined data URL), the drawing cannot inherit a context colour defined
after paint, `forced-colors` has to be repaired with `preserve-parent-color`,
and the DOM exposes a `span` where every design-system consumer expects an
`svg`. The `img` variant has the same problem from the other side: a brand mark
cannot take a size from a parent selector and cannot be recoloured where the
source allows it. The generated catalogue also had no per-icon unit: the only
way in was the whole `icon-assets.ts` map, so any surface that named one icon
carried the possibility of loading all of them.

## 2. Decision space

**A — keep masks, add a sprite.** Publish one sprite sheet of symbols and
reference it with `<use>`.

- Pros: one request, small DOM per icon.
- Cons: the whole sprite is a request for every icon, `currentColor` crosses the
  shadow boundary of `<use>` in a way that the forced-colours repair cannot
  follow, and it still is not an `svg` per icon.

**B — compile each pinned variant to an inline component.** The generator emits
one `<svg fill="currentColor">` per variant, with the source geometry inline
and the internal ids namespaced per icon.

- Pros: no request, `currentColor` inherits, `[&_svg]` works, forced colours
  need no repair for monochrome glyphs, and the family splits into
  tree-shakeable modules.
- Cons: the drawing becomes JavaScript, so the bundle holds the path data, and
  the generated tree is 162 files that must stay in step with the manifests.

**C — keep `img` for brand marks and inline only the monochrome glyphs.**

- Pros: the brand marks keep their own paint without a generator change.
- Cons: two delivery paths survive, and the `img` branch keeps the sizing and
  theming exception that motivated the decision.

## 3. Decision

**B.** `packages/ui-cli/src/figma/icons.ts` compiles every pinned variant with
`svgToJsx` and writes `packages/pagopa-ui/src/components/icons/generated/`:
one module per identity, one exported component per variant plus the default,
a `types.ts` contract and a `registry.ts` index keyed by public name.
`PagoPAIcon` renders the component instead of an asset.

### RD1 — the source stays the source

The generator reads the pinned SVG the manifests already checksum, so the
provenance, the fingerprint and the `check:icons` gate are untouched: the
compiled module is derived, never authored. `assertGeneratedIconFiles` compares
the written tree with the pinned geometry on `check icons`, and a stale or
orphan module fails the check with the regeneration command.

### RD2 — monochrome paints `currentColor`, artwork keeps its paints

A `mask` identity drops the source paint and inherits `currentColor`; an
`image` identity — the seven brand marks — keeps its own fills, because its
colours are the licence. The rule is a property of the identity, not a prop, so
a consumer cannot accidentally recolour a brand mark.

### RD3 — an unknown name renders nothing

A name outside the published set renders `null` with a development warning
instead of throwing. A name is often a runtime string — a CMS value, a mapping
table — and throwing there takes down the surface that hosts it. The published
set is unchanged: `variant`, `filled` and identity conflicts on a _published_
name still throw, because they are authoring mistakes in typed code.

### RD4 — one entry, one component per identity

`@pagopa/ui/icons` exports one component per identity and
`@pagopa/ui/icons/<slug>` exports one per identity as a module, both from named
exports over `preserveModules`, so a consumer that names an icon bundles that
icon and no other artwork. `PagoPAIcon` keeps resolving a runtime name from the
main entry.

## 4. Consequences

- The mask mechanism, its `forced-color-adjust` repair and the `img` branch are
  gone from the component, the stylesheet and every test.
- The bundle carries path data instead of asset URLs: a per-icon import is
  larger than a URL, and a page that renders the whole catalogue is larger than
  the sprite alternative would have been.
- The story `Icons` and the packed-consumer e2e compare drawings, not asset
  URLs: two variants of one identity that pin the same geometry are now
  indistinguishable, which is a property of the source, not a regression.
- `check icons` fails on a stale generated tree, so a manifest refresh and a
  regeneration stay one step.

## 5. Deferred decisions with triggers

| Deferred                              | Trigger                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| Pictograms join the inline components | A pictogram needs `currentColor` or a sizing selector the `img` delivery cannot satisfy |
| A sprite for the catalogue page       | The catalogue's own page weight becomes a measured problem                              |
| Recolouring a brand mark              | The owner's terms allow it, and a product needs it for a themed surface                 |
