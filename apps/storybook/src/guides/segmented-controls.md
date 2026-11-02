`SegmentedControl` is one `role="group"` of mutually exclusive segments; the
selected segment carries `aria-pressed` and the primary fill. The caller owns the
segments and their labels in `items`, and the control reports the chosen
`value`.

The selected segment takes the inverse label colour; the others keep the
foreground colour and a soft hover. Long and translated labels wrap inside their
segment, including unbroken words. When the choices cannot fit side by side,
the group wraps them onto additional rows rather than clipping controls or
hiding labels. Its outer radius is derived from half the source pill's minimum
height, so the surface still contains the wrapped rows. This is an accessibility
adaptation using existing spacing tokens; the short-label source composition
stays on one row at its source width. The `LongLabels` story verifies complete labels and controls in a narrow
container with increased text spacing and doubled root text size; this is
automated content-loss evidence, not manual browser-zoom or screen-reader
verification. The source `Size=Minimum` variant, the selected label plus an
icon-only segment, is not implemented; the open question is recorded in
`docs/design-requests/2026-10-22-segmented-control-minimum-size.md`.
