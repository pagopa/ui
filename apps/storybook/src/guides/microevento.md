# MicroEvent

`MicroEvent` implements the Figma component `9676:5633`: one row of a timeline
touchpoint with the correction tag above the event description.

| Source layer          | Source property                             | Implementation                                                      |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| root                  | 725×110, insets 8/0/8/28                    | `py-2 pl-7`, no root gap                                            |
| `Frame 2087324584`    | 21×20 `Description` slot, drawn empty       | not drawn: the column starts at the 28px inset                      |
| `Frame 2087324583`    | 676×94 wide, vertical, 5px gap              | `flex min-w-0 flex-col gap-1`                                       |
| `Correction/NotValid` | 160×30 tag instance                         | `<CorrectionTag status="not-valid" label={label} />`                |
| `Description`         | 676×40, Titillio-Regular 14/20, `#0e0f13`   | `title`, `text-label-mini text-foreground`                          |
| `Description` (time)  | 676×14, Titillio-Regular 12/14.4, `#555c70` | `time`, `text-caption leading-none uppercase text-muted-foreground` |

The source draws the event time on its own line below the copy; the component
renders `time` in the same place. It also keeps a 21×20 empty `Description` slot
to the left of the column, unused by any layer: the component draws no leading
slot, so its content column is 21px wider than the source's and that width is
the case's single residue. The 28px inset is a recorded foundation exception:
the source declares the 28px inset but the published spacing scale has no 28px
step.

The source time style is `Label & Caption/Label overline Small`, 12px Titillio
Regular in upper case. The foundation publishes no 12px Regular step, so the
render uses the published 14/20 Caption at a 1:1 line height: the line box
matches the source's 14.4 and the glyph reads 2px larger.

`invalid` selects the source tag instance: `true` (the set default) is
`status="not-valid"` with `label` “EVENTO NON VALIDO”, `false` is
`status="valid"` with “EVENTO RETTIFICATO”. The description is consumer-owned;
the component never composes it.

## Example

```tsx
<MicroEvent
  time="14:30"
  invalid={false}
  label="Evento rettificato"
  title="La raccomandata è stata riconsegnata al mittente."
/>
```

The row is a plain group: the tag keeps its own text semantics and the
description is a paragraph, so assistive technology reads the correction outcome
before the event copy.
