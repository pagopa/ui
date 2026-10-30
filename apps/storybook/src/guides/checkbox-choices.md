`Checkbox` is the native choice box: a real input whose accessible name comes
from an associated label. The pointer target is an invisible expansion on the
box itself, and keyboard focus draws the shared solid perimeter. Red is only ever
the error state, exposed through `aria-invalid`, never plain focus, which would
read as a validation error. The open question is recorded in
[2026-10-24-checkbox-focus-state.md](../../../../docs/design-requests/2026-10-24-checkbox-focus-state.md).

`CheckboxField` is one option row, not a group; the target expansion reaches an
accessible size without inflating the row. The rich option adds a decorative
icon, and `indicatorPlacement="end"` moves the indicator after the label. The
control state is not a prop: use `defaultChecked` or `checked`, add `disabled`,
and `error` for the unchecked error state.

Label, description, validation and required state stay associated with the
native control. The error is exposed through the native invalid state and its
associated message, not by replacing the outline artwork. Form reset follows
native behaviour.
