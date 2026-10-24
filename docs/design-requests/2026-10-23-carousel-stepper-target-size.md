# Should the CarouselStepper dots stay on a 16px pitch, or grow so each control can meet the pointer-target rule?

- Node: [CarouselStepper](https://www.figma.com/design/pvhsJpPGQbEwNLiyP7BOIw?node-id=10169-11964) (`10169:11964`)
- Page: • Pagination
- Type: design
- Issue: https://github.com/pagopa/ui/issues/44
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-carousel-stepper-target-size--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-carousel-stepper-target-size--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-carousel-stepper-target-size--option-c / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-carousel-stepper-target-size--option-d
- Status: open — the question does not block the render; the node is
  `implemented` against the drawn composition and the answer may change it later
- Decision owner: Figma design owner

## Context

`CarouselStepper` is the position indicator of a carousel: a row of dots where
one is selected. The source draws it as a 96x8 row — the active dot 16x4 in
`#0b3ee3` and five 8x8 outlined dots (`#636b82`) on an 8px gap, so consecutive
dot centres sit 16px apart.

The library now renders exactly that composition, and each dot keeps a 44px
pointer target through an invisible vertical `::after` expansion (the source row
stays 8px tall). The horizontal target is the dot itself: an 8px-wide dot with
an 8px gap.

## The open question

- **Target size versus the drawn pitch.** WCAG 2.5.8 (Target Size, AA) needs a
  24x24 target or, for an undersized one, enough spacing that a 24px circle
  centred on it does not touch the next target's circle. At a 16px pitch the
  circles overlap, so the rule cannot be met without changing the drawing.
  Is the 16px pitch intended, and should the dots stay as drawn?
- **If not, what should change?** A wider gap (24px or more), larger dots, or a
  taller row are the three levers; each changes the component's footprint in
  the carousel.

## Why it matters

Nothing is blocked: the render, the case and the guide follow the source, and
the vertical target is already 44px. The open point is the horizontal reach of
each control, which today is 8px. A consumer embedding the stepper in a
touch-first surface gets a small horizontal target, and a sweep for target size
reports it. Guessing the answer would either change the source composition
(wider pitch, larger dots) or add padding the mockup does not draw.

## Options

1. **Keep the drawing.** The stepper stays a compact 96x8 indicator; the
   constraint is accepted as a deliberate design choice and recorded in the
   guide. This is the current state.
2. **Keep the dots, widen the gap to 24px.** Each dot's centre sits 24-32px
   from its neighbour, which allows a 24px round target without overlap; the row
   grows to roughly 160px. The visual rhythm changes.
3. **Enlarge the dots** (for example 12x12 outlined, a 24x8 active pill) so the
   dot itself reaches the 24px minimum at a 16-24px pitch. The indicator becomes
   more prominent than the current design.
4. **Keep the drawing and let the caller own the target**, for example by
   rendering the stepper inside a taller band with invisible overlap. This does
   not solve the overlap between adjacent dots.

## What is already fixed

- The source composition: the active 16x4 pill and the 8x8 outlined circle, the
  8px gap, the 96x8 row, `#0b3ee3` and `#636b82`.
- The invisible vertical `::after` expansion, which already gives every dot a
  44px vertical target without inflating the row.
- The announced names, the roving tabindex and the arrow/Home/End behaviour.
