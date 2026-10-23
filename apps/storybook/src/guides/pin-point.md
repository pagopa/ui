# PinPoint

`PinPoint` implements the Figma component set `PinPoint` (`920:7219`): a map
marker the caller places at a percentage of the surface that contains it.

| Source variant                        | Source property                                       | Implementation                                                |
| ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| root, every variant                   | 48×61 frame                                           | the marker box, centred on the `x`/`y` point                  |
| `Properties=Default, Product=Default` | 32×41 teardrop, `#0b3ee3`                             | `variant="default"`, a 32px marker                            |
| `Ellipse 2`                           | 11×11 white dot                                       | `fill-primary-foreground` circle, 10.67px                     |
| `Properties=Numbered`                 | 32×32 box, `5` in 16/22 Semibold                      | `variant="numbered"`, `children` is the ordinal               |
| `Properties=Placeholder`              | 32×41 teardrop, `#d13333` inside a 1px `#5d1313` ring | `variant="placeholder"`, destructive fill over the error ring |
| `Properties=Selected`                 | 48×61 teardrop, no dot                                | `active`, the marker grows to 48px                            |
| `Properties=Selected, Product=Send`   | 28×28 product glyph in the marker                     | `active` with `children`, a 28px glyph slot                   |

The teardrop is one source path (`Ellipse 1`) drawn once and scaled by the
marker width: 32px for the idle sizes, 48px when selected.

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

The marker is a native button centred on `x`% and `y`% of the nearest
positioned ancestor, with a 44px pointer target around the 32px glyph.
`aria-pressed` carries the selected state and `onPressedChange` reports the next
one, so the caller owns the selection. `label` is the accessible name; the
teardrop and the glyph are decorative. The frame the source shares by all five
variants is a layout box, not an anchor: the component centres the marker on the
point, so a pin's head sits at the point rather than below it.
