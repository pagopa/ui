<!-- component-rules:start -->

## Component Rules

- Feedback icons are four: success, info, warning and error; `notice` is legacy and will be removed.

<!-- component-rules:end -->

`PagoPAIcon` renders the pinned Figma artwork inline, as an `svg` painted by its
geometry, with no icon font and no image request. Brand artwork preserves its
owners' colours; monochrome glyphs inherit the surrounding semantic
`currentColor` and the user's forced-colour foreground.

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

Every published identity is also one component per pinned variant on its own
entry, so an import from that entry carries no other icon artwork. `@pagopa/ui/icons`
itself exports the generated glyph components and nothing that resolves a runtime
name; the resolvers (`PagoPAIcon`, `PagoPAPictogram`) and the name unions
(`iconNames`, `pictogramNames`, `FigmaIconName`, `FigmaPictogramName`) are served
by `@pagopa/ui`:

```tsx
import Info from "@pagopa/ui/icons/info" // the `outlined` source variant
import { Filled as InfoFilled } from "@pagopa/ui/icons/info" // the same identity, filled
import { variants as infoVariants } from "@pagopa/ui/icons/info" // keyed by source node id
```

`PagoPAIcon` renders an `svg`, so `[&_svg]:size-*` selectors match it; the numeric
`size` prop sets both dimensions. Use `decorative` (the default) or `label`
instead of `aria-hidden`. A name outside the published catalogue renders nothing,
so a runtime string cannot fail the surface that hosts it; an unsupported
`variant` of a published name still throws. Both the missing-name and the
missing-label diagnostics speak in development only: the library build folds
their guard away, so the published package renders nothing for an unknown name
without a warning.

## Adding and replacing icons

Only source glyphs join the catalogue. A missing icon is requested from design,
because the Figma library is read-only from this repository, and it follows the same
Material Symbols settings as the rest of the catalogue; never invent a source
mapping. No module of the library imports an icon from a third-party package:
a shipped component imports the generated glyph module it renders — or the
pinned variant component, when it has to hand the geometry to another primitive
— so its bundle carries those glyphs and nothing else. `PagoPAIcon` is the
resolver for a surface that enumerates the catalogue by name, such as the
Storybook gallery; a shipped component never reaches for it.

Four identities have no pinned counterpart and use the closest source glyph instead:
`Camera` is `photo` (the `CameraView` placeholder), `Building2` is
`account_balance` (the organization module and the account tabs), `FileText` is
`receipt_long` (the document tab) and the neutral sort `ArrowUpDown` is `unfold`.
Every other affordance the library renders is the source glyph itself: `chevron`
for the directional state, `close`, `check`, `check_circle` for field success,
`report` for field error, `warning` and `info` for the `HeaderAlert` and `Alert`
tones, the `Button` loading spinner, and `check_indeterminate_small` for the
`OTPField` separator. `DropdownItem.icon` takes the pipeline's `IconComponent`, so a
row leads with any pinned variant component.

## Provenance and licence

The glyphs come from **Material Symbols** (Google), at Rounded shape, weight 400,
fill off, grade normal, optical size 24dp. Material Symbols is Apache-2.0. The brand
marks (IO logo, SPID, CIEID, CIE, pagoPA, SEND, Media logos) keep their owners' terms
and are reproduced in the source colours; `first_letter`, `second_letter`,
`third_letter`, `online_address` and `mail_pec` are in-house PagoPA glyphs.
