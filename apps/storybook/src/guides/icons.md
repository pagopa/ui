<!-- component-rules:start -->

## Component Rules

- Feedback icons are four: success, info, warning and error; `notice` is legacy and will be removed.

<!-- component-rules:end -->

`PagoPAIcon` renders the pinned Figma artwork by name, with no icon font or
raw-name fallback. Brand images preserve their owners' colours; monochrome masks
inherit the surrounding semantic `currentColor` and the user's forced-colour
foreground.

```tsx
<PagoPAIcon name="info" decorative={false} label="Informazioni" filled />
<PagoPAIcon name="person" variant="selected" />
<PagoPAIcon name="arrow" variant="left" />
```

Omitting state selectors preserves the source default, not an assumed outlined
state. `variant` selects a published alias — selected, checked/indeterminate,
directional, dimension, brand, filled or outlined — and an unsupported alias throws
rather than silently substituting the default. `filled` is supported only by
`info`, `error`, `inventory_2`, `near_me` and `send`; do not combine it with
`variant`. The source's `near_me` filled labels are inverted: aliases follow the
actual artwork. The white default artwork needs a dark, contrasting surface;
`variant="dark"` selects alternate artwork, not a dark theme. Prefer
`variant="filled"` or `variant="outlined"`: the `filled` boolean is deprecated.

`PagoPAIcon` renders a `span` mask (or an `img` for brand artwork), not an inline
`svg`, so `[&_svg]:size-*` selectors never match it: size it with the numeric
`size` prop. Use `decorative` (the default) or `label` instead of `aria-hidden`.

## Adding and replacing icons

Only source glyphs join the catalogue. A missing icon is requested from design,
because the Figma library is read-only from this repository, and it follows the same
Material Symbols settings as the rest of the catalogue. Until the source exists, a
gap is covered with a `lucide-react` glyph inside a primitive, or inside a private
component with a reasoned API exception; never invent a source mapping.

The current gaps are `Building2`, `Camera`, `Cookie`, `FileText` and `TrendingUp`
(no source artwork) and the neutral sort `ArrowUpDown`, `ChevronsUpDown` and
`XCircle` (no resolved source equivalent). Field success uses `CheckCircle2` while
the source glyph is `check_circle`. Source glyphs are already used where they exist:
the field error `report`, the `HeaderAlert` and `Alert` tones, and the `Button`
loading spinner. `DropdownItem.icon` exposes the lucide `LucideIcon` type in the
public declarations, so replacing it is a breaking change.

## Provenance and licence

The glyphs come from **Material Symbols** (Google), at Rounded shape, weight 400,
fill off, grade normal, optical size 24dp. Material Symbols is Apache-2.0. The brand
marks (IO logo, SPID, CIEID, CIE, pagoPA, SEND, Media logos) keep their owners' terms
and are reproduced in the source colours; `first_letter`, `second_letter`,
`third_letter`, `online_address` and `mail_pec` are in-house PagoPA glyphs.
