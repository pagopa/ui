One `ProductCard` represents both source cards. Supply the existing `image`
slot for the full-bleed cover composition; `Image` remains the media primitive.
Optional caller-owned `logo` and `chip` slots provide the logo frame and
compact status. `Chip size="compact" variant="highlight"` supplies the source
Premium appearance. Titles are genuine headings: `h3` by default, or `titleAs="h2"`
when the surrounding outline requires it.

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

Choose `href` for native navigation or `onAction` for an application action,
never both. Competing actions are rejected by types and at runtime. Links retain
Enter, modifier/new-tab navigation and the platform's Space behavior; callback
buttons are explicitly non-submitting inside forms. An action label alone does
not create an inert button. Rich descriptions accept caller-owned React content,
including independent administrator/detail links.

## CatalogueCard (808:6302)

`CatalogueCard` is the source card of the service catalogue, not a `ProductCard`
variant. The source's inside-aligned stroke is rendered as the card family's
`ring`, so the source insets keep their layout space.

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

The header pairs a smaller `Avatar` with the title above the organization name;
the description follows, and the action row holds the text actions and the right
feedback slot. Text actions keep their source line box and reach an enlarged
pointer target through the invisible `::after` expansion; the visible line is
never inflated.

Extensions keep their place without distorting the source: `eyebrow` renders a
semibold primary label above the title, `tags` renders an `InputChip` row after
the description, `children` appends caller content, `titleAs` selects `h2` or
`h3` for the surrounding outline, and `className`/div props pass through. The
feedback artwork is decorative in the source; when an indicator carries meaning,
pass it with `decorative={false}` and a `label` so the state has a text
alternative. `actions` and `feedback` are independent: either side alone keeps
the source row instead of an empty slot.

The cover retains the source proportions and optional logo overlap; its action
is outlined without an arrow. Long headings, chips and actions wrap in narrow
nested grids rather than clipping. Source reference media is Storybook-only,
not bundled runtime content; engine rendering is never pixel-identical to the
source.

## Source-bound fidelity

The pinned ProductCard set is `757:6288` (cover). The text-only set
(`757:10713`, with `757:10712`/`757:14210` variants) is not published: the text-card story is the caller composition of the same
component, not a source-bound fixture. The cover variants are `757:6226`
(mobile) and `757:6289` (desktop). The direct-import fidelity stories render
them at real mobile and desktop viewports; their story column reproduces the
source sample, not a fixed runtime width.
