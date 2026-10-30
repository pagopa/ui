<!-- component-rules:start -->

## Component Rules

- The pin shows the positive or negative outcome of a process, for example a wizard step.

<!-- component-rules:end -->

`PinPoint` is a map marker the caller places at a percentage of the surface that
contains it, with `variant="default"`, `"numbered"` (the ordinal is `children`) or
`"placeholder"`. `active` grows the marker to the selected size and, with
`children`, turns it into the product glyph slot.

## Example

```tsx
<div className="relative h-96">
  <MapSurface />
  <PinPoint label="Sede del Comune" x={38} y={54} />
  <PinPoint label="Sportello" x={62} y={41} variant="numbered">
    2
  </PinPoint>
</div>
```

## Behaviour

The marker is a native button centred on `x`% and `y`% of the nearest positioned
ancestor, with a pointer target around the glyph. `aria-pressed` carries the
selected state and `onPressedChange` reports the next one, so the caller owns the
selection. `label` is the accessible name; the teardrop and the glyph are
decorative. The component centres the marker on the point, so a pin's head sits at
the point rather than below it.
