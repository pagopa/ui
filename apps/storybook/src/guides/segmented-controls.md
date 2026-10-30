`SegmentedControl` is one `role="group"` of mutually exclusive segments; the
selected segment carries `aria-pressed` and the primary fill. The caller owns the
segments and their labels in `items`, and the control reports the chosen
`value`.

The selected segment takes the inverse label colour; the others keep the
foreground colour and a soft hover. Long labels truncate inside their segment
instead of overflowing the group. The source `Size=Minimum` variant, the
selected label plus an icon-only segment, is not implemented; the open question
is recorded in
`docs/design-requests/2026-10-22-segmented-control-minimum-size.md`.
