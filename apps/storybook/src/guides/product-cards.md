One `ProductCard` represents both source cards. Supply the `image` slot for the
full-bleed cover composition; `Image` remains the media primitive. Optional
caller-owned `logo` and `chip` slots provide the logo frame and compact status, and
`Chip size="compact" variant="highlight"` supplies the Premium appearance. Titles
are genuine headings, `h3` by default, or `titleAs="h2"` when the surrounding
outline requires it.

```tsx
<ProductCard
  title="Portale dei servizi"
  titleAs="h2"
  chip={
    <Chip size="compact" variant="highlight">
      Premium
    </Chip>
  }
  description="Gestisci il prodotto con i suoi amministratori."
  href="/prodotti/servizi"
  actionLabel="Vai al prodotto"
/>
```

Choose `href` for native navigation or `onAction` for an application action, never
both: competing actions are rejected by types and at runtime. Links retain Enter,
modifier and new-tab navigation and the platform's Space behaviour; callback
buttons are explicitly non-submitting inside forms. An action label alone does not
create an inert button. Rich descriptions accept caller-owned React content,
including independent administrator or detail links.

## CatalogueCard

`CatalogueCard` is the source card of the service catalogue, not a `ProductCard`
variant. Its inside-aligned stroke renders as the card family's ring, so the source
insets keep their layout space.

```tsx
<CatalogueCard
  avatar={<Avatar size="small" alt="Immagine dell'ente" />}
  title="Colonnine di ricarica auto elettriche"
  organization="Comune di Milano"
  description="Il servizio rivolto agli enti dell’area metropolitana…"
  actions={[
    { label: "Ispeziona", href: "/servizi/colonnine" },
    { label: "Iscriviti", onPress: subscribe },
  ]}
  feedback={[
    <PagoPAIcon key="person" name="person" variant="selected" size={24} />,
    <PagoPAIcon key="check" name="check" variant="big" size={24} />,
  ]}
/>
```

The header pairs a smaller `Avatar` with the title above the organisation name; the
description follows, and the action row holds the text actions and the right
feedback slot. Text actions keep their line box and reach the accessible target
through an invisible expansion, so the visible line is never inflated.

`eyebrow` renders a semibold primary label above the title, `tags` renders an
`InputChip` row after the description, `children` appends caller content, `titleAs`
selects `h2` or `h3` for the surrounding outline, and `className` and div props pass
through. The feedback artwork is decorative: when an indicator carries meaning, pass
it with `decorative={false}` and a `label` so the state has a text alternative.
`actions` and `feedback` are independent, so either side alone keeps the row instead
of an empty slot.

The cover retains the source proportions and the optional logo overlap; its action
is outlined without an arrow. Long headings, chips and actions wrap in narrow nested
grids rather than clipping.
