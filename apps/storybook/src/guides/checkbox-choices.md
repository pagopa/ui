`Checkbox` is the native choice box: a real input whose accessible name comes
from an associated label. Its glyph keeps the source size; the pointer target is
an invisible expansion on that box, and the keyboard focus is the shared solid
perimeter. The source set (`194:3654`) is the same control in its `Status`
values: `Default` is unchecked, `Selected` is checked and `Focused` is the
keyboard-focused unchecked state. Focus uses the shared blue perimeter; the
source red glyph is treated as the error state, exposed through `aria-invalid`,
because red on plain focus would read as a validation error. The open question
is recorded in
[2026-10-24-checkbox-focus-state.md](../../../../docs/design-requests/2026-10-24-checkbox-focus-state.md).

`CheckboxField` covers Figma nodes `194:3661` (plain control) and `194:3763`
(one rich option), not a group. The option row is the source row plus its
vertical padding; the target expansion reaches an accessible size without
inflating the row — a taller row would be drift. The rich option adds a
decorative icon and can move the indicator to the end with
`indicatorPlacement="end"`. The source `194:3661` `Status` axis is the control
state, not a prop: `Default` and `Default disable` are unchecked, `Selected` and
`Selected disabled` are checked (`defaultChecked` or `checked`, plus `disabled`)
and `Feedback` is the unchecked error state (`error`).

Label, description, validation and required state stay associated with the
native control. The error is exposed through the native invalid state and its
associated message without replacing the source outline artwork. Form reset
follows native behaviour.

The reviewed parity cases cover `194:3763` at the 320px source width: the
selected and unselected rich option, both unavailable states and the Error
state, with the heading, label and description measured separately.
