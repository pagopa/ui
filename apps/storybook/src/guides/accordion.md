`Accordion` maps the Figma `AccordionItem` set `State` axis: closed, open,
disabled and skeleton. The set has no device axis; the caller's column decides
the available width.

The caller owns the copy: `title`, `description`, `chip`, `icon` and `content`
are data, and the source sample strings are not defaults. A disabled item keeps
its full title colour and turns only the chevron decorative-secondary. The
skeleton item keeps the header and draws placeholder rows instead of content.

The announced strings are overridable: pass `aria-label` for the group name
(default `Approfondimenti`) and `loadingLabel` for the skeleton announcement
(default `Caricamento in corso`).

```tsx
<Accordion aria-label="Domande frequenti" loadingLabel="Caricamento delle domande">
  {/* items */}
</Accordion>
```

An item is a native trigger with `aria-expanded`; a disabled item keeps its
`aria-disabled` state and does not open. The skeleton item is an `aria-busy`
container with no control of its own, and its title, chip and icon are decorative
because the announced state is the loading label.

## Controlled and uncontrolled

`value` with `onValueChange` hands the open sections to the caller; `defaultValue`
opens sections at mount when `value` is omitted. Both modes share one lifecycle:
a header click, Enter or Space reports the ids open afterwards, so the caller
answers the same handler whatever opened the section.

```tsx
const [open, setOpen] = React.useState<string[]>(["pagamento"])

<Accordion items={items} value={open} onValueChange={setOpen} multiple />
```

`multiple` keeps more than one section open at once; without it a new section
replaces the open one, which is the composition the source draws. `ref`,
`className` and the standard attributes of a `div` land on the root, so the group
can be measured, styled or marked by the caller, and `className` is merged with
the root's own.
