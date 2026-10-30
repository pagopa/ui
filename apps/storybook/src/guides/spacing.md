`Spacer` renders one step of the spacing scale in `size`, from 4 to 48. Each
height is the spacing-scale utility of the same value; there is no inline pixel
and no step outside the seven. A recurring value the scale does not carry enters
through the spacing manifest, never through a local override.

The block is structural and invisible: no fill, stroke, radius, shadow or text.
It carries `aria-hidden="true"` and no role, so it never appears in the
accessibility tree, and it is not focusable. Place it inside the composition that
needs the gap; where a padding, gap or margin on the surrounding layout expresses
the same rhythm, prefer that utility and keep the spacer for the cases where no
owner element can carry the spacing.
