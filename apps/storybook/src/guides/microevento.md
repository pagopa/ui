# Microevento

`Microevento` implements the Figma component `9676:5633`: one row of a timeline
touchpoint with the correction tag above the event description.

| Source layer          | Source property                           | Implementation                             |
| --------------------- | ----------------------------------------- | ------------------------------------------ |
| root                  | 725×91, insets 8/0/8/28                   | `py-2 pl-7`, no root gap                   |
| `Frame 2087324584`    | 21×20 `Description` slot, drawn empty     | the optional `time` in the leading slot    |
| `Frame 2087324583`    | 676 wide, vertical, 5px gap               | `flex min-w-0 flex-col gap-1`              |
| `Correction/NotValid` | 160×30 tag instance                       | `<CorrectionNotValid label={label} />`     |
| `Description`         | 676×40, Titillio-Regular 14/20, `#0e0f13` | `title`, `text-label-mini text-foreground` |

The source sample reserves a 21px leading slot and draws it empty; the component
fills it with the optional `time` (`text-label-mini text-muted-foreground`,
`shrink-0`). When `time` is absent the slot collapses, so the tag starts at the
28px inset instead of the source 49. The 28px inset is a recorded foundation
exception: the source declares the 28px inset but the published spacing scale
has no 28px step.

`invalid` selects the source tag instance: `true` (the set default) is
`CorrectionNotValid` with `label` “EVENTO NON VALIDO”, `false` is
`CorrectionValid` with “EVENTO RETTIFICATO”. The description is consumer-owned;
the component never composes it.

## Example

```tsx
<Microevento
  time="14:30"
  invalid={false}
  label="Evento rettificato"
  title="La raccomandata è stata riconsegnata al mittente."
/>
```

The row is a plain group: the tag keeps its own text semantics and the
description is a paragraph, so assistive technology reads the correction outcome
before the event copy.
