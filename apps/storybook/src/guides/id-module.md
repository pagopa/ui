<!-- component-rules:start -->

## Component Rules

- Keep 8px between modules and 24px at the sides.
- The modal keeps a uniform 410px width from 600px to 1440px.

<!-- component-rules:end -->

# IdentityProviderPicker

`IdentityProviderPicker` renders a provider chooser for digital identity sign-in. The caller
owns the provider labels, logos, destinations, and close behavior:

```tsx
<IdentityProviderPicker
  title="Scegli il tuo SPID"
  closeLabel="Chiudi"
  onClose={closeChooser}
  providers={[
    {
      id: "poste-id",
      label: "POSTE ID",
      logo: <img src="/logos/poste-id.svg" alt="" />,
      href="/auth/spid/poste",
    },
  ]}
/>
```

`device` selects the source header scale (`"mobile"` by default or `"desktop"`).
From the `tablet` device step (600px) the module is 410px wide, the source
frame width, capped by its container; below 600 it fills the available width.
The `--id-module-width` local extension carries that value, and the source
frames above 1440 only widen the page, so the panel keeps the same width.
`IdentityProviderPicker.Provider` is also available for a single, caller-configured provider
row.

## Accessibility and composition

- Providers are native links; do not nest buttons or other interactive elements
  inside them. Supply real destinations and meaningful visible labels.
- Logos are decorative to assistive technology. The visible provider label names
  its link, while the logo is passed in as caller-owned `ReactNode` artwork.
- The close action is a native `type="button"` with an accessible label and an
  enlarged target; its glyph stays aligned to the source edge while the larger
  target expands toward the title. `IdentityProviderPicker` is a labelled section, not a modal
  dialog. A parent that presents it as a dialog owns dialog semantics, focus
  management, Escape, and focus restoration.
- Focus outlines remain explicit in forced-colors mode. The component adds no
  transitions, so reduced-motion preferences do not introduce animation.

## Source notes

The source contract is the `.IDPSingleModule` provider row (not published as a
top-level component, instantiated inside set
`731:20386`) and the `Device` variants of that set (`731:20385` mobile,
`731:20387` desktop). The panels contain one column of caller-configured
providers. The story logos are crops from the pinned mobile reference, kept as
test fixtures rather than component defaults. The implementation uses the
existing spacing and type tokens rather than near-match literals.
