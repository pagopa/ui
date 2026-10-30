<!-- component-rules:start -->

## Component Rules

- Keep 8px between modules and 24px at the sides.
- The modal keeps a uniform 410px width from 600px to 1440px.

<!-- component-rules:end -->

`IdentityProviderPicker` renders a provider chooser for digital identity sign-in.
The caller owns the provider labels, logos, destinations and close behaviour:

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

`device` selects the header scale (`"mobile"` by default or `"desktop"`). From the
`tablet` device step the module keeps the source frame width, capped by its
container; below it the module fills the available width.
`IdentityProviderPicker.Provider` is also available for a single, caller-configured
provider row.

## Accessibility and composition

- Providers are native links; do not nest buttons or other interactive elements
  inside them. Supply real destinations and meaningful visible labels.
- Logos are decorative to assistive technology. The visible provider label names
  its link, while the logo is passed in as caller-owned `ReactNode` artwork.
- The close action is a native `type="button"` with an accessible label and an
  enlarged target. The picker is a labelled section, not a modal dialog: a parent
  that presents it as a dialog owns dialog semantics, focus management, Escape and
  focus restoration.
- Focus outlines remain explicit in forced-colours mode. The component adds no
  transitions, so reduced-motion preferences do not introduce animation.
