# Spacer

`Spacer` implements the Figma `Spacing` set `237:1307`: seven variants, one per step
of the spacing scale. Every variant is a 320×N component whose only child,
`Rectangle 28`, is a rectangle with no fill and no stroke, so the source paints
nothing at any step. The height is the whole contract.

| Source variant  | Code                    | Height |
| --------------- | ----------------------- | ------ |
| `Dimensione=4`  | `<Spacer size={4} />`  | 4px    |
| `Dimensione=8`  | `<Spacer size={8} />`  | 8px    |
| `Dimensione=16` | `<Spacer size={16} />` | 16px   |
| `Dimensione=24` | `<Spacer size={24} />` | 24px   |
| `Dimensione=32` | `<Spacer size={32} />` | 32px   |
| `Dimensione=40` | `<Spacer size={40} />` | 40px   |
| `Dimensione=48` | `<Spacer size={48} />` | 48px   |

Each height is the spacing-scale utility of the same value (`h-1`, `h-2`, `h-4`,
`h-6`, `h-8`, `h-10`, `h-12`); there is no inline pixel and no step outside the
seven. A recurring value the scale does not carry enters through the spacing
manifest, never through a local override.

The block is structural and invisible: no fill, stroke, radius, shadow or text.
It carries `aria-hidden="true"` and no role, so it never appears in the
accessibility tree, and it is not focusable. Place it inside the composition
that needs the gap; where a padding, gap or margin on the surrounding layout
expresses the same rhythm, prefer that utility and keep the spacer for the
cases where no owner element can carry the spacing.

The set's values are scale steps, not a `Device` axis: one composition at every
width, no device case. Because the source paints nothing at any step, the
component has no visual parity case — a capture would compare an empty
rectangle to an empty rectangle. Its height contract is asserted by the
`Ladder` story, which renders all seven steps and checks each height, the
absence of paint, border and shadow, and the hidden, role-less semantics.
