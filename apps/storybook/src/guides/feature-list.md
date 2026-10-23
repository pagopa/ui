# Feature list

`FeatureList` implements the Figma set `FeatureList` (`920:4502`). The set draws
one 270px row per `Indicator` variant — `Pictogram`, `Icon` and `Numberlist` —
not a device: every row keeps the same composition at every page width.

| Source layer    | Figma property         | Implementation                                                     |
| --------------- | ---------------------- | ------------------------------------------------------------------ |
| `Frame 1048`    | `Indicator=Pictogram`  | `pictogram`, a 40px pictogram centred on the 40px slot             |
| `Frame 1048`    | `Indicator=Icon`       | `icon`, a 24px decorative icon in `#bbc2d6`                        |
| `Frame 1048`    | `Indicator=Numberlist` | `numbered`, the item ordinal as `1.` in 16/22 semibold grey-700    |
| `Title`         | common                 | `title`, 16/22 semibold grey-700, as `titleAs` (`h2`/`h3`)         |
| `Frame 5329`    | common                 | the 4px gap between the title and the 14/20 grey-700 `description` |
| `Nome servizio` | `CTA?`                 | `action`, a 16/21 semibold blue underlined link                    |

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
mixing the three kinds across one list is honoured per item. Only the numbered
variant needs `numbered`, which prints the ordinal of the item in the list.
`titleAs` picks the heading level; the list is already a `ul`, so the title
never carries the list semantics.

The two 2×28 connector rectangles the source set still contains (`Rectangle 673`
and `Rectangle 672`) are hidden in every variant and are not rendered: the
pictogram stands alone in its 40px slot. The source `Nome servizio` label is the
`CTA?` property and carries a static underline; the link keeps it on every
state and adds the focus ring on keyboard focus.

The numbered ordinal keeps grey-700 although the source paint is `#bbc2d6`: the
source colour reads 1.77:1 on white and the accessibility gate requires 4.5:1
for a 16px label. The indicator is decorative (`aria-hidden`), so the darker
value costs no meaning and the item keeps its accessible name from the title.
