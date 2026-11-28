`CarouselStepper` is the position indicator of a carousel: `count` positions,
`activeIndex` selected, `onChange` for the caller's state. The source has no
variant axis and no device axis: one composition, and the caller's row decides the
width.

## Behaviour and accessibility

- Every position is a native button with a spoken name. The default is
  `Contenuto N di M`; `getControlLabel(index, count)` returns the whole sentence,
  so a consumer owns the language, the plurals and the word order.
- The stepper is one tab stop: the active position is tabbable and the others are
  not. ArrowRight and ArrowLeft move by one and wrap, Home and End jump to the
  edges, and the focus follows the selection.
- `aria-current="true"` marks the selected position. The dot is the button, so
  nothing decorative is duplicated in the accessibility tree.
- The visible dot keeps the source box and the row keeps its height: the pointer
  target comes from an invisible expansion of the dot, never from inflating the
  row. The dots sit on a 16px gap, so their centres are 24px apart and a 24x24
  target fits between two neighbours without overlapping either — WCAG 2.5.8 at
  the smallest change it allows. The source draws an 8px gap, which leaves 16px
  between centres and no room for the rule; the resolution and the alternatives
  are recorded in
  `docs/design-requests/2026-10-23-carousel-stepper-target-size.md`.
- The width, height and background transition animates the selection and is
  removed under reduced motion.
