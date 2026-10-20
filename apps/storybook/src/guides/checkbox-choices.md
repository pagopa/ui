`Checkbox` is the native choice box: a real input whose accessible name comes
from an associated label. Its glyph keeps the source size; the pointer target is
an invisible expansion on that box, and the keyboard focus is the shared solid
perimeter.

`CheckboxField` covers Figma nodes `194:3661` (plain control) and `194:3763`
(one rich option), not a group. The option row is the source row plus its
vertical padding; the target expansion reaches an accessible size without
inflating the row — a taller row would be drift. The rich option adds a
decorative icon and can move the indicator to the end with
`indicatorPlacement="end"`.

Label, description, validation and required state stay associated with the
native control. The error is exposed through the native invalid state and its
associated message without replacing the source outline artwork. Form reset
follows native behaviour.
