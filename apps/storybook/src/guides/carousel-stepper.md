# CarouselStepper

`CarouselStepper` is the position indicator of a carousel: `count` positions,
`activeIndex` selected, `onChange` for the caller's state.

## Behaviour and accessibility

- Every position is a native button with a spoken name. The default is
  `Contenuto N di M`; `getControlLabel(index, count)` returns the whole sentence,
  so a consumer owns the language, the plurals and the word order.
- The stepper is one tab stop: the active position is tabbable and the others
  are not. ArrowRight and ArrowLeft move by one and wrap, Home and End jump to
  the edges, and the focus follows the selection.
- `aria-current="true"` marks the selected position. The dot is the button, so
  nothing decorative is duplicated in the accessibility tree.
- The visible dot keeps the source box — 16x4 for the active position, 8x8 for
  the others, 8px apart — and the 44px pointer target comes from the invisible
  vertical `::after` expansion, so the row keeps the source 8px height instead
  of inflating to the target. The dots sit on the source's own 16px pitch: the
  horizontal target is the dot itself, because a wider expansion would overlap
  the neighbouring control. That constraint is an open question for the design
  owner (`docs/design-requests/2026-10-23-carousel-stepper-target-size.md`).
- The width, height and background transition animates the selection and is
  removed under reduced motion.

## Figma source mapping

Node `10169:11964` (`CarouselStepper`, 96x8) is one row of six
`.CarouselStepper element` instances on the root's 8px `gap`, centred on both
axes. It has no variant axis and no device axis: one composition, one case.

- The first `.CarouselStepper element` (16x4, `r=15`, fill `#0b3ee3`) is the
  selected position: it maps to `aria-current="true"`, `bg-primary` and the
  `16x4` box.
- The other five `.CarouselStepper element` instances (8x8, `r=20`, a 1px
  `#636b82` stroke on the nested `Ellipse`, no fill) are the remaining
  positions: they map to `border-input` and the `8x8` box.
- The 96x8 row and its 8px gap are the component's own layout; the capture
  forces the source width, never the component.
- `count` is the number of instances the row draws, `activeIndex` the selected
  one; the caller owns both. The source's round corner radii (15 and 20) are
  clamped by the browser on the 4px and 8px boxes, so the implementation uses
  the nearest radius step, `rounded-2xl` (16), which paints the same pill and
  circle.
