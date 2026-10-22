# Accordion

`Accordion` maps the Figma `AccordionItem` set (`759:6399`) `State` axis:
`State=Close` (`759:6398`), `State=Open` (`759:6537`), `State=Disabled`
(`13027:5052`) and `State=Skeleton` (`13027:5623`). The set has no device axis:
the item is the same 580px composition at every width and the caller's column
decides the available width.

The source item is a 24px inset card with an 8px radius and a 1px `#e8ebf1`
stroke. Its `Accordion header` is 50px tall: the 24px `photo` artwork, an 8px
gap, the `Content` stack (the 16/22 Semibold `Section title` and the 24px
`Chip` with a 4px gap) and the 24px `chevron` on the trailing edge, with a 12px
gap before it. In `State=Open` the `Description` follows the header with an
8px step and the caller content starts 32px below the description. In
`State=Disabled` the card takes the grey-100 fill and the chip is an outline;
the title keeps its full colour and only the chevron turns
`icon/decorative-secondary`. `State=Skeleton` keeps the header and draws six
68px placeholder rows with five 1px dividers.

The caller owns the copy: `title`, `description`, `chip`, `icon` and `content`
are data, and the source sample strings are not defaults. The announced
strings are overridable: pass `aria-label` for the group name (default
`Approfondimenti`) and `loadingLabel` for the skeleton announcement (default
`Caricamento in corso`).

```tsx
<Accordion aria-label="Domande frequenti" loadingLabel="Caricamento delle domande">
  {/* items */}
</Accordion>
```

An item is a native trigger with `aria-expanded`; a disabled item keeps its
`aria-disabled` state and does not open. The skeleton item is an `aria-busy`
container with no control of its own. Title, chip and icon are decorative in
the skeleton because the announced state is the loading label.
