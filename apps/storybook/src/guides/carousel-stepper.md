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
  target comes from an invisible vertical expansion, never from inflating the row.
  The horizontal target is the dot itself, because a wider expansion would overlap
  the neighbouring control; that constraint is an open question for the design
  owner (`docs/design-requests/2026-10-23-carousel-stepper-target-size.md`).
- The width, height and background transition animates the selection and is
  removed under reduced motion.
