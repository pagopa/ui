`MicroEvent` is one row of a timeline touchpoint: the correction tag above the
event description, with the event time on its own line below the copy.

`invalid` selects the source tag: `true` (the set default) renders
`status="not-valid"` with the label `EVENTO NON VALIDO`, `false` renders
`status="valid"` with `EVENTO RETTIFICATO`. `label` replaces that tag text, `title`
is the consumer-owned description the component never composes, and `time` renders
in the upper-case caption style.

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
