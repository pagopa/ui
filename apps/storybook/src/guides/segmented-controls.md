`SegmentedControl` is the source pill: one `role="group"` of mutually exclusive
segments, the selected one carrying `aria-pressed` and the primary fill. The
caller owns the segments and their labels; the control holds the visual state
and reports the chosen value.

The source `Size=Default` variant is a 64px pill with 8px padding and an 8px
gap between 48px segments (`Button group single element`, radius 100): the
selected segment is primary with the 16/22 Semibold label in the inverse
colour, the others keep the same label in the foreground and a soft hover. The
component paints that composition from the `items` array and the controlled
`value`; the labels are the source's 24px inline inset plus their text width,
so a 140px segment is a 92px label with the 24px insets.

At a 320px viewport the pill keeps a 16px inline inset and each segment is
`min-w-0 truncate`, so a long label truncates instead of overflowing the
group. The source's `Size=Minimum` variant draws a different compact
composition — the selected label plus an icon-only segment — and the library
does not implement it; the open question is recorded in
`docs/design-requests/2026-10-22-segmented-control-minimum-size.md`.
