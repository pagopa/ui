`PagoPAPictogram` renders the published pictograms as light and dark artwork,
scaled by `size` (`sm`, `md`, `lg` or a number) with an optional visible
caption.

```tsx
<PagoPAPictogram name="Access" size="md" />
<PagoPAPictogram name="Access" background="dark" label="Accesso" />
```

`background="dark"` selects the artwork drawn for a dark surface, not a dark
application theme (the application theme is light-only).

## Provenance and licence

The pictograms are the Flaticon "Blue" collection by **SeyfDesigner**, the
source linked from the Figma "• Pictograms 🟢" page
(`flaticon.com/authors/seyfdesigner/blue`). Light and dark are the two source
backgrounds.

The provenance block lives on the registry bulk rule (`provenance`) and lands in
every manifest entry, so `pictograms:check` fails when it drifts. The
attribution terms of the acquisition licence still need confirmation: keep the
credit `SeyfDesigner — Flaticon` with the collection link whenever the
pictograms are redistributed.

## Relationship with mui-italia

The published concepts match the `MI*` illustrations of `pagopa/mui-italia` 1:1
by normalised name: `IllusMI<Name>` maps to `<PagoPAPictogram name="<Name>" />`.
mui-italia coloured the two layers from the theme in a single asset, while this
library ships the two source backgrounds as separate artwork.
