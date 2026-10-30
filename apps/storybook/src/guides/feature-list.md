`FeatureList` renders one row per feature, each with one indicator: `pictogram`,
`icon` or `numbered`. The set is not a device axis, so every row keeps the same
composition at every page width.

## Example

```tsx
<FeatureList
  features={[
    {
      title: "Pubblica i tuoi servizi",
      description: "Carica i servizi e rendili disponibili ai cittadini.",
      pictogram: <PagoPAPictogram name="Flag" size={40} />,
      action: { label: "Scopri di più", href: "/servizi" },
    },
    { title: "Monitora le richieste", icon: <PagoPAIcon name="photo" /> },
    { title: "Accedi all'area riservata" },
  ]}
  numbered
/>
```

## Behaviour

One indicator drives the row: `pictogram` wins over `icon`, and `icon` wins over
`numbered`; without any of them the row keeps only the text column, so a caller
mixing the three kinds across one list is honoured per item. `numbered` prints the
ordinal of the item in the list. `titleAs` picks the heading level; the list is
already a `ul`, so the title never carries the list semantics.

The indicator is decorative (`aria-hidden`), so the item's accessible name comes
from its title, and the ordinal keeps a contrast-qualified colour instead of the
source's faint paint. `action` renders an underlined link that keeps the underline
on every state and adds the focus ring on keyboard focus.
