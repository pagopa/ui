`PagoPAIcon` renders the pinned Figma artwork by name, with no icon font or
raw-name fallback. Brand images preserve their owners' colors; monochrome masks
inherit the surrounding semantic `currentColor` and the user's forced-color
foreground.

```tsx
<PagoPAIcon name="info" decorative={false} label="Informazioni" filled />
<PagoPAIcon name="person" variant="selected" />
<PagoPAIcon name="arrow" variant="left" />
```

Omitting state selectors preserves the source default, not an assumed outlined
state. `variant` selects an actual published alias, including selected,
checked/indeterminate, directional, dimension, brand and filled/outlined states.
Unsupported aliases throw rather than silently substituting the default.
`filled` is supported only by `info`, `error`, `inventory_2`, `near_me` and
`send`; do not combine it with `variant`. The source's `near_me` Filled labels
are inverted: aliases follow the actual artwork while retaining the original
outlined default. The white IO Light default needs a dark, contrasting surface;
choosing `variant="dark"` selects the source's alternate artwork, not a dark
theme. Prefer `variant="filled"` / `variant="outlined"`; the `filled` boolean is
deprecated.

Source variant names are mapped explicitly in the registry, never inferred from
the name: `Direction=Forward`/`Back` become `right`/`left`, and
`Background=Default` and `Background=Light` both mean the light artwork.

## Usage

`PagoPAIcon` renders a `span` mask (or an `img` for brand artwork), not an inline
`svg`, so `[&_svg]:size-*` selectors never match it: size it with the numeric
`size` prop. Use `decorative` (the default) or `label` instead of
`aria-hidden`. Each mask variant costs one network request, cached by the
browser. Never ship an icon font or a text fallback.

## Adding and replacing icons

Only source glyphs join the `PagoPAIcon` catalogue. A missing icon is requested
from design, because the Figma library is read-only from this repository, and it
follows the same Material Symbols settings as the rest of the catalogue. Until the source exists, a gap is covered with a
`lucide-react` glyph inside a primitive, or inside a private component with a
reasoned API exception; never invent a source mapping.

The current gaps are `Building2`, `Camera`, `Cookie`, `FileText` and
`TrendingUp` (no source artwork) and the neutral sort `ArrowUpDown`,
`ChevronsUpDown` and `XCircle` (no resolved source equivalent). Field success
uses `CheckCircle2` while the source glyph is `check_circle`. Source-true glyphs
are already used where they exist: the field error `report`, the `HeaderAlert`
and `Alert` tones (`info` filled, `check_circle`, `warning`, `report`) and the
`Button` loading `SpinnerIndicator`. `DropDownItem.icon` exposes the lucide
`LucideIcon` type in the public declarations, so replacing it is a breaking
change.

Artwork is generated offline from the complete pinned source:
`node scripts/figma-icons.mjs --write --input .figma/live-rest.json`.
Registry policies and generated assets are keyed by `nodeId`; never hand-edit
the SVGs, manifest or runtime map.

## Provenance and licence

The glyphs come from **Material Symbols** (Google), built with the Figma plugin
at the design-system settings: Rounded shape, weight 400, fill off, grade
normal, optical size 24dp. `icons:check` resolves the `provenance` block on the
registry bulk rule (with complete per-identity `provenanceOverrides`) and stamps
it into every manifest entry, so the metadata cannot drift from the pinned
artwork.

Material Symbols is Apache-2.0. The brand marks (IO logo, SPID, CIEID, CIE,
pagoPA, SEND, Media logos) keep their owners' terms and are reproduced in the
source colours; `first_letter`, `second_letter`, `third_letter`,
`online_address` and `mail_pec` are in-house PagoPA glyphs. The catalogue labels
every non-Material identity, and a brand override is a complete provenance block,
never a partial patch. Icon categories are not captured: the Figma icon page is a
manual grid without containing frames. The pictograms have their own guide
(`Foundations/Icons and pictograms` → Pictograms).
